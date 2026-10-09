import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import { getProjectActivities, verifyProjectAuditChain, getRetentionPolicy, updateRetentionPolicy, type ActivityLog, type RetentionPolicy } from '@/services/activity';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';

interface ActivityHistoryPanelProps {
  projectId: string;
  projectName: string;
}

const ENTITY_LABELS: Record<string, string> = {
  project: 'Project',
  epic: 'Epic',
  task: 'Task',
  subtask: 'Subtask',
  note: 'Note'
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  assigned: UserPlus,
  status_changed: ArrowRightLeft,
  member_added: UserPlus,
  member_removed: UserMinus,
  approved: ShieldCheck,
  rejected: ShieldAlert,
  escalated: ShieldAlert,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-brand-700 bg-brand-50',
  updated: 'text-olive-600 bg-olive-100',
  deleted: 'text-red-600 bg-red-50',
  assigned: 'text-blue-600 bg-blue-50',
  status_changed: 'text-amber-700 bg-amber-50',
  member_added: 'text-brand-700 bg-brand-50',
  member_removed: 'text-red-600 bg-red-50',
  approved: 'text-brand-700 bg-brand-50',
  rejected: 'text-red-600 bg-red-50',
  escalated: 'text-red-600 bg-red-50'
};

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'project', label: 'Project' },
  { value: 'epic', label: 'Epics' },
  { value: 'task', label: 'Tasks' },
  { value: 'subtask', label: 'Subtasks' },
  { value: 'note', label: 'Notes' },
];

