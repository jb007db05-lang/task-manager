import api from './api';

export type InsightRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time';

export interface InsightsOverview {
  scope: {
    workspaceId: string;
    projectCount: number;
    projectId: string | null;
    timeRange: InsightRange;
    since: string | null;
    generatedAt: string;
  };
  tasks: {
    open: number;
    created: number;
    completed: number;
    overdue: number;
    blocked: number;
    stale: number;
    /** Share of tasks created in the period that are done; null when none were created. */
    completionRate: number | null;
    byStatus: Array<{ status: string; count: number }>;
    weekly: Array<{ week: string; created: number; completed: number }>;
  };
  hours: {
    total: number;
    byMember: Array<{ userId: string; name: string; hours: number }>;
    weekly: Array<{ week: string; hours: number }>;
  };
  prompts: {
    total: number;
    used: number;
    createdInRange: number | null;
    top: Array<{ id: string; name: string; category: string | null; uses: number; lastUsedAt: string | null }>;
    byCategory: Array<{ category: string; count: number }>;
  };
  projects: Array<{
    projectId: string;
    name: string;
    color: string | null;
    open: number;
    overdue: number;
    blocked: number;
    completed: number;
    hours: number;
  }>;
  attention: Array<{
    kind: 'overdue' | 'blocked' | 'stale' | 'unassigned';
    projectId: string;
    projectName: string;
    count: number;
    message: string;
  }>;
}

/** Analyses available with the "Run analyses" permission, in plain words. */
export const ANALYSES = [
  { metric: 'delivery_risk', label: 'Delivery risk', question: 'How likely is work to slip?' },
  { metric: 'workflow_bottlenecks', label: 'Bottlenecks', question: 'Where is work piling up?' },
  { metric: 'blocker_pressure', label: 'Blockers', question: 'How much is blocked work slowing us?' },
  { metric: 'review_latency', label: 'Review delays', question: 'Is work waiting too long in review?' },
  { metric: 'project_momentum', label: 'Momentum', question: 'Are we speeding up or slowing down?' }
] as const;
export type AnalysisMetric = (typeof ANALYSES)[number]['metric'];

export interface AnalysisFactor {
  key: string;
  label: string;
  value: number;
  direction: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

export interface MetricExplanation {
  metric: AnalysisMetric;
  value: number;
  confidence: number;
  factors: AnalysisFactor[];
  narrative: string;
}

export interface MetricForecast {
  metric: AnalysisMetric;
  horizons: Array<{ days: number; projectedValue: number; trajectory: 'improving' | 'degrading' | 'stable'; confidence: number }>;
  riskDrivers: Array<{ key: string; label: string; value: number }>;
}

interface AnalysisQuery {
  metric: AnalysisMetric;
  timeRange: InsightRange;
  projectId?: string;
}

const toBody = ({ metric, timeRange, projectId }: AnalysisQuery) => ({
  metric,
  timeRange,
  filters: projectId ? { projectId } : {}
});

export const insightsService = {
  async overview(timeRange: InsightRange, projectId?: string): Promise<InsightsOverview> {
    const res = await api.get<{ data: InsightsOverview }>('/analytics/insights', {
      params: { timeRange, ...(projectId ? { projectId } : {}) }
    });
    return res.data.data;
  },

  async explain(query: AnalysisQuery): Promise<MetricExplanation> {
    return (await api.post<{ data: MetricExplanation }>('/analytics/explain-metric', toBody(query))).data.data;
  },

  async forecast(query: AnalysisQuery): Promise<MetricForecast> {
    return (await api.post<{ data: MetricForecast }>('/analytics/forecast', toBody(query))).data.data;
  }
};

export default insightsService;
