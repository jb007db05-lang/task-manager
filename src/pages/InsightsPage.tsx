import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Lock,
  OctagonX,
  RefreshCw,
  Sparkles,
  UserX
} from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ColumnChart, { CHART_COLORS } from '@/components/charts/ColumnChart';
import BarList from '@/components/charts/BarList';
import { useWorkspace } from '@/context/WorkspaceContext';
import insightsService, {
  ANALYSES,
  type AnalysisMetric,
  type InsightRange,
  type InsightsOverview,
  type MetricExplanation,
  type MetricForecast
} from '@/services/insights';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface InsightsPageProps {
  onOpenProject: (projectId: string) => void;
}

const RANGES: Array<{ value: InsightRange; label: string }> = [
  { value: 'last_7_days', label: '7 days' },
  { value: 'last_30_days', label: '30 days' },
  { value: 'last_90_days', label: '90 days' },
  { value: 'all_time', label: 'All time' }
];

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  BLOCKED: 'Blocked',
  DONE: 'Done'
};

const ATTENTION_ICON = { overdue: AlertTriangle, blocked: OctagonX, stale: Hourglass, unassigned: UserX } as const;

/** "2026-W40" → "Sep 28" (the Monday the ISO week starts). */
const weekLabel = (isoWeek: string): string => {
  const [year, week] = isoWeek.split('-W').map(Number);
  if (!year || !week) return isoWeek;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const hours = (h: number) => `${h.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;

function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Clock }): JSX.Element {
  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-center justify-between text-[13px] text-olive-500">
        {label}
        <Icon size={15} className="text-olive-400" />
      </div>
      <div className="mt-1 text-[26px] font-semibold tracking-tight text-olive-950 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-olive-500">{hint}</div>}
    </div>
  );
}

/** "Run analyses": explain a metric's drivers and project it forward. */
function AnalysisPanel({ timeRange, projectId }: { timeRange: InsightRange; projectId?: string }): JSX.Element {
  const [metric, setMetric] = useState<AnalysisMetric>('delivery_risk');
  const [result, setResult] = useState<{ explanation: MetricExplanation; forecast: MetricForecast } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = ANALYSES.find((a) => a.metric === metric)!;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const query = { metric, timeRange, projectId };
      const [explanation, forecast] = await Promise.all([insightsService.explain(query), insightsService.forecast(query)]);
      setResult({ explanation, forecast });
    } catch (err) {
      setError(toDisplayErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-olive-950">
            <Sparkles size={16} className="text-brand-600" /> Analyze
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-olive-500">Pick a question; we explain what drives it and where it is heading.</p>
        </div>
        <button className="btn btn-primary btn-sm" disabled={running} onClick={() => void run()} type="button">
          {running ? 'Analyzing…' : 'Run analysis'}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Analysis">
        {ANALYSES.map((a) => (
          <button
            aria-checked={metric === a.metric}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${metric === a.metric ? 'border-brand-300 bg-brand-50' : 'border-olive-200 hover:bg-olive-50'}`}
            key={a.metric}
            onClick={() => {
              setMetric(a.metric);
              setResult(null);
            }}
            role="radio"
            type="button"
          >
            <span className="block text-[13px] font-medium text-olive-900">{a.label}</span>
            <span className="block text-[11px] text-olive-500">{a.question}</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 mb-0 text-[13px] text-red-700">{error}</p>}
      {result && (
        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
          <div>
            <div className="text-[13px] text-olive-500">{current.label} now</div>
            <div className="text-[28px] font-semibold text-olive-950 tabular-nums">{Math.round(result.explanation.value)}<span className="text-base text-olive-400">/100</span></div>
            <p className="mt-1 mb-3 text-[13px] text-olive-700 text-pretty">{result.explanation.narrative}</p>
            <div className="section-label mb-2">What drives it</div>
            <BarList
              format={(v) => String(Math.round(v))}
              rows={result.explanation.factors.slice(0, 5).map((f) => ({ key: f.key, label: f.label, value: f.value, hint: f.explanation }))}
              total={100}
            />
          </div>
          <div>
            <div className="section-label mb-2">Where it's heading</div>
            <table className="w-full text-[13px] border-collapse rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-olive-50 text-xs text-olive-500">
                  <th className="h-8 px-3 text-left font-medium">In</th>
                  <th className="h-8 px-3 text-right font-medium">Projected</th>
                  <th className="h-8 px-3 text-left font-medium">Trend</th>
                  <th className="h-8 px-3 text-right font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.forecast.horizons.map((h) => (
                  <tr className="border-t border-olive-100" key={h.days}>
                    <td className="px-3 py-2 text-olive-700">{h.days} days</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-olive-950">{Math.round(h.projectedValue)}</td>
                    <td className="px-3 py-2 text-olive-700 capitalize">{h.trajectory}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-olive-500">{Math.round(h.confidence)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Insights: how work is going across the projects the member can open in
 * the active workspace — tasks, time logged and prompt usage — with the few
 * things that need attention first.
 */
function InsightsPage({ onOpenProject }: InsightsPageProps): JSX.Element {
  const { activeWorkspace, can } = useWorkspace();
  const [range, setRange] = useState<InsightRange>('last_30_days');
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<InsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filter options come from the unfiltered report: every project the member can open.
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await insightsService.overview(range, projectId || undefined);
      setData(overview);
      if (!projectId) setProjectOptions(overview.projects.map((p) => ({ id: p.projectId, name: p.name })));
    } catch (err) {
      setError(toDisplayErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rangeLabel = RANGES.find((r) => r.value === range)?.label.toLowerCase() ?? '';

  return (
    <div className="px-8 pt-8 pb-16 grid gap-6">
      <PageHeader
        actions={
          <>
            <select aria-label="Project" className="input-base !h-9 !w-auto !text-[13px]" onChange={(e) => setProjectId(e.target.value)} value={projectId}>
              <option value="">All projects</option>
              {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="radiogroup" aria-label="Time range">
              {RANGES.map((r) => (
                <button
                  aria-checked={range === r.value}
                  className={`h-8 px-3 rounded-md text-[13px] transition-colors ${range === r.value ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  role="radio"
                  type="button"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button aria-label="Refresh" className="btn btn-sm btn-secondary btn-icon !h-9 !w-9" onClick={() => void load()} type="button">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </>
        }
        description={`How work is going across the projects you can open in ${activeWorkspace?.name ?? 'this workspace'}.`}
        title="Insights"
      />

      {error ? (
        <p className="m-0 card p-4 text-[13px] text-red-700">{error}</p>
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div className="skeleton h-24" key={i} />)}</div>
      ) : data.scope.projectCount === 0 ? (
        <EmptyState icon={BarChart3} title="No projects to report on yet" description="Create a project or ask an admin to give you access to one." />
      ) : (
        <>
          {/* Headline numbers */}
          <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatTile hint={`${data.tasks.overdue} overdue · ${data.tasks.blocked} blocked`} icon={Clock} label="Open tasks" value={data.tasks.open.toLocaleString()} />
            <StatTile hint={`in the last ${rangeLabel}`} icon={CheckCircle2} label="Completed" value={data.tasks.completed.toLocaleString()} />
            <StatTile
              hint={data.tasks.completionRate === null ? 'no tasks created in this period' : `of ${data.tasks.created} tasks created in this period`}
              icon={BarChart3}
              label="Completion rate"
              value={data.tasks.completionRate === null ? '—' : `${data.tasks.completionRate}%`}
            />
            <StatTile hint={`by ${data.hours.byMember.length} ${data.hours.byMember.length === 1 ? 'person' : 'people'}`} icon={Hourglass} label="Hours logged" value={hours(data.hours.total)} />
          </section>

          {/* Needs attention */}
          <section className="card p-5">
            <h2 className="m-0 text-[15px] font-semibold text-olive-950">Needs attention</h2>
            {data.attention.length === 0 ? (
              <p className="mt-2 mb-0 flex items-center gap-2 text-[13px] text-olive-600">
                <CheckCircle2 size={15} className="text-brand-600" /> Nothing is overdue, blocked or stale. Nice.
              </p>
            ) : (
              <ul className="mt-3 mb-0 p-0 list-none divide-y divide-olive-100">
                {data.attention.map((item) => {
                  const Icon = ATTENTION_ICON[item.kind];
                  return (
                    <li className="flex items-center gap-3 py-2.5" key={`${item.kind}-${item.projectId}`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.kind === 'overdue' || item.kind === 'blocked' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 text-[13px] text-olive-800">{item.message}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => onOpenProject(item.projectId)} type="button">
                        Open project <ArrowRight size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Trends */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              {data.tasks.weekly.length === 0 ? (
                <p className="m-0 text-[13px] text-olive-500">No tasks were created or completed in this period.</p>
              ) : (
                <ColumnChart
                  data={data.tasks.weekly.map((w) => ({ label: weekLabel(w.week), values: { created: w.created, completed: w.completed } }))}
                  series={[
                    { key: 'created', label: 'Created', color: CHART_COLORS.blue },
                    { key: 'completed', label: 'Completed', color: CHART_COLORS.forest }
                  ]}
                  title="Tasks created vs completed, per week"
                />
              )}
            </div>
            <div className="card p-5">
              {data.hours.weekly.length === 0 ? (
                <p className="m-0 text-[13px] text-olive-500">No time logged in this period. Use “Time” on a project to log hours.</p>
              ) : (
                <ColumnChart
                  data={data.hours.weekly.map((w) => ({ label: weekLabel(w.week), values: { hours: w.hours } }))}
                  format={hours}
                  series={[{ key: 'hours', label: 'Hours', color: CHART_COLORS.forest }]}
                  title="Hours logged per week"
                />
              )}
            </div>
          </section>

          {/* Breakdown */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5">
              <h2 className="m-0 mb-3 text-[14px] font-semibold text-olive-950">Tasks by status</h2>
              <BarList rows={data.tasks.byStatus.map((s) => ({ key: s.status, label: STATUS_LABEL[s.status] ?? s.status, value: s.count }))} />
            </div>
            <div className="card p-5">
              <h2 className="m-0 mb-3 text-[14px] font-semibold text-olive-950">Hours by person</h2>
              <BarList empty="No time logged in this period." format={hours} rows={data.hours.byMember.map((m) => ({ key: m.userId, label: m.name, value: m.hours }))} />
            </div>
            <div className="card p-5">
              <h2 className="m-0 mb-1 text-[14px] font-semibold text-olive-950">Prompt usage</h2>
              <p className="m-0 mb-3 text-xs text-olive-500">
                {data.prompts.used} of {data.prompts.total} prompts used
                {data.prompts.createdInRange !== null ? ` · ${data.prompts.createdInRange} new in the last ${rangeLabel}` : ''}
              </p>
              {data.prompts.top.length === 0 ? (
                <p className="m-0 flex items-center gap-2 text-[13px] text-olive-500"><FileText size={14} /> No prompt has been run yet.</p>
              ) : (
                <BarList rows={data.prompts.top.map((p) => ({ key: p.id, label: p.name, value: p.uses, hint: p.lastUsedAt ? `last used ${new Date(p.lastUsedAt).toLocaleDateString()}` : undefined }))} />
              )}
            </div>
          </section>

          {/* Projects */}
          <section className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-olive-200">
              <h2 className="m-0 text-[14px] font-semibold text-olive-950">Projects</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-olive-50/80 text-xs text-olive-500">
                    <th className="h-9 px-5 text-left font-medium">Project</th>
                    <th className="h-9 px-3 text-right font-medium">Open</th>
                    <th className="h-9 px-3 text-right font-medium">Overdue</th>
                    <th className="h-9 px-3 text-right font-medium">Blocked</th>
                    <th className="h-9 px-3 text-right font-medium">Completed</th>
                    <th className="h-9 px-5 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr className="border-t border-olive-100 hover:bg-olive-50/60 cursor-pointer" key={p.projectId} onClick={() => onOpenProject(p.projectId)}>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium text-olive-900">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color ?? 'var(--n-300)' }} />
                          {p.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.open}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.overdue ? 'text-red-700 font-medium' : 'text-olive-400'}`}>{p.overdue}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.blocked ? 'text-amber-700 font-medium' : 'text-olive-400'}`}>{p.blocked}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.completed}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{hours(p.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {can('intelligence.analyze') ? (
            <AnalysisPanel projectId={projectId || undefined} timeRange={range} />
          ) : (
            <p className="m-0 flex items-center gap-2 text-xs text-olive-500">
              <Lock size={12} /> Ask an admin for the “Run analyses” permission to explain and forecast these numbers.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default InsightsPage;
