import PageHeader from '@/components/PageHeader';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow
} from 'lucide-react';
import noDataImg from '@/assets/no_data.png';
import api from '@/services/api';

import {
  compareMetrics,
  drilldownMetric,
  explainMetric,
  getOperationalAnomalies,
  getOperationalTrends,
  getMetricGovernance,
  getMetricLineage,
  getReasoningSummary,
  listMetrics,
  recordDashboardOpened,
  replayTimeline,
  type AdvancedMetricName,
  type MetricExplanation,
  type MetricDefinition,
  type MetricDrilldownResult,
  type MetricName,
  type OperationalAnomaly,
  type OperationalReasoningSummary,
  type OperationalTrend,
  type TimelineReplayEvent,
  type MetricResult,
  type MetricTimeRange,
  type CausalReplayChain,
  type SemanticGovernanceResult,
  type SemanticLineageResult,
  forecastOperationalState,
  simulateOperationalIntervention,
  type OperationalForecast,
  type OperationalSimulation
} from '@/services/semanticAnalytics';
import type { Project } from '@/types/project';

interface SemanticIntelligencePageProps {
  projects: Project[];
  selectedProjectId: string;
  allProjectsValue: string;
}

const dashboardMetrics: MetricName[] = [
  'project_health_score',
  'task_completion_rate',
  'tasks_created',
  'tasks_completed',
  'overdue_tasks',
  'stale_tasks',
  'active_users',
  'avg_completion_time',
  'tasks_completed_per_user',
  'inactive_projects'
];

const compareMetricsBatchSize = 6;

const timeRangeOptions: Array<{ value: MetricTimeRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: '7 days' },
  { value: 'last_30_days', label: '30 days' },
  { value: 'last_90_days', label: '90 days' },
  { value: 'all_time', label: 'All time' }
];

// ─────────────────────────────────────────────────────────────
// VISUAL UTILITIES
// ─────────────────────────────────────────────────────────────

const ScoreRing = ({ score, size = 60, stroke = 5, color = 'var(--color-olive-700)' }: { score: number, size?: number, stroke?: number, color?: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" height={size} width={size}>
        <circle
          className="text-olive-100 "
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-olive-800 ">
        {Math.round(score)}
      </span>
    </div>
  );
};

const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;
  const width = 80;
  const height = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="overflow-visible" height={height} width={width}>
      <polyline
        className="text-olive-700/30 "
        fill="none"
        points={points}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        className="text-olive-700 "
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        fill="currentColor"
        r="2"
      />
    </svg>
  );
};