function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ActivityHistoryPanel({
  projectId,
}: ActivityHistoryPanelProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState(false);
  
  // Retention Modal State
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [retentionDaysInput, setRetentionDaysInput] = useState<string>('');
  const [legalHoldInput, setLegalHoldInput] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const result = await verifyProjectAuditChain(projectId);
      if (result.valid) {
        showToast({ message: `Audit chain verified successfully. Checked ${result.checked} records.`, variant: 'success' });
      } else {
        showToast({ message: `Audit chain verification failed at sequence ${result.failedSequence}. Data may be tampered.`, variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to verify audit chain', variant: 'error' });
    }
    setVerifying(false);
  };

  const openRetentionModal = async () => {
    setRetentionModalOpen(true);
    try {
      const policy = await getRetentionPolicy(projectId);
      setRetentionPolicy(policy);
      setRetentionDaysInput(policy.retentionDays !== null ? policy.retentionDays.toString() : '');
      setLegalHoldInput(policy.legalHold);
    } catch {
      showToast({ message: 'Failed to fetch retention policy', variant: 'error' });
    }
  };

  const saveRetentionPolicy = async () => {
    setSavingRetention(true);
    try {
      const days = retentionDaysInput.trim() === '' ? null : parseInt(retentionDaysInput, 10);
      const updated = await updateRetentionPolicy(projectId, { retentionDays: days, legalHold: legalHoldInput });
      setRetentionPolicy(updated);
      showToast({ message: 'Retention policy updated successfully', variant: 'success' });
      setRetentionModalOpen(false);
    } catch {
      showToast({ message: 'Failed to update retention policy', variant: 'error' });
    }
    setSavingRetention(false);
  };


  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProjectActivities(projectId, {
        page,
        limit: 30,
        entityType: entityFilter || undefined,
      });
      setActivities(result.activities);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to load activities', err);
    }
    setLoading(false);
  }, [projectId, page, entityFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Group activities by date
  const groupedActivities: { label: string; items: ActivityLog[] }[] = [];
  let currentLabel = '';
  for (const activity of activities) {
    const label = getDateLabel(activity.createdAt);
    if (label !== currentLabel) {
      groupedActivities.push({ label, items: [] });
      currentLabel = label;
    }
    groupedActivities[groupedActivities.length - 1].items.push(activity);
  }

  return (
    <div className="flex flex-col h-full max-h-[72vh]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-olive-100">
        <select
          aria-label="Filter by type"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="input-base !h-8 !w-auto !text-[13px] !pr-8"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <button onClick={handleVerifyChain} disabled={verifying} className="btn btn-sm btn-secondary" type="button" title="Check that no log entry has been altered">
            {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Verify integrity
          </button>
          <button onClick={openRetentionModal} className="btn btn-sm btn-secondary" type="button">
            <Scale className="w-3.5 h-3.5" />
            Retention
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton !rounded-full w-7 h-7" />
                <div className="flex-1 grid gap-1.5"><div className="skeleton h-3.5 w-2/3" /><div className="skeleton h-3 w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History className="w-6 h-6 mb-2 text-olive-300" />
            <p className="text-sm font-medium text-olive-900 m-0">No activity yet</p>
            <p className="text-[13px] text-olive-500 mt-1 mb-0">Changes to this project will show up here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                <h4 className="section-label m-0 mb-2">{group.label}</h4>
                <ol className="relative m-0 p-0 list-none">
                  <span className="absolute left-[13px] top-2 bottom-2 w-px bg-olive-200" aria-hidden="true" />
                  {group.items.map((activity) => {
                    const IconComponent = ACTION_ICONS[activity.action] || Pencil;
                    const colorClass = ACTION_COLORS[activity.action] || ACTION_COLORS.updated;

                    return (
                      <li key={activity.id} className="relative flex items-start gap-3 py-2">
                        <div className={`relative z-[1] flex-shrink-0 w-7 h-7 rounded-full ring-4 ring-white flex items-center justify-center ${colorClass}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="m-0 text-[13px] text-olive-600 leading-snug">
                            <span className="font-medium text-olive-950">{activity.userName}</span>{' '}
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-olive-400">
                            <span>{formatTime(activity.createdAt)}</span>
                            <span>·</span>
                            <span className="capitalize">{ENTITY_LABELS[activity.entityType]}</span>
                            <span className="ml-auto font-mono text-[11px]" title={`Hash ${activity.immutableHash || 'pending'}${activity.retentionUntil ? ` · retained until ${new Date(activity.retentionUntil).toLocaleDateString()}` : ''}`}>
                              #{activity.sequence}
                            </span>
                            {activity.legalHold && <span className="badge badge-red !h-4 !text-[10px]">Legal hold</span>}
                          </div>

                          {activity.changes.length > 0 && (
                            <div className="mt-2 rounded-lg border border-olive-200 divide-y divide-olive-100 text-xs">
                              {activity.changes.slice(0, 3).map((change, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 min-w-0">
                                  <span className="text-olive-500 capitalize shrink-0">{change.field}</span>
                                  {change.oldValue && <span className="line-through text-olive-400 truncate max-w-[140px]">{change.oldValue}</span>}
                                  {change.oldValue && change.newValue && <span className="text-olive-300">→</span>}
                                  {change.newValue && <span className="text-olive-900 truncate max-w-[160px]">{change.newValue}</span>}
                                </div>
                              ))}
                              {activity.changes.length > 3 && (
                                <div className="px-3 py-1.5 text-olive-400">+{activity.changes.length - 3} more changes</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 h-12 border-t border-olive-100">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-sm btn-ghost" type="button">
            <ChevronLeft className="w-3.5 h-3.5" />
            Newer
          </button>
          <span className="text-xs text-olive-500 tabular-nums">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn btn-sm btn-ghost" type="button">
            Older
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Retention Policy Modal */}
      {retentionModalOpen && (
        <Modal onClose={() => setRetentionModalOpen(false)} title="Retention policy" description="How long activity logs are kept for compliance.">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <label className="field-label !mb-0">Retention period (days)</label>
              <input
                type="number"
                min="0"
                value={retentionDaysInput}
                onChange={(e) => setRetentionDaysInput(e.target.value)}
                placeholder="Leave empty to keep forever"
                className="input-base"
              />
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-olive-50 border border-olive-200 rounded-lg">
              <input
                type="checkbox"
                id="legalHold"
                checked={legalHoldInput}
                onChange={(e) => setLegalHoldInput(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-brand-600"
              />
              <label htmlFor="legalHold" className="cursor-pointer">
                <span className="block text-[13px] font-medium text-olive-900">Legal hold</span>
                <span className="block text-xs text-olive-500">Prevents deletion of any log entry, regardless of the retention period.</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRetentionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveRetentionPolicy}
                disabled={savingRetention}
              >
                {savingRetention ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {savingRetention ? 'Saving…' : 'Save policy'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
