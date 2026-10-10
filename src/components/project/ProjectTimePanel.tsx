import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Pencil, Plus, Trash2, X } from 'lucide-react';

import Drawer from '@/components/Drawer';
import BarList from '@/components/charts/BarList';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmationContext';
import timeTrackingService, { type TimeEntry, type TimeFilters, type TimeSummary } from '@/services/timeTracking';
import type { ProjectMember } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface ProjectTimePanelProps {
  projectId: string;
  projectName: string;
  tasks: Array<{ id: string; title: string }>;
  members: ProjectMember[];
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, '')}h`;

/** Project → Time: log hours and see where the project's time went. */
function ProjectTimePanel({ projectId, projectName, tasks, members, onClose }: ProjectTimePanelProps): JSX.Element {
  const { user } = useAuth();
  const { access } = useWorkspace();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [filters, setFilters] = useState<TimeFilters>({});
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ taskId: tasks[0]?.id ?? '', hours: '', date: today(), note: '' });
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        timeTrackingService.summary(projectId, filters),
        timeTrackingService.list(projectId, filters)
      ]);
      setSummary(s);
      setEntries(list.entries);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (entry: TimeEntry) => {
    setEditing(entry);
    setForm({ taskId: entry.taskId, hours: String(entry.hours), date: entry.date, note: entry.note });
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ taskId: tasks[0]?.id ?? '', hours: '', date: today(), note: '' });
  };

  const submit = async () => {
    const hours = Number(form.hours);
    if (!form.taskId || !(hours > 0)) return;
    setSaving(true);
    try {
      const payload = { taskId: form.taskId, hours, date: form.date, note: form.note };
      if (editing) await timeTrackingService.update(editing.id, payload);
      else await timeTrackingService.create(projectId, payload);
      showToast({ variant: 'success', message: editing ? 'Time entry updated.' : `Logged ${formatHours(hours)}.` });
      resetForm();
      await load();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: TimeEntry) => {
    const ok = await confirm({ title: 'Delete this time entry?', message: `${formatHours(entry.hours)} on “${entry.taskTitle}”.`, confirmText: 'Delete', type: 'danger' });
    if (!ok) return;
    try {
      await timeTrackingService.remove(entry.id);
      await load();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  const canEdit = (entry: TimeEntry) => entry.userId === user?.id || Boolean(access?.isAdmin);
  const memberTaskMatrix = useMemo(() => {
    if (!summary) return { members: [], tasks: [], cell: () => 0 };
    const cell = (userId: string, taskId: string) =>
      summary.byMemberTask.find((r) => r.userId === userId && r.taskId === taskId)?.hours ?? 0;
    return { members: summary.byMember, tasks: summary.byTask, cell };
  }, [summary]);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Drawer description={projectName} onClose={onClose} title="Time tracking" width="sm:w-[680px]">
      {/* Log hours */}
      <section className="px-6 py-5 border-b border-olive-100 bg-olive-50/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="m-0 text-[14px] font-semibold text-olive-950">{editing ? 'Edit time entry' : 'Log hours'}</h3>
          {editing && (
            <button className="btn btn-sm btn-ghost" onClick={resetForm} type="button"><X size={13} /> Cancel edit</button>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="m-0 text-[13px] text-olive-500">Add a task to this project first — hours are logged against tasks.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_90px_140px]">
            <select aria-label="Task" className="input-base" onChange={(e) => setForm({ ...form, taskId: e.target.value })} value={form.taskId}>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <input
              aria-label="Hours"
              className="input-base tabular-nums"
              inputMode="decimal"
              max={24}
              min={0.25}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder="Hours"
              step={0.25}
              type="number"
              value={form.hours}
            />
            <input aria-label="Date" className="input-base" max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" value={form.date} />
            <input
              aria-label="Note"
              className="input-base sm:col-span-2"
              maxLength={1000}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="What did you work on? (optional)"
              value={form.note}
            />
            <button className="btn btn-primary" disabled={saving || !(Number(form.hours) > 0)} onClick={() => void submit()} type="button">
              {editing ? 'Save' : <><Plus size={14} /> Log</>}
            </button>
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="px-6 pt-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-olive-600">
          From
          <input className="input-base !h-8 !text-[13px]" onChange={(e) => setFilters({ ...filters, from: e.target.value })} type="date" value={filters.from ?? ''} />
        </label>
        <label className="grid gap-1 text-xs font-medium text-olive-600">
          To
          <input className="input-base !h-8 !text-[13px]" onChange={(e) => setFilters({ ...filters, to: e.target.value })} type="date" value={filters.to ?? ''} />
        </label>
        <label className="grid gap-1 text-xs font-medium text-olive-600">
          Member
          <select className="input-base !h-8 !text-[13px]" onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })} value={filters.userId ?? ''}>
            <option value="">Everyone</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>)}
          </select>
        </label>
        {hasFilters && <button className="btn btn-sm btn-ghost" onClick={() => setFilters({})} type="button">Clear</button>}
      </section>

      {loading && !summary ? (
        <div className="p-6 grid gap-3">{[0, 1, 2].map((i) => <div className="skeleton h-14" key={i} />)}</div>
      ) : !summary || summary.entryCount === 0 ? (
        <EmptyState
          icon={Clock}
          title={hasFilters ? 'No time in this range' : 'No time logged yet'}
          description={hasFilters ? 'Try a wider date range or another member.' : 'Log hours above to see totals per task and per teammate.'}
        />
      ) : (
        <>
          {/* Totals */}
          <section className="px-6 py-4 grid grid-cols-3 gap-3">
            {[
              ['Total', formatHours(summary.totalHours)],
              ['Entries', String(summary.entryCount)],
              ['People', String(summary.byMember.length)]
            ].map(([label, value]) => (
              <div className="rounded-lg border border-olive-200 px-3 py-2.5" key={label}>
                <div className="text-[20px] font-semibold text-olive-950 tabular-nums">{value}</div>
                <div className="text-xs text-olive-500">{label}</div>
              </div>
            ))}
          </section>

          <section className="px-6 pb-2 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="section-label m-0 mb-3">By task</h4>
              <BarList
                format={formatHours}
                rows={summary.byTask.map((t) => ({ key: t.taskId, label: t.title, value: t.hours, hint: `${t.entries} ${t.entries === 1 ? 'entry' : 'entries'}` }))}
                total={summary.totalHours}
              />
            </div>
            <div>
              <h4 className="section-label m-0 mb-3">By member</h4>
              <BarList format={formatHours} rows={summary.byMember.map((m) => ({ key: m.userId, label: m.name, value: m.hours }))} total={summary.totalHours} />
            </div>
          </section>

          {memberTaskMatrix.members.length > 1 || memberTaskMatrix.tasks.length > 1 ? (
            <section className="px-6 py-4">
              <h4 className="section-label m-0 mb-2">Who worked on what</h4>
              <div className="overflow-x-auto rounded-lg border border-olive-200">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-olive-50 text-xs text-olive-500">
                      <th className="h-9 px-3 text-left font-medium">Task</th>
                      {memberTaskMatrix.members.map((m) => <th className="h-9 px-3 text-right font-medium whitespace-nowrap" key={m.userId}>{m.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {memberTaskMatrix.tasks.map((t) => (
                      <tr className="border-t border-olive-100" key={t.taskId}>
                        <td className="px-3 py-2 text-olive-800 max-w-[200px] truncate">{t.title}</td>
                        {memberTaskMatrix.members.map((m) => {
                          const h = memberTaskMatrix.cell(m.userId, t.taskId);
                          return <td className={`px-3 py-2 text-right tabular-nums ${h ? 'text-olive-950' : 'text-olive-300'}`} key={m.userId}>{h ? formatHours(h) : '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Entries */}
          <section className="px-6 pt-2 pb-8">
            <h4 className="section-label m-0 mb-2">Entries</h4>
            <ul className="m-0 p-0 list-none rounded-lg border border-olive-200 divide-y divide-olive-100">
              {entries.map((entry) => (
                <li className="flex items-start gap-3 px-3 py-2.5" key={entry.id}>
                  <div className="w-14 shrink-0 text-[13px] font-semibold text-olive-950 tabular-nums">{formatHours(entry.hours)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-olive-900 truncate">{entry.taskTitle}</div>
                    <div className="text-xs text-olive-500">
                      {entry.name} · {new Date(`${entry.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </div>
                  </div>
                  {canEdit(entry) && (
                    <div className="flex gap-0.5 shrink-0">
                      <button aria-label="Edit entry" className="icon-btn !w-7 !h-7" onClick={() => startEdit(entry)} type="button"><Pencil size={13} /></button>
                      <button aria-label="Delete entry" className="icon-btn !w-7 !h-7 hover:text-red-600" onClick={() => void remove(entry)} type="button"><Trash2 size={13} /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Drawer>
  );
}

export default ProjectTimePanel;