const FactorBar = ({ label, share, color = 'var(--color-olive-700)' }: { label: string, share: number, color?: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px] font-semibold">
      <span className="text-olive-500 ">{label}</span>
      <span className="text-olive-700 ">{share}%</span>
    </div>
    <div className="h-2 rounded-full bg-olive-100  overflow-hidden">
      <div
        className="h-full transition-all duration-1000 ease-out"
        style={{ width: `${share}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CORE COMPONENT
// ─────────────────────────────────────────────────────────────

const getValueRecord = (result: MetricResult | undefined): Record<string, unknown> => {
  if (!result || typeof result.value !== 'object' || result.value === null) {
    return {};
  }

  return result.value as Record<string, unknown>;
};

const getMetricNumber = (result: MetricResult | undefined, keys: string[]): number => {
  const record = getValueRecord(result);
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') {
      return value;
    }
  }

  return 0;
};

const formatMetricValue = (result: MetricResult | undefined): string => {
  if (!result) return '--';
  const value = getValueRecord(result);

  if (typeof value.score === 'number') return `${value.score}/100`;
  if (typeof value.percent === 'number') return `${value.percent}%`;
  if (typeof value.averageHours === 'number') return `${value.averageHours}h`;
  if (typeof value.count === 'number') return String(value.count);
  if (Array.isArray(value.rows)) return String(value.rows.length);

  return '--';
};

const scopedFilters = (
  projectId: string | undefined,
  definition: MetricDefinition | undefined
): { projectId?: string } => {
  if (!projectId || !definition?.allowedFilters.includes('projectId')) {
    return {};
  }

  return { projectId };
};

export default function SemanticIntelligencePage({
  projects,
  selectedProjectId,
  allProjectsValue
}: SemanticIntelligencePageProps): JSX.Element {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [results, setResults] = useState<MetricResult[]>([]);
  const [timeRange, setTimeRange] = useState<MetricTimeRange>('last_30_days');
  const [activeProjectId, setActiveProjectId] = useState(selectedProjectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<MetricDrilldownResult | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState<MetricName | null>(null);
  const [reasoning, setReasoning] = useState<OperationalReasoningSummary | null>(null);
  const [anomalies, setAnomalies] = useState<OperationalAnomaly[]>([]);
  const [trends, setTrends] = useState<OperationalTrend[]>([]);
  const [timeline, setTimeline] = useState<TimelineReplayEvent[]>([]);
  const [causalChains, setCausalChains] = useState<CausalReplayChain[]>([]);
  const [replayNarrative, setReplayNarrative] = useState('');
  const [replayConfidence, setReplayConfidence] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<MetricExplanation | null>(null);
  const [lineage, setLineage] = useState<SemanticLineageResult | null>(null);
  const [governance, setGovernance] = useState<SemanticGovernanceResult | null>(null);
  const [forecast, setForecast] = useState<OperationalForecast | null>(null);
  const [simulation, setSimulation] = useState<OperationalSimulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [, setProjectReport] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setActiveProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const projectFilter = activeProjectId === allProjectsValue ? undefined : activeProjectId;

  const loadIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const definitions = await listMetrics();
      const definitionByName = new Map(definitions.map((definition) => [definition.name, definition]));
      const metricQueries = dashboardMetrics.map((metric) => ({
        metric,
        timeRange,
        filters: scopedFilters(projectFilter, definitionByName.get(metric))
      }));
      const metricQueryBatches = Array.from(
        { length: Math.ceil(metricQueries.length / compareMetricsBatchSize) },
        (_, index) =>
          metricQueries.slice(
            index * compareMetricsBatchSize,
            (index + 1) * compareMetricsBatchSize
          )
      );
      const metricResultBatches = await Promise.all(
        metricQueryBatches.map((batch) => compareMetrics(batch))
      );
      const intelligenceQuery = {
        timeRange,
        filters: projectFilter ? { projectId: projectFilter } : {}
      };
      const [
        summary,
        anomalyResult,
        trendResult,
        replayResult,
        deliveryRiskExplanation,
        lineageResult,
        governanceResult,
        forecastResult
      ] =
        await Promise.all([
          getReasoningSummary(intelligenceQuery),
          getOperationalAnomalies(intelligenceQuery),
          getOperationalTrends(intelligenceQuery),
          replayTimeline(intelligenceQuery),
          explainMetric({
            ...intelligenceQuery,
            metric: 'delivery_risk' as AdvancedMetricName
          }),
          getMetricLineage('delivery_risk'),
          getMetricGovernance('delivery_risk'),
          forecastOperationalState({
            ...intelligenceQuery,
            metric: 'delivery_risk' as AdvancedMetricName
          })
        ]);
      setMetrics(definitions);
      setResults(metricResultBatches.flat());
      setDrilldown(null);
      setReasoning(summary);
      setAnomalies(anomalyResult.anomalies);
      setTrends(trendResult.trends);
      setTimeline(replayResult.events.slice(-12).reverse());
      setCausalChains(replayResult.causalChains ?? []);
      setReplayNarrative(replayResult.narrative ?? '');
      setReplayConfidence(replayResult.confidence ?? null);
      setExplanation(deliveryRiskExplanation);
      setLineage(lineageResult);
      setGovernance(governanceResult);
      setForecast(forecastResult);

      if (projectFilter) {
        try {
          const reportRes = await api.get<{ report: Record<string, unknown> }>(`/analytics/projects/${projectFilter}/report`);
          setProjectReport(reportRes.data.report);
        } catch {
          setProjectReport(null);
        }
      } else {
        setProjectReport(null);
      }

      void recordDashboardOpened(projectFilter ?? null).catch(() => undefined);
    } catch {
      setError('Unable to load semantic intelligence metrics.');
      setResults([]);
      setReasoning(null);
      setAnomalies([]);
      setTrends([]);
      setTimeline([]);
      setCausalChains([]);
      setReplayNarrative('');
      setReplayConfidence(null);
      setExplanation(null);
      setLineage(null);
      setGovernance(null);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, timeRange]);

  useEffect(() => {
    void loadIntelligence();
  }, [loadIntelligence]);

  const resultByMetric = useMemo(
    () => new Map(results.map((result) => [result.metric, result])),
    [results]
  );
  const metricByName = useMemo(
    () => new Map(metrics.map((metric) => [metric.name, metric])),
    [metrics]
  );

  const openDrilldown = useCallback(
    async (metric: MetricName) => {
      const definition = metricByName.get(metric);
      if (!definition?.drilldownSupport) return;

      setDrilldownLoading(metric);
      setError(null);
      try {
        const nextDrilldown = await drilldownMetric({
          metric,
          timeRange,
          filters: scopedFilters(projectFilter, definition),
          drilldown: definition.allowedDrilldowns[0],
          pagination: { limit: 10, offset: 0 },
          sort: { field: 'updatedAt', direction: 'desc' }
        });
        setDrilldown(nextDrilldown);
      } catch {
        setError('Unable to load semantic drilldown.');
      } finally {
        setDrilldownLoading(null);
      }
    },
    [metricByName, projectFilter, timeRange]
  );

  const runSimulation = useCallback(async (type: OperationalSimulation['intervention']['type']) => {
    setSimulating(true);
    try {
      const result = await simulateOperationalIntervention({
        metric: 'delivery_risk',
        timeRange,
        filters: projectFilter ? { projectId: projectFilter } : {},
        intervention: { type, intensity: 0.5 }
      });
      setSimulation(result);
    } catch {
      setError('Simulation failed');
    } finally {
      setSimulating(false);
    }
  }, [projectFilter, timeRange]);

  const completion = resultByMetric.get('task_completion_rate');
  const health = resultByMetric.get('project_health_score');
  const perUserRows = (getValueRecord(resultByMetric.get('tasks_completed_per_user')).rows ?? []) as Array<{
    userId: string;
    name?: string | null;
    email?: string;
    count: number;
  }>;
  const healthStatus = String(getValueRecord(health).status ?? 'unknown');
  const maxCompleted = Math.max(...perUserRows.map((row) => row.count), 1);

  if (loading && metrics.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-olive-700" size={40} />
          <p className="mt-4 text-sm font-semibold text-olive-500">Hydrating Semantic Layer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="px-8 pt-8">
        <PageHeader
          title="Intelligence"
          description="Health, risk and momentum across your projects — with the reasoning behind each signal."
          actions={
            <>
              <div className="relative">
                <Workflow className="absolute left-2.5 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" size={14} />
                <select
                  aria-label="Project"
                  className="input-base !h-9 !w-auto !pl-8 !pr-8 !text-[13px]"
                  onChange={(event) => setActiveProjectId(event.target.value)}
                  value={activeProjectId}
                >
                  <option value={allProjectsValue}>All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="tablist" aria-label="Time range">
                {timeRangeOptions.map((option) => (
                  <button
                    aria-selected={timeRange === option.value}
                    role="tab"
                    className={`h-8 px-3 rounded-md text-[13px] transition-colors ${
                      timeRange === option.value ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'
                    }`}
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button className="btn btn-secondary !h-9" disabled={loading} onClick={() => void loadIntelligence()} type="button">
                {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Refresh
              </button>
            </>
          }
        />
      </div>

      <div className="p-8 space-y-8 animate-fadeIn">
        {error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800   ">
            <AlertTriangle size={18} />
            {error}
          </div>
        ) : null}

        {/* Top Metric Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { metric: 'project_health_score' as MetricName, icon: Gauge, hint: healthStatus.replace(/_/g, ' '), color: 'var(--color-olive-700)' },
            { metric: 'task_completion_rate' as MetricName, icon: CheckCircle2, hint: `${getMetricNumber(completion, ['completed'])} completed`, color: 'var(--color-emerald-600)' },
            { metric: 'overdue_tasks' as MetricName, icon: AlertTriangle, hint: 'open past due date', color: 'var(--color-red-600)' },
            { metric: 'stale_tasks' as MetricName, icon: Clock3, hint: 'not updated in 7 days', color: 'var(--color-amber-600)' }
          ].map(({ metric, icon: Icon, hint, color }) => {
            const result = resultByMetric.get(metric);
            const definition = metricByName.get(metric);
            const scoreValue = typeof getValueRecord(result).score === 'number' ? (getValueRecord(result).score as number) : null;

            return (
              <section
                className="group relative rounded-2xl border border-olive-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl  "
                key={metric}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-olive-400">
                      {result?.label ?? metric.replace(/_/g, ' ')}
                    </p>
                    <h4 className="text-3xl font-semibold text-olive-800  tabular-nums">
                      {formatMetricValue(result)}
                    </h4>
                  </div>
                  {scoreValue !== null ? (
                    <ScoreRing color={color} score={scoreValue} />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-olive-50 text-olive-700  ">
                      <Icon size={24} />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-olive-500  capitalize">{hint}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-olive-100 px-1.5 py-0.5 text-[11px] font-medium text-olive-500">
                        <ShieldCheck size={10} />
                        {result?.semantic?.stability ?? definition?.stability ?? 'STABLE'}
                      </span>
                      {definition?.AIVisibility === 'safe' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          AI-SAFE
                        </span>
                      )}
                    </div>
                  </div>
                  <Sparkline data={[40, 35, 55, 45, 60, 50, scoreValue ?? 70]} />
                </div>

                {definition?.drilldownSupport && (
                  <button
                    className="mt-6 w-full flex h-9 items-center justify-center gap-2 rounded-lg border border-olive-100 bg-olive-50 text-[11px] font-medium text-olive-800 hover:bg-olive-50"
                    disabled={drilldownLoading === metric}
                    onClick={() => void openDrilldown(metric)}
                    type="button"
                  >
                    {drilldownLoading === metric ? <Loader2 className="animate-spin" size={14} /> : <GitBranch size={14} />}
                    Explore Lineage
                  </button>
                )}
              </section>
            );
          })}
        </div>

        {/* Reasoning Panel */}
        {reasoning && (
          <section className="overflow-hidden rounded-3xl border border-olive-200 bg-white shadow-lg  ">
            <div className="flex flex-col xl:flex-row">
              <div className="flex-1 p-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-100 text-olive-700  ">
                      <Sparkles size={20} />
                    </div>
                    <h4 className="text-xl font-semibold text-olive-800 ">
                      Operational Reasoning
                    </h4>
                  </div>
                  <div className={[
                    'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ring-1 ring-inset',
                    reasoning.status === 'at_risk'
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : reasoning.status === 'watch'
                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  ].join(' ')}>
                    <Activity size={12} className="animate-pulse" />
                    {reasoning.status.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-lg font-medium leading-relaxed text-olive-700 ">
                    {reasoning.narrative}
                  </p>
                  {reasoning.causalNarrative && (
                    <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-olive-200 ">
                      <p className="text-sm italic text-olive-500 ">
                        {reasoning.causalNarrative}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl bg-olive-50/50 p-6  border border-olive-100 ">
                    <p className="text-[11px] font-medium text-olive-400 mb-4">Semantic Context</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(reasoning.semanticInterpretation ?? {}).map(([key, value]) => (
                        <span className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-olive-700 shadow-sm border border-olive-100   " key={key}>
                          <span className="text-olive-400 mr-1">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                          {value.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-olive-50/50 p-6  border border-olive-100 ">
                    <p className="text-[11px] font-medium text-olive-400 mb-4">Governance Recommendations</p>
                    <div className="space-y-3">
                      {(reasoning.recommendations ?? []).slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 group">
                          <CheckCircle2 className="mt-0.5 text-olive-600 flex-shrink-0" size={14} />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-olive-800  leading-tight">{rec}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-olive-200  bg-olive-50/30  p-8">
                <p className="text-[11px] font-medium text-olive-400 mb-8">Intelligence Vectors</p>
                <div className="space-y-8">
                  {[
                    { label: 'Delivery Risk', value: reasoning.scores.deliveryRisk, color: '#ef4444' },
                    { label: 'Execution Confidence', value: reasoning.scores.executionConfidence, color: '#10b981' },
                    { label: 'Workflow Friction', value: reasoning.scores.workflowFriction, color: '#f59e0b' },
                    { label: 'Project Momentum', value: reasoning.scores.projectMomentum, color: '#3b82f6' }
                  ].map((item) => (
                    <div key={item.label} className="group flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-olive-600  group-hover:text-olive-800  transition-colors">
                          {item.label}
                        </p>
                        <div className="h-1.5 w-40 rounded-full bg-olive-100  overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${item.value}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                      <span className="text-2xl font-semibold text-olive-800 tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
        }

        {/* Intelligence Grid */}
        <div className="grid gap-8 xl:grid-cols-2">
          {/* Anomalies Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm  ">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600  ">
                  <AlertTriangle size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800 ">Operational Anomalies</h4>
              </div>
              <span className="text-[11px] font-medium text-olive-400">Threshold: 2.5σ</span>
            </div>

            <div className="space-y-4">
              {anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-olive-50 rounded-2xl  border border-dashed border-olive-200 ">
                  <ShieldCheck size={32} className="text-emerald-500 mb-3" />
                  <p className="text-sm font-semibold text-olive-400">Operational state within expected semantic bounds.</p>
                </div>
              ) : (
                anomalies.slice(0, 4).map((anomaly) => (
                  <div className="relative overflow-hidden group rounded-2xl border border-olive-100 bg-olive-50/50 p-6 transition-all hover:bg-white hover:shadow-md   " key={anomaly.metric}>
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-olive-800">
                            {anomaly.metric.replace(/_/g, ' ')}
                          </p>
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-olive-200  text-olive-500">
                            {anomaly.category}
                          </span>
                        </div>
                        <p className="text-sm text-olive-600  leading-snug">{anomaly.explanation}</p>
                        {anomaly.mitigationHints?.[0] && (
                          <div className="flex items-center gap-2 text-xs font-medium text-olive-700 ">
                            <Bot size={14} />
                            {anomaly.mitigationHints[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-red-600  tracking-tighter">
                          {anomaly.score}
                        </div>
                        <p className="text-[11px] font-medium text-olive-400">Severity</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(anomaly.affectedWorkflows ?? []).map((w) => (
                        <span key={w} className="text-[11px] font-medium px-2 py-1 rounded-md bg-white border border-olive-100 text-olive-500">
                          {w.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Trends Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm  ">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-700  ">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800 ">Trend Intelligence</h4>
              </div>
              <History size={16} className="text-olive-400" />
            </div>

            <div className="space-y-4">
              {trends.slice(0, 5).map((trend) => (
                <div className="group flex items-center justify-between p-4 rounded-2xl border border-olive-100 hover:border-olive-200 transition-colors  " key={trend.metric}>
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-olive-800">
                      {trend.metric.replace(/_/g, ' ')}
                    </h5>
                    <p className="text-xs font-medium text-olive-500 ">{trend.interpretation}</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-olive-400">
                        <Activity size={10} />
                        Accel: {trend.acceleration ?? 0}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <ShieldCheck size={10} />
                        Confidence {trend.confidence}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <span className={[
                      'inline-block px-3 py-1 rounded-full text-[11px] font-medium',
                      trend.direction === 'up' ? 'bg-emerald-50 text-emerald-700' :
                        trend.direction === 'down' ? 'bg-red-50 text-red-700' :
                          'bg-olive-100 text-olive-600',
                    ].join(' ')}>
                      {trend.direction}
                    </span>
                    <Sparkline data={[20, 30, 25, 45, 40, 55, 50]} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Predictive & Simulation Layer */}
        <div className="grid gap-8 xl:grid-cols-[1fr_400px] items-start">
          {/* Forecast Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-700">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800 tracking-tight">Predictive Forecasting</h4>
              </div>
              <div className="text-[11px] font-bold text-olive-400 border-b border-olive-100 pb-1">
                Protocol: Semantic Projection
              </div>
            </div>

            {forecast ? (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-1 divide-x divide-olive-100 border border-olive-100 rounded-2xl overflow-hidden bg-olive-50/30">
                  {forecast.horizons.map((h: OperationalForecast['horizons'][number]) => (
                    <div key={h.days} className="p-6 text-center bg-white transition-colors hover:bg-olive-50/50">
                      <p className="text-[11px] font-bold text-olive-400 mb-4">{h.days}D Projection</p>
                      <div className="text-4xl font-light text-olive-900 tabular-nums tracking-tighter mb-1">{h.projectedValue}</div>
                      <span className={['text-[11px] font-bold px-2 py-0.5 rounded-md', h.trajectory === 'degrading' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'].join(' ')}>
                        {h.trajectory}
                      </span>
                      <div className="mt-6 flex items-center justify-between gap-2 px-2">
                        <div className="flex-1 h-0.5 bg-olive-100 rounded-full overflow-hidden">
                          <div className="h-full bg-olive-500" style={{ width: `${h.confidence}%` }} />
                        </div>
                        <span className="text-[11px] font-mono text-olive-400">{h.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 rounded-2xl bg-olive-50/30 border border-olive-100">
                  <div className="flex items-center gap-2 mb-8 opacity-60">
                    <Bot size={14} className="text-olive-700" />
                    <p className="text-[11px] font-bold text-olive-500">Causal Momentum Matrix</p>
                  </div>
                  <div className="grid lg:grid-cols-[1fr_200px] gap-12">
                    <div className="space-y-6">
                      <p className="text-[11px] font-bold text-olive-400">Active Risk Drivers</p>
                      <div className="grid gap-5">
                        {forecast.riskDrivers.map((d: OperationalForecast['riskDrivers'][number]) => (
                          <FactorBar key={d.key} label={d.label} share={d.value} color="var(--color-olive-600)" />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center items-center text-center p-6 bg-white rounded-xl border border-olive-100">
                      <div className="text-3xl font-bold text-olive-900 tabular-nums mb-1">{forecast.momentum}</div>
                      <p className="text-[11px] font-bold text-olive-400">State Vector</p>
                      <p className="text-[11px] text-olive-500 mt-4 leading-relaxed font-medium">
                        Current trajectory has <span className="text-olive-900 font-bold">{forecast.propagationRisk}%</span> propagation probability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-olive-300 font-mono text-[11px]">Initialising Forecast Engine...</div>
            )}
          </section>

          {/* Simulation Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-700">
                  <RefreshCw size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800 tracking-tight">Intervention Lab</h4>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-olive-500 leading-relaxed font-medium">Model the delta of discrete operational interventions on global delivery risk.</p>

              <div className="grid gap-2">
                {[
                  { id: 'reduce_blockers', label: 'Unblock Work' },
                  { id: 'resolve_overdue', label: 'Triage Overdue' },
                  { id: 'increase_throughput', label: 'Boost Velocity' },
                  { id: 'stabilize_ownership', label: 'Fix Ownership' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => runSimulation(opt.id as OperationalSimulation['intervention']['type'])}
                    disabled={simulating}
                    className="group flex items-center justify-between h-10 px-4 rounded-lg border border-olive-100 bg-olive-50/30 hover:bg-white hover:border-olive-400 text-[11px] font-bold text-olive-600 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>

              {simulation && (
                <div className="mt-8 p-6 rounded-xl bg-olive-900 text-white border border-olive-800">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[11px] font-bold text-olive-400 mb-1">Simulated Output</p>
                      <h5 className="text-base font-bold tracking-tight capitalize">{simulation.intervention.type.replace(/_/g, ' ')}</h5>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white tabular-nums tracking-tighter">{simulation.simulatedValue}</div>
                      <p className="text-[11px] font-bold text-olive-500">Projected Score</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                    <div>
                      <div className="text-lg font-bold text-emerald-400 tabular-nums">-{simulation.impact}</div>
                      <p className="text-[11px] font-bold text-olive-500">Risk Delta</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-olive-300 tabular-nums">{simulation.confidence}%</div>
                      <p className="text-[11px] font-bold text-olive-500">Certainty</p>
                    </div>
                  </div>
                </div>
              )}

              {!simulation && !simulating && (
                <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-olive-100 rounded-xl opacity-40">
                  <RefreshCw size={24} className="text-olive-300 mb-4" />
                  <p className="text-[11px] font-bold text-olive-400">Ready for simulation input</p>
                </div>
              )}

              {simulating && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 size={24} className="animate-spin text-olive-600 mb-4" />
                  <p className="text-[11px] font-bold text-olive-600">Computing causal delta...</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Explainability and Replay */}
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Causal Propagation Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm  ">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-600  ">
                  <GitBranch size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800 ">Explainability Graph</h4>
              </div>
              {explanation && (
                <div className="px-3 py-1 rounded-full bg-emerald-50  text-[11px] font-medium text-emerald-700">
                  {explanation.confidence}% Confidence
                </div>
              )}
            </div>

            {explanation ? (
              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-olive-50  border border-olive-100 ">
                  <p className="text-sm font-medium text-olive-700  leading-relaxed italic">
                    "{explanation.narrative}"
                  </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <p className="text-[11px] font-medium text-olive-400">Contribution Factors</p>
                    <div className="space-y-5">
                      {(explanation.contributorWeights ?? explanation.factors).slice(0, 5).map((f) => (
                        <FactorBar key={f.key} label={f.label} share={f.contributionShare ?? f.value} color={f.key.includes('risk') ? '#ef4444' : 'var(--color-olive-600)'} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-olive-100 ">
                  <p className="text-[11px] font-medium text-olive-400 mb-4">Reasoning Trace</p>
                  <div className="grid gap-2">
                    {explanation.reasoningChain.map((step, i) => (
                      <div key={i} className="flex gap-3 text-xs text-olive-500 ">
                        <span className="font-semibold text-olive-300  tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <Loader2 size={32} className="mx-auto text-olive-200 animate-spin mb-4" />
                <p className="text-sm font-semibold text-olive-400">Awaiting Causal Input</p>
              </div>
            )}
          </section>

          {/* Operational Replay Panel */}
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-50 text-olive-700 border border-olive-100">
                  <Activity size={20} />
                </div>
                <h4 className="text-lg font-semibold text-olive-800">Operational Replay</h4>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-olive-50 border border-olive-100">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-olive-500">Live Stream</span>
              </div>
            </div>

            {replayNarrative && (
              <div className="mb-8 p-6 rounded-2xl bg-olive-50/50 border border-olive-100 flex-shrink-0 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-base font-semibold leading-tight text-olive-900">{replayNarrative}</p>
                    {replayConfidence && (
                      <div className="px-2.5 py-1 rounded-lg bg-olive-100 border border-olive-200 text-[11px] font-medium text-olive-600">
                        {replayConfidence}% Conf
                      </div>
                    )}
                  </div>
                  {causalChains.length > 0 && (
                    <div className="space-y-2">
                      {causalChains.slice(0, 2).map((chain) => (
                        <div key={chain.id} className="p-3 rounded-xl bg-white border border-olive-100/50">
                          <p className="text-xs font-medium mb-2 flex items-center gap-2 text-olive-700">
                            <GitBranch size={12} className="text-olive-400" />
                            {chain.meaning}
                          </p>
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {chain.stages.map((stage, i) => (
                              <div key={i} className="flex items-center gap-2 flex-shrink-0">
                                <span className="px-2 py-0.5 rounded-md bg-olive-50 text-[11px] font-medium text-olive-500 border border-olive-100">
                                  {stage.replace(/_/g, ' ')}
                                </span>
                                {i < chain.stages.length - 1 && <ArrowRight size={10} className="text-olive-200" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-4 -mr-4 custom-scrollbar" style={{ maxHeight: '600px' }}>
              <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-olive-100">
                {timeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                    <img src={noDataImg} alt="No events" className="" />
                    <p className="text-xs font-medium text-olive-400">Awaiting events...</p>
                  </div>
                ) : (
                  timeline.map((event) => {
                    const isPositive = event.eventName.includes('completed') || event.eventName.includes('unblocked');
                    const isNegative = event.eventName.includes('blocked') || event.eventName.includes('degradation') || event.eventName.includes('collapse');

                    return (
                      <div className="relative" key={event.eventId}>
                        <div className={[
                          'absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-white shadow-sm ring-4 ring-olive-50 z-10',
                          isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-olive-400'
                        ].join(' ')}>
                          <div className="h-full w-full rounded-full bg-current opacity-20" />
                        </div>

                        <div className="p-5 rounded-xl border border-olive-100 bg-white hover:border-olive-200 transition-all duration-200">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <h5 className="text-sm font-semibold text-olive-900">
                                  {event.eventName.replace(/_/g, ' ')}
                                </h5>
                                <span className="text-[11px] font-medium text-olive-400 tabular-nums">
                                  {new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-olive-600 leading-relaxed">{event.semanticMeaning}</p>
                            </div>

                            {event.operationalImpact?.score && (
                              <div className={[
                                'px-2 py-1 rounded text-[11px] font-medium border',
                                event.operationalImpact.score > 70 ? 'bg-red-50 text-red-700 border-red-100' :
                                  event.operationalImpact.score > 40 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-100',
                              ].join(' ')}>
                                {event.operationalImpact.score} pts
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {(event.semanticTags ?? event.causalSignals ?? []).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 rounded bg-olive-50 text-[11px] font-medium text-olive-500 border border-olive-100">
                                {tag.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Drilldown Section */}
        {
          drilldown && (
            <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm   animate-slideUp">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-100 text-olive-700  ">
                      <GitBranch size={20} />
                    </div>
                    <h4 className="text-xl font-semibold text-olive-800 ">
                      {drilldown.label} Drilldown
                    </h4>
                  </div>
                  <p className="text-sm font-medium text-olive-500 ">
                    {drilldown.semanticContext.operationalMeaning}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-olive-800  tabular-nums">{drilldown.pagination.total}</p>
                  <p className="text-[11px] font-medium text-olive-400">Contributing Entities</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {drilldown.rows.map((row) => (
                  <div className="group flex items-start gap-4 p-5 rounded-2xl border border-olive-100 bg-olive-50/50 hover:bg-white hover:shadow-md transition-all   " key={row.entityId}>
                    <div className="flex-1 space-y-2">
                      <h5 className="text-sm font-semibold text-olive-800  group-hover:text-olive-700 transition-colors">
                        {row.title}
                      </h5>
                      <p className="text-xs text-olive-500  leading-snug">{row.reason}</p>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white  text-olive-500 border border-olive-100">
                          {row.status}
                        </span>
                        <span className={[
                          'text-[11px] font-medium px-2 py-0.5 rounded',
                          row.priority === 'high' ? 'bg-red-50 text-red-700' :
                            row.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                              'bg-olive-100 text-olive-600',
                        ].join(' ')}>
                          {row.priority}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-olive-300 group-hover:text-olive-700 transition-colors mt-1" />
                  </div>
                ))}
              </div>
            </section>
          )
        }

        {/* User Distribution and Governance */}
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm  ">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-100 text-olive-700  ">
                <BarChart3 size={20} />
              </div>
              <h4 className="text-lg font-semibold text-olive-800 ">Completion Distribution</h4>
            </div>

            <div className="space-y-6">
              {perUserRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src={noDataImg} alt="No activity" className="w-72 opacity-20 grayscale" />
                  <p className="text-xs font-medium text-olive-400">No User Activity Detected</p>
                </div>
              ) : (
                perUserRows.map((row) => (
                  <div className="group space-y-2" key={row.userId}>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-olive-100 text-[11px] font-medium text-olive-500">
                          {row.name ? row.name.slice(0, 2) : row.userId.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-olive-700  group-hover:text-olive-700 transition-colors">
                          {row.name || row.email || 'Anonymous System User'}
                        </span>
                      </div>
                      <span className="font-semibold text-olive-800 tabular-nums">{row.count} Units</span>
                    </div>
                    <div className="h-2 rounded-full bg-olive-100  overflow-hidden">
                      <div
                        className="h-full rounded-full bg-olive-700  transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max((row.count / maxCompleted) * 100, 5)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-olive-200 bg-white p-8 shadow-sm  ">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-100 text-olive-700  ">
                <Database size={20} />
              </div>
              <h4 className="text-lg font-semibold text-olive-800 ">Semantic Governance Explorer</h4>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-olive-50  border border-olive-100  group">
                <p className="text-[11px] font-medium text-olive-400 mb-3 group-hover:text-olive-700 transition-colors">Governed Asset</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-olive-800">
                    Delivery Risk • {governance?.semanticMaturityLevel?.replace(/_/g, ' ') ?? 'Semantic Metric'}
                  </p>
                  <ShieldCheck size={16} className="text-emerald-500" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-olive-50  border border-olive-100 ">
                <p className="text-[11px] font-medium text-olive-400 mb-4">Source Signal Lineage</p>
                <div className="flex flex-wrap gap-2">
                  {(lineage?.lineage.sourceEvents ?? []).slice(0, 8).map((ev) => (
                    <span key={ev} className="px-2 py-1 rounded bg-white text-[11px] font-medium text-olive-500 border border-olive-100">
                      {ev.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-olive-50  border border-olive-100 ">
                  <p className="text-[11px] font-medium text-olive-400 mb-2">Stability</p>
                  <p className="text-xs font-medium text-olive-700">{governance?.lifecycleState ?? 'STABLE'}</p>
                </div>
                <div className="p-5 rounded-2xl bg-olive-50  border border-olive-100 ">
                  <p className="text-[11px] font-medium text-olive-400 mb-2">AI Visibility</p>
                  <p className="text-xs font-medium text-emerald-600">{governance?.aiVisibility ?? 'SAFE'}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white text-white group cursor-help">
                <p className="text-[11px] font-medium text-white/40 mb-3 group-hover:text-emerald-400 transition-colors">Semantic Freshness Policy</p>
                <div className="flex items-center gap-3">
                  <RefreshCw size={14} className="animate-spin-slow" />
                  <p className="text-xs font-medium">{governance?.freshnessPolicy?.replace(/_/g, ' ') ?? 'EVENT DRIVEN REALTIME'}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div >
    </div >
  );
}
