import api from '@/services/api';
import type {
  EngagementEventName,
  EngagementRuntimeContext,
  FrequencyRules,
  Guide,
  GuidePriority,
  GuideStatus,
  GuideStep,
  GuideType,
  ScheduleRules,
  TargetingRuleGroup
} from '@/lib/guides/types';

interface ApiEnvelope<T> {
  data: T;
}

export interface GuidePayload {
  title: string;
  description?: string;
  type: GuideType;
  status?: GuideStatus;
  priority?: GuidePriority;
  targetingRules?: TargetingRuleGroup | null;
  frequencyRules?: FrequencyRules;
  scheduleRules?: ScheduleRules;
  steps?: GuideStep[];
  metadata?: Record<string, unknown>;
}

export interface SurveyPayload {
  title: string;
  description?: string;
  status?: GuideStatus;
  priority?: GuidePriority;
  questions: GuideStep[];
  targetingRules?: TargetingRuleGroup | null;
  triggerRules?: TargetingRuleGroup | null;
  frequencyRules?: FrequencyRules;
  scheduleRules?: ScheduleRules;
  metadata?: Record<string, unknown>;
}

export interface ChecklistPayload {
  title: string;
  description?: string;
  status?: GuideStatus;
  priority?: GuidePriority;
  items: GuideStep[];
  targetingRules?: TargetingRuleGroup | null;
  frequencyRules?: FrequencyRules;
  scheduleRules?: ScheduleRules;
  estimatedMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface GuideAnalyticsSummary {
  guides: {
    total: number;
    live: number;
    impressions: number;
    completions: number;
    dismissals: number;
    completionRate: number;
    dismissalRate: number;
  };
  surveys: {
    total: number;
    responses: number;
    nps: number;
    promoters: number;
    passives: number;
    detractors: number;
  };
  mtu: {
    month: string;
    users: number;
  };
  events: Array<{ eventName: string; count: number }>;
}

export const listGuides = async (sdkIntegrationId: string): Promise<Guide[]> => {
  const response = await api.get<ApiEnvelope<{ guides: Guide[] }>>(`/sdk-integrations/${sdkIntegrationId}/guides`);
  return response.data.data.guides.map(normalizeGuide);
};

export const createGuide = async (sdkIntegrationId: string, payload: GuidePayload): Promise<Guide> => {
  const response = await api.post<ApiEnvelope<{ guide: Guide }>>(`/sdk-integrations/${sdkIntegrationId}/guides`, payload);
  return normalizeGuide(response.data.data.guide);
};

export const updateGuide = async (sdkIntegrationId: string, guideId: string, payload: Partial<GuidePayload>): Promise<Guide> => {
  const response = await api.patch<ApiEnvelope<{ guide: Guide }>>(`/sdk-integrations/${sdkIntegrationId}/guides/${guideId}`, payload);
  return normalizeGuide(response.data.data.guide);
};

export const updateGuideStatus = async (sdkIntegrationId: string, guideId: string, status: GuideStatus): Promise<Guide> => {
  const response = await api.post<ApiEnvelope<{ guide: Guide }>>(`/sdk-integrations/${sdkIntegrationId}/guides/${guideId}/status/${status}`);
  return normalizeGuide(response.data.data.guide);
};

export const deleteGuide = async (sdkIntegrationId: string, guideId: string): Promise<void> => {
  await api.delete(`/sdk-integrations/${sdkIntegrationId}/guides/${guideId}`);
};

export const listSurveys = async (sdkIntegrationId: string): Promise<Guide[]> => {
  const response = await api.get<ApiEnvelope<{ surveys: Guide[] }>>(`/sdk-integrations/${sdkIntegrationId}/surveys`);
  return response.data.data.surveys.map((survey) => normalizeGuide({ ...survey, type: 'SURVEY', steps: survey.steps ?? (survey as Guide & { questions?: GuideStep[] }).questions ?? [] }));
};

export const createSurvey = async (sdkIntegrationId: string, payload: SurveyPayload): Promise<Guide> => {
  const response = await api.post<ApiEnvelope<{ survey: Guide }>>(`/sdk-integrations/${sdkIntegrationId}/surveys`, payload);
  return normalizeGuide({ ...response.data.data.survey, type: 'SURVEY', steps: payload.questions });
};

export const updateSurvey = async (sdkIntegrationId: string, surveyId: string, payload: Partial<SurveyPayload>): Promise<Guide> => {
  const response = await api.patch<ApiEnvelope<{ survey: Guide }>>(`/sdk-integrations/${sdkIntegrationId}/surveys/${surveyId}`, payload);
  return normalizeGuide({ ...response.data.data.survey, type: 'SURVEY', steps: payload.questions ?? [] });
};

export const submitSurveyResponse = async (
  sdkIntegrationId: string,
  surveyId: string,
  payload: { userId?: string; sessionId?: string | null; answers: Record<string, unknown>; metadata?: Record<string, unknown> }
): Promise<void> => {
  await api.post(`/sdk-integrations/${sdkIntegrationId}/surveys/${surveyId}/responses`, payload);
};

export interface SurveyResponseAnswer {
  questionId: string;
  questionTitle: string;
  questionType: string;
  value: unknown;
}

export interface SurveyResponse {
  _id: string;
  tenantId: string;
  sdkIntegrationId: string;
  surveyId: string;
  userId: string;
  sessionId: string;
  answers: SurveyResponseAnswer[];
  npsScore: number | null;
  category: string;
  metadata: Record<string, unknown>;
  submittedAt: string;
}

export const listSurveyResponses = async (
  sdkIntegrationId: string,
  surveyId: string,
  environment: 'live' | 'sandbox' = 'live',
  page = 1,
  limit = 100
): Promise<SurveyResponse[]> => {
  const response = await api.get<ApiEnvelope<{ responses: SurveyResponse[] }>>(
    `/sdk-integrations/${sdkIntegrationId}/surveys/${surveyId}/responses`,
    { params: { environment, page, limit } }
  );
  return response.data.data.responses;
};

export const listChecklists = async (): Promise<Guide[]> => {
  const response = await api.get<ApiEnvelope<{ checklists: Guide[] }>>('/checklists');
  return response.data.data.checklists.map((checklist) => normalizeGuide({ ...checklist, type: 'CHECKLIST', steps: checklist.steps ?? (checklist as Guide & { items?: GuideStep[] }).items ?? [] }));
};

export const createChecklist = async (payload: ChecklistPayload): Promise<Guide> => {
  const response = await api.post<ApiEnvelope<{ checklist: Guide }>>('/checklists', payload);
  return normalizeGuide({ ...response.data.data.checklist, type: 'CHECKLIST', steps: payload.items });
};

export const updateChecklist = async (checklistId: string, payload: Partial<ChecklistPayload>): Promise<Guide> => {
  const response = await api.patch<ApiEnvelope<{ checklist: Guide }>>(`/checklists/${checklistId}`, payload);
  return normalizeGuide({ ...response.data.data.checklist, type: 'CHECKLIST', steps: payload.items ?? [] });
};

export const evaluateRuntime = async (context: EngagementRuntimeContext): Promise<Guide[]> => {
  const response = await api.post<ApiEnvelope<{ experiences: Guide[] }>>('/engagement/runtime', context);
  return response.data.data.experiences.map(normalizeGuide);
};

export const trackEngagementEvent = async (payload: {
  eventName: EngagementEventName;
  guideId?: string;
  surveyId?: string;
  checklistId?: string;
  stepId?: string;
  sessionId?: string | null;
  userId?: string;
  properties?: Record<string, unknown>;
}): Promise<void> => {
  await api.post('/engagement/track', payload);
};

export const getGuideAnalyticsSummary = async (
  sdkIntegrationId: string,
  environment: 'live' | 'sandbox' = 'live'
): Promise<GuideAnalyticsSummary> => {
  const response = await api.get<ApiEnvelope<GuideAnalyticsSummary>>(
    `/sdk-integrations/${sdkIntegrationId}/guide-analytics/summary`,
    { params: { environment } }
  );
  return response.data.data;
};

const normalizeGuide = (guide: Guide & { _id?: string; questions?: GuideStep[]; items?: GuideStep[] }): Guide => ({
  ...guide,
  id: guide.id ?? guide._id ?? '',
  steps: guide.steps ?? guide.questions ?? guide.items ?? [],
  priority: guide.priority ?? 'MEDIUM',
  type: guide.type ?? 'MODAL'
});
