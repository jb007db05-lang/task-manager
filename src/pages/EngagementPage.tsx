import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CheckSquare,
  GripVertical,
  Layers3,
  Link,
  Pencil,
  Plus,
  Radio,
  Save,
  Target,
  Trash2,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  createChecklist,
  createGuide,
  createSurvey,
  deleteGuide,
  getGuideAnalyticsSummary,
  listChecklists,
  listGuides,
  listSurveys,
  updateChecklist,
  updateGuide,
  updateGuideStatus,
  updateSurvey,
  listSurveyResponses,
  type GuideAnalyticsSummary,
  type SurveyResponse,
  type GuidePayload,
  type SurveyPayload,
  type ChecklistPayload
} from '@/lib/engagement/api';
import { listIntegrations, type SdkIntegration } from '@/lib/sdk-integrations/api';
import { normalizeApiError } from '@/utils/apiError';
import type {
  FrequencyRules,
  Guide,
  GuidePriority,
  GuideStep,
  GuideType,
  TargetingCondition,
  TargetingConditionType,
  TargetingRuleGroup
} from '@/lib/guides/types';

type BuilderTab = 'guides' | 'surveys' | 'checklists' | 'analytics';

const defaultRules = (): TargetingRuleGroup => ({
  id: crypto.randomUUID(),
  operator: 'AND',
  conditions: [],
  groups: []
});

const defaultFrequency: FrequencyRules = {
  showOncePerSession: true,
  cooldownHours: 24,
  maxDisplays: 5
};

const conditionTypes: TargetingConditionType[] = [
  'URL_CONTAINS',
  'URL_EQUALS',
  'URL_REGEX',
  'REFERRER_EQUALS',
  'REFERRER_CONTAINS',
  'ROLE_EQUALS',
  'PLAN_EQUALS',
  'ACCOUNT_AGE',
  'TENANT_EQUALS',
  'EVENT_TRIGGERED',
  'EVENT_NOT_TRIGGERED',
  'RAGE_CLICK_COUNT',
  'VISITED_PAGE',
  'COMPLETED_WORKFLOW',
  'ABANDONED_FORM',
  'SESSION_DURATION',
  'SESSION_COUNT',
  'ENGAGEMENT_SCORE',
  'SHOW_ONCE',
  'SHOW_EVERY_X_DAYS',
  'COOLDOWN',
  'TIME_WINDOW',
  'EXIT_INTENT',
  'IDLE_TIMEOUT'
];

const conditionLabels: Record<TargetingConditionType, string> = {
  URL_CONTAINS: 'URL contains',
  URL_EQUALS: 'URL equals',
  URL_REGEX: 'URL matches regex',
  REFERRER_EQUALS: 'Referrer equals',
  REFERRER_CONTAINS: 'Referrer contains',
  ROLE_EQUALS: 'Role equals',
  PLAN_EQUALS: 'Plan equals',
  ACCOUNT_AGE: 'Account age (days) ≥',
  TENANT_EQUALS: 'Tenant ID equals',
  EVENT_TRIGGERED: 'Event triggered',
  EVENT_NOT_TRIGGERED: 'Event NOT triggered',
  RAGE_CLICK_COUNT: 'Rage click count ≥',
  VISITED_PAGE: 'Visited page',
  COMPLETED_WORKFLOW: 'Completed workflow',
  ABANDONED_FORM: 'Abandoned form selector',
  SESSION_DURATION: 'Session duration (s) ≥',
  SESSION_COUNT: 'Session count ≥',
  ENGAGEMENT_SCORE: 'Engagement score ≥',
  SHOW_ONCE: 'Show once ever',
  SHOW_EVERY_X_DAYS: 'Show every X days',
  COOLDOWN: 'Cooldown (hours)',
  TIME_WINDOW: 'Time window',
  EXIT_INTENT: 'Exit intent',
  IDLE_TIMEOUT: 'Idle timeout'
};

const conditionPlaceholders: Partial<Record<TargetingConditionType, string>> = {
  URL_CONTAINS: 'e.g. /dashboard',
  URL_EQUALS: 'e.g. https://app.example.com/home',
  URL_REGEX: 'e.g. /projects/[0-9]+',
  REFERRER_EQUALS: 'e.g. https://google.com',
  REFERRER_CONTAINS: 'e.g. google.com',
  ROLE_EQUALS: 'e.g. ADMIN',
  PLAN_EQUALS: 'e.g. pro',
  ACCOUNT_AGE: 'e.g. 7',
  TENANT_EQUALS: 'e.g. tenant-id',
  EVENT_TRIGGERED: 'e.g. project_created',
  EVENT_NOT_TRIGGERED: 'e.g. onboarding_complete',
  RAGE_CLICK_COUNT: 'e.g. 3',
  VISITED_PAGE: 'e.g. /pricing',
  COMPLETED_WORKFLOW: 'e.g. onboarding',
  ABANDONED_FORM: 'e.g. #signup-form',
  SESSION_DURATION: 'e.g. 30',
  SESSION_COUNT: 'e.g. 3',
  ENGAGEMENT_SCORE: 'e.g. 50',
  SHOW_EVERY_X_DAYS: 'e.g. 7',
  COOLDOWN: 'e.g. 24',
  TIME_WINDOW: 'e.g. 09:00-17:00'
};

const guideTypes: GuideType[] = ['MODAL', 'TOUR', 'SMART_TIP', 'HOTSPOT', 'BANNER'];
const priorities: GuidePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface EngagementPageProps {
  sdkIntegrationId?: string;
  defaultTab?: BuilderTab;
  hideHeader?: boolean;
  /** Analytics and responses shown for live or sandbox traffic. */
  environment?: 'live' | 'sandbox';
}

function EngagementPage({ sdkIntegrationId: propSdkIntegrationId, defaultTab, hideHeader = false, environment = 'live' }: EngagementPageProps): JSX.Element {
  const { integrationId } = useParams();
  const [activeIntegrationId, setActiveIntegrationId] = useState<string>('');
  const [integrations, setIntegrations] = useState<SdkIntegration[]>([]);
  const [tab, setTab] = useState<BuilderTab>(defaultTab ?? 'guides');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [surveys, setSurveys] = useState<Guide[]>([]);
  const [checklists, setChecklists] = useState<Guide[]>([]);
  const [analytics, setAnalytics] = useState<GuideAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Runs an action and shows the server's reason if it is refused. */
  const runAction = async (action: () => Promise<void>) => {
    setMessage(null);
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(normalizeApiError(error).message);
    }
  };
  const [selectedSurveyForResponses, setSelectedSurveyForResponses] = useState<Guide | null>(null);
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Guide | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'guide' | 'survey' | 'checklist'>('guide');
  const [publishingExperience, setPublishingExperience] = useState<Guide | null>(null);

  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    const resolvedId = propSdkIntegrationId ?? integrationId;
    if (resolvedId) {
      setActiveIntegrationId(resolvedId);
    } else {
      const fetchIntegrations = async () => {
        try {
          const list = await listIntegrations();
          setIntegrations(list);
          if (list.length > 0) {
            setActiveIntegrationId(list[0].id);
          }
        } catch (err) {
          console.error('Failed to load integrations', err);
        }
      };
      void fetchIntegrations();
    }
  }, [propSdkIntegrationId, integrationId]);

  const load = async () => {
    if (!activeIntegrationId) return;
    setLoading(true);
    try {
      const [guideList, surveyList, checklistList, summary] = await Promise.all([
        listGuides(activeIntegrationId),
        listSurveys(activeIntegrationId),
        listChecklists(),
        getGuideAnalyticsSummary(activeIntegrationId, environment)
      ]);
      setGuides(guideList);
      setSurveys(surveyList);
      setChecklists(checklistList);
      setAnalytics(summary);
    } catch (error) {
      console.error('Failed to load engagement data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIntegrationId) {
      localStorage.setItem('active_sdk_integration_id', activeIntegrationId);
      window.dispatchEvent(new CustomEvent('sync:active-integration-changed', { detail: { id: activeIntegrationId } }));
      void load();
    }
  }, [activeIntegrationId, environment]);

  const handleStatusChangeRequest = async (experience: Guide, status: 'LIVE' | 'PAUSED' | 'ARCHIVED') => {
    if (status === 'LIVE') {
      setPublishingExperience(experience);
    } else {
      await executeStatusChange(experience, status);
    }
  };

  const executeStatusChange = (experience: Guide, status: 'LIVE' | 'PAUSED' | 'ARCHIVED') =>
    runAction(async () => {
      if (experience.type === 'SURVEY') {
        await updateSurvey(activeIntegrationId, experience.id, { status });
        setMessage(`Survey ${status.toLowerCase()}.`);
      } else if (experience.type === 'CHECKLIST') {
        await updateChecklist(experience.id, { status });
        setMessage(`Checklist ${status.toLowerCase()}.`);
      } else {
        await updateGuideStatus(activeIntegrationId, experience.id, status);
        setMessage(`Guide ${status.toLowerCase()}.`);
      }
      await load();
    });

  const totals = useMemo(
    () => ({
      live: [...guides, ...surveys, ...checklists].filter((item) => item.status === 'LIVE').length,
      drafts: [...guides, ...surveys, ...checklists].filter((item) => item.status === 'DRAFT').length
    }),
    [checklists, guides, surveys]
  );

  return (
    <div className="min-h-full bg-slate-50/50 ">
      {!hideHeader && (
        <div className="border-b border-slate-200  bg-white  px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="m-0 text-2xl font-bold text-slate-900 ">Engagement</h2>
                {integrations.length > 0 && !propSdkIntegrationId && (
                  <select
                    value={activeIntegrationId}
                    onChange={(e) => setActiveIntegrationId(e.target.value)}
                    className="rounded-lg border border-slate-200  bg-white  px-3 py-1.5 text-sm font-semibold text-slate-800  shadow-sm focus:border-slate-500 focus:outline-none"
                  >
                    {integrations.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.name} ({integration.environment})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="m-0 mt-1 text-sm text-slate-500 ">Guides, surveys, checklists, targeting, and behavior analytics</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right">
              <Metric label="Live" value={totals.live} />
              <Metric label="Drafts" value={totals.drafts} />
              <Metric label="MTU" value={analytics?.mtu.users ?? 0} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <TabButton active={tab === 'guides'} icon={Layers3} label="Guides" onClick={() => setTab('guides')} />
            <TabButton active={tab === 'surveys'} icon={Radio} label="Surveys" onClick={() => setTab('surveys')} />
            <TabButton active={tab === 'checklists'} icon={CheckSquare} label="Checklists" onClick={() => setTab('checklists')} />
            <TabButton active={tab === 'analytics'} icon={BarChart3} label="Analytics" onClick={() => setTab('analytics')} />
          </div>
        </div>
      )}

      {message && (
        <div className="mx-8 mt-5 rounded-md border border-emerald-200  bg-emerald-50  px-4 py-3 text-sm font-semibold text-emerald-800 ">
          {message}
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="mx-8 mt-5 flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700" aria-label="Dismiss error">×</button>
        </div>
      )}
      {environment === 'sandbox' && (
        <div className="mx-8 mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Showing <span className="font-bold">sandbox</span> analytics and responses. Draft guides and surveys are delivered to the sandbox key, so you can test them before going live.
        </div>
      )}

      <div className="p-8">
        {(tab === 'guides' || tab === 'surveys' || tab === 'checklists') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-lg font-bold text-slate-800 capitalize">{tab} Library</h3>
              <button
                onClick={() => {
                  setCreateModalType(tab === 'guides' ? 'guide' : tab === 'surveys' ? 'survey' : 'checklist');
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-bold text-white transition-colors shadow-sm"
              >
                <Plus size={16} />
                Create {tab === 'guides' ? 'Guide' : tab === 'surveys' ? 'Survey' : 'Checklist'}
              </button>
            </div>
            <ExperienceList
              experiences={
                tab === 'guides'
                  ? guides
                  : tab === 'surveys'
                  ? surveys
                  : checklists
              }
              loading={loading}
              onStatusChange={handleStatusChangeRequest}
              onViewResponses={tab === 'surveys' ? (survey) => {
                setSelectedSurveyForResponses(survey);
                setIsResponsesModalOpen(true);
              } : undefined}
              onEdit={(experience) => {
                setEditingExperience(experience);
                setIsEditModalOpen(true);
              }}
              onDelete={(experience) => runAction(async () => {
                if (tab === 'guides') {
                  await deleteGuide(activeIntegrationId, experience.id);
                  setMessage('Guide deleted.');
                } else if (tab === 'surveys') {
                  await updateSurvey(activeIntegrationId, experience.id, { status: 'ARCHIVED' });
                  setMessage('Survey archived.');
                } else if (tab === 'checklists') {
                  await updateChecklist(experience.id, { status: 'ARCHIVED' });
                  setMessage('Checklist archived.');
                }
                await load();
              })}
            />
          </div>
        )}
        {tab === 'analytics' && <AnalyticsDashboard analytics={analytics} />}
      </div>
      {selectedSurveyForResponses && (
        <SurveyResponsesModal
          isOpen={isResponsesModalOpen}
          onClose={() => {
            setIsResponsesModalOpen(false);
            setSelectedSurveyForResponses(null);
          }}
          survey={selectedSurveyForResponses}
          sdkIntegrationId={activeIntegrationId}
          environment={environment}
        />
      )}
      {isEditModalOpen && editingExperience && (
        <EditExperienceModal
          experience={editingExperience}
          onClose={() => { setIsEditModalOpen(false); setEditingExperience(null); }}
          onSave={async (updated) => {
            if (editingExperience.type === 'SURVEY') {
              await updateSurvey(activeIntegrationId, editingExperience.id, {
                title: updated.title,
                description: updated.description,
                priority: updated.priority,
                questions: updated.steps,
                targetingRules: updated.targetingRules ?? null,
                frequencyRules: updated.frequencyRules,
              });
            } else {
              await updateGuide(activeIntegrationId, editingExperience.id, {
                title: updated.title,
                description: updated.description,
                type: updated.type,
                priority: updated.priority,
                steps: updated.steps,
                targetingRules: updated.targetingRules ?? null,
                frequencyRules: updated.frequencyRules,
              });
            }
            setMessage('Experience updated.');
            setIsEditModalOpen(false);
            setEditingExperience(null);
            await load();
          }}
        />
      )}
      {publishingExperience && (
        <PublishConfirmModal
          isOpen={!!publishingExperience}
          onClose={() => setPublishingExperience(null)}
          onConfirm={async () => {
            const exp = publishingExperience;
            setPublishingExperience(null);
            await executeStatusChange(exp, 'LIVE');
          }}
          experience={publishingExperience}
        />
      )}
      {isCreateModalOpen && (
        <CreateExperienceModal
          type={createModalType}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async (payload) => {
            if (createModalType === 'survey') {
              await createSurvey(activeIntegrationId, payload as SurveyPayload);
              setMessage('Survey saved.');
            } else if (createModalType === 'checklist') {
              await createChecklist(payload as ChecklistPayload);
              setMessage('Checklist saved.');
            } else {
              await createGuide(activeIntegrationId, payload as GuidePayload);
              setMessage('Guide saved.');
            }
            setIsCreateModalOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ExperienceList({
  experiences,
  loading,
  onStatusChange,
  onViewResponses,
  onEdit,
  onDelete
}: {
  experiences: Guide[];
  loading: boolean;
  onStatusChange: (experience: Guide, status: 'LIVE' | 'PAUSED' | 'ARCHIVED') => Promise<void>;
  onViewResponses?: (experience: Guide) => void;
  onEdit?: (experience: Guide) => void;
  onDelete?: (experience: Guide) => Promise<void>;
}): JSX.Element {
  const statusColor: Record<string, string> = {
    LIVE: 'bg-emerald-100  text-emerald-700 ',
    DRAFT: 'bg-amber-100  text-amber-700 ',
    PAUSED: 'bg-slate-100  text-slate-600 ',
    ARCHIVED: 'bg-red-100  text-red-700 ',
  };
  return (
    <div className="rounded-lg bg-white  p-6 shadow-md">
      <SectionTitle icon={Layers3} title="Library" />
      <div className="grid gap-3 mt-4">
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && experiences.length === 0 && <p className="text-sm text-slate-500">No experiences yet.</p>}
        {experiences.map((experience) => (
          <div className="rounded-md bg-slate-50  px-4 py-3 shadow-xs" key={experience.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-sm font-bold text-slate-900  truncate">{experience.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500 ">{experience.type}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${statusColor[experience.status ?? 'DRAFT'] ?? statusColor.DRAFT}`}>
                    {experience.status ?? 'DRAFT'}
                  </span>
                  <span className="text-xs text-slate-500 ">{experience.priority}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {onViewResponses && experience.type === 'SURVEY' && (
                  <button className="rounded border border-slate-200  bg-slate-50  hover:bg-slate-100  px-2.5 py-1 text-xs font-bold text-slate-700  transition-colors" onClick={() => onViewResponses(experience)} type="button">Responses</button>
                )}
                {onEdit && (
                  <button className="rounded border border-blue-200  bg-blue-50  hover:bg-blue-100  px-2.5 py-1 text-xs font-bold text-blue-700  flex items-center gap-1 transition-colors" onClick={() => onEdit(experience)} type="button">
                    <Pencil size={11} /> Edit
                  </button>
                )}
                {experience.status === 'LIVE' ? (
                  <button
                    className="rounded border border-amber-200  bg-amber-50  px-2.5 py-1 text-xs font-bold text-amber-700  hover:bg-amber-100  transition-colors"
                    onClick={() => onStatusChange(experience, 'PAUSED')}
                    type="button"
                  >
                    Take Down
                  </button>
                ) : (
                  <button
                    className="rounded border border-emerald-200  bg-emerald-50  px-2.5 py-1 text-xs font-bold text-emerald-700  hover:bg-emerald-100  transition-colors"
                    onClick={() => onStatusChange(experience, 'LIVE')}
                    type="button"
                  >
                    Publish
                  </button>
                )}
                {experience.status !== 'LIVE' && experience.status !== 'PAUSED' && (
                  <button className="rounded border border-slate-200  px-2.5 py-1 text-xs font-bold text-slate-700  hover:bg-slate-50  transition-colors" onClick={() => onStatusChange(experience, 'PAUSED')} type="button">Pause</button>
                )}
                {onDelete ? (
                  <button className="rounded border border-red-200  px-2.5 py-1 text-xs font-bold text-red-600  hover:bg-red-50  flex items-center gap-1 transition-colors" onClick={() => void onDelete(experience)} type="button">
                    <Trash2 size={11} /> Delete
                  </button>
                ) : (
                  <button className="rounded border border-red-200  px-2.5 py-1 text-xs font-bold text-red-600  hover:bg-red-50  transition-colors" onClick={() => onStatusChange(experience, 'ARCHIVED')} type="button">Archive</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepEditor({ steps, onChange, mode }: { steps: GuideStep[]; onChange: (steps: GuideStep[]) => void; mode: 'guide' | 'survey' | 'checklist' }): JSX.Element {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const add = () => onChange([...steps, mode === 'survey' ? newSurveyQuestion('TEXT') : mode === 'checklist' ? newChecklistItem() : newStep()]);
  const update = (index: number, patch: Partial<GuideStep>) => onChange(steps.map((step, current) => (current === index ? { ...step, ...patch } : step)));
  const remove = (index: number) => onChange(steps.filter((_, current) => current !== index));
  const drop = (index: number) => {
    if (dragIndex == null || dragIndex === index) return;
    const next = [...steps];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(null);
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={GripVertical} title={mode === 'survey' ? 'Questions' : mode === 'checklist' ? 'Items' : 'Steps'} />
        <button className="flex items-center gap-2 rounded-md border border-olive-200 px-3 py-1.5 text-xs font-bold text-olive-700" onClick={add} type="button">
          <Plus size={14} />
          Add
        </button>
      </div>
      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div
            className="rounded-md border border-olive-200 bg-olive-50 p-4"
            draggable
            key={step.id}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => drop(index)}
          >
            <div className="grid grid-cols-[24px_1.5fr_1fr_32px] gap-3">
              <GripVertical className="mt-2 text-olive-400" size={18} />
              <TextInput label="Title" value={step.title} onChange={(value) => update(index, { title: value })} />
              {mode === 'survey' ? (
                <SelectInput label="Type" value={step.type ?? 'TEXT'} values={['NPS', 'TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'RATING_SCALE', 'DROPDOWN', 'YES_NO', 'CSAT', 'CES', 'EMOJI', 'OPINION_SCALE', 'FILE_UPLOAD', 'CONTACT']} onChange={(value) => update(index, { type: value as GuideStep['type'] })} />
              ) : mode === 'checklist' ? (
                <TextInput label="Event" value={step.linkedEvent ?? ''} onChange={(value) => update(index, { linkedEvent: value })} />
              ) : (
                <TextInput label="Selector" value={step.selector ?? ''} onChange={(value) => update(index, { selector: value })} />
              )}
              <button className="mt-6 flex h-9 w-9 items-center justify-center rounded-md text-red-500 hover:bg-red-50" onClick={() => remove(index)} title="Remove" type="button">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3">
              <TextInput label="Description" value={step.description ?? ''} onChange={(value) => update(index, { description: value })} />
            </div>
            {mode === 'survey' && ['SINGLE_CHOICE', 'MULTI_CHOICE', 'DROPDOWN'].includes(step.type ?? '') && (
              <div className="mt-3">
                <TextInput label="Options, comma-separated" value={(step.options ?? []).join(', ')} onChange={(value) => update(index, { options: value.split(',').map((entry) => entry.trim()).filter(Boolean) })} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Quick-entry component for URL-based page targeting */
function UrlTargeting({ rules, onChange }: { rules: TargetingRuleGroup; onChange: (rules: TargetingRuleGroup) => void }): JSX.Element {
  const urlConditions = (rules.conditions ?? []).filter((c) => c.type === 'URL_CONTAINS' || c.type === 'URL_EQUALS');

  const addUrl = () => {
    const condition: TargetingCondition = { id: crypto.randomUUID(), type: 'URL_CONTAINS', value: '' };
    onChange({ ...rules, conditions: [...(rules.conditions ?? []), condition] });
  };

  const updateUrl = (id: string, value: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, value, eventName: value } : c)) });
  };

  const updateMatchType = (id: string, type: TargetingConditionType) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, type } : c)) });
  };

  const removeUrl = (id: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="mt-6 rounded-lg border border-olive-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={Link} title="Show on Pages" />
        <button className="flex items-center gap-1.5 rounded-md border border-olive-200 px-3 py-1.5 text-xs font-bold text-olive-700 hover:bg-olive-50" onClick={addUrl} type="button">
          <Plus size={13} />
          Add URL
        </button>
      </div>
      {urlConditions.length === 0 && (
        <p className="m-0 text-sm text-olive-400 italic">No page filter — shown on every page. Add a URL to restrict where this appears.</p>
      )}
      <div className="grid gap-2">
        {urlConditions.map((condition) => (
          <div className="flex items-center gap-2" key={condition.id}>
            <select
              className="shrink-0 rounded-md border border-olive-200 px-2 py-2 text-xs font-semibold text-olive-700"
              value={condition.type}
              onChange={(e) => updateMatchType(condition.id, e.target.value as TargetingConditionType)}
            >
              <option value="URL_CONTAINS">contains</option>
              <option value="URL_EQUALS">equals</option>
            </select>
            <input
              className="flex-1 rounded-md border border-olive-200 px-3 py-2 text-sm font-medium text-olive-900 placeholder-olive-300 focus:border-olive-500 focus:outline-none"
              placeholder="e.g. /dashboard or https://app.example.com/settings"
              value={String(condition.value ?? '')}
              onChange={(e) => updateUrl(condition.id, e.target.value)}
            />
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-olive-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeUrl(condition.id)} type="button">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleBuilder({ rules, onChange }: { rules: TargetingRuleGroup; onChange: (rules: TargetingRuleGroup) => void }): JSX.Element {
  // Exclude URL conditions — those are managed by UrlTargeting above
  const nonUrlConditions = (rules.conditions ?? []).filter((c) => c.type !== 'URL_CONTAINS' && c.type !== 'URL_EQUALS');
  const noValueTypes: TargetingConditionType[] = ['EXIT_INTENT', 'IDLE_TIMEOUT'];

  const addCondition = () => {
    const condition: TargetingCondition = { id: crypto.randomUUID(), type: 'ROLE_EQUALS', value: 'ADMIN' };
    onChange({ ...rules, conditions: [...(rules.conditions ?? []), condition] });
  };

  const updateCondition = (id: string, patch: Partial<TargetingCondition>) => {
    onChange({
      ...rules,
      conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c))
    });
  };

  const removeCondition = (id: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="mt-3 rounded-lg border border-olive-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={Target} title="Audience Rules" />
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-olive-200 px-2 py-1.5 text-xs font-bold" onChange={(event) => onChange({ ...rules, operator: event.target.value as 'AND' | 'OR' })} value={rules.operator}>
            <option value="AND">Match ALL</option>
            <option value="OR">Match ANY</option>
          </select>
          <button className="flex items-center gap-1.5 rounded-md border border-olive-200 px-3 py-1.5 text-xs font-bold text-olive-700 hover:bg-olive-50" onClick={addCondition} type="button">
            <Plus size={13} />
            Add Rule
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        {nonUrlConditions.map((condition) => (
          <div className="flex items-center gap-2" key={condition.id}>
            <select
              className="shrink-0 rounded-md border border-olive-200 px-2 py-2 text-sm"
              value={condition.type}
              onChange={(e) => updateCondition(condition.id, { type: e.target.value as TargetingConditionType })}
            >
              {conditionTypes
                .filter((t) => t !== 'URL_CONTAINS' && t !== 'URL_EQUALS')
                .map((t) => <option key={t} value={t}>{conditionLabels[t]}</option>)}
            </select>
            {!noValueTypes.includes(condition.type) && (
              <input
                className="flex-1 rounded-md border border-olive-200 px-3 py-2 text-sm text-olive-900 placeholder-olive-300 focus:border-olive-500 focus:outline-none"
                placeholder={conditionPlaceholders[condition.type] ?? ''}
                value={String(condition.value ?? condition.eventName ?? '')}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value, eventName: e.target.value })}
              />
            )}
            {noValueTypes.includes(condition.type) && (
              <span className="flex-1 rounded-md border border-dashed border-olive-200 px-3 py-2 text-sm italic text-olive-400">Triggered automatically — no value needed</span>
            )}
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-olive-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeCondition(condition.id)} type="button">
              <X size={15} />
            </button>
          </div>
        ))}
        {nonUrlConditions.length === 0 && <p className="m-0 text-sm italic text-olive-400">No audience rules — visible to all authenticated users.</p>}
      </div>
    </div>
  );
}

function Preview({ guide }: { guide: Guide }): JSX.Element {
  return (
    <aside className="sticky top-6 h-fit rounded-lg border border-olive-200 bg-white p-5 shadow-sm">
      <SectionTitle icon={Bell} title="Preview" />
      <div className="mt-4 rounded-lg border border-olive-200 bg-olive-50 p-4">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-olive-500">{guide.type}</p>
        <h3 className="m-0 mt-2 text-lg font-bold text-olive-950">{guide.title}</h3>
        <p className="m-0 mt-2 text-sm text-olive-600">{guide.description}</p>
        <div className="mt-4 grid gap-2">
          {guide.steps.map((step, index) => (
            <div className="rounded-md bg-white px-3 py-2 text-sm" key={step.id}>
              <span className="font-bold text-olive-900">{index + 1}. {step.title}</span>
              {step.description && <p className="m-0 mt-1 text-xs text-olive-500">{step.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function AnalyticsDashboard({ analytics }: { analytics: GuideAnalyticsSummary | null }): JSX.Element {
  if (!analytics) {
    return <div className="rounded-lg border border-olive-200 bg-white p-6 text-sm text-olive-500">No analytics yet.</div>;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Impressions" value={analytics.guides.impressions} />
        <MetricCard label="Completions" value={analytics.guides.completions} />
        <MetricCard label="Dismissals" value={analytics.guides.dismissals} />
        <MetricCard label="NPS" value={Math.round(analytics.surveys.nps)} />
      </div>
      <div className="rounded-lg border border-olive-200 bg-white p-6">
        <SectionTitle icon={BarChart3} title="Engagement Events" />
        <div className="mt-4 grid gap-2">
          {analytics.events.map((event) => (
            <div className="grid grid-cols-[1fr_80px] rounded-md bg-slate-50  px-3 py-2 text-sm" key={event.eventName}>
              <span className="font-semibold text-slate-900 ">{event.eventName}</span>
              <span className="text-right font-bold text-slate-700 ">{event.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Promoters" value={analytics.surveys.promoters} />
        <MetricCard label="Passives" value={analytics.surveys.passives} />
        <MetricCard label="Detractors" value={analytics.surveys.detractors} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border border-slate-200  px-4 py-2">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-slate-500 ">{label}</p>
      <p className="m-0 text-xl font-black text-slate-900 ">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg bg-white  p-5 shadow-md">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-slate-500 ">{label}</p>
      <p className="m-0 mt-2 text-3xl font-black text-slate-900 ">{value}</p>
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }): JSX.Element {
  return (
    <button className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all shadow-xs ${active ? 'bg-slate-900 text-white  ' : 'border border-slate-200  text-slate-700  hover:bg-slate-50 '}`} onClick={onClick} type="button">
      <Icon size={16} />
      {label}
    </button>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-slate-700 " />
      <h3 className="m-0 text-sm font-black uppercase tracking-widest text-slate-900 ">{title}</h3>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): JSX.Element {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 min-w-0">
      {label}
      <input className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function SelectInput({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }): JSX.Element {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 min-w-0">
      {label}
      <select className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none" onChange={(event) => onChange(event.target.value)} value={value}>
        {values.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
      </select>
    </label>
  );
}

function newStep(): GuideStep {
  return {
    id: crypto.randomUUID(),
    title: 'Explain this area',
    description: 'Tell users why this workflow matters.',
    placement: 'AUTO',
    selector: '[data-guide-target]'
  };
}

function newSurveyQuestion(type: GuideStep['type']): GuideStep {
  return {
    id: crypto.randomUUID(),
    title: type === 'NPS' ? 'How likely are you to recommend Pristine?' : 'Question',
    type,
    min: 0,
    max: type === 'NPS' ? 10 : 5,
    options: ['Option A', 'Option B']
  };
}

function newChecklistItem(): GuideStep {
  return {
    id: crypto.randomUUID(),
    title: 'Create first project',
    description: 'Completes when project_created is tracked.',
    linkedEvent: 'project_created',
    estimatedMinutes: 5
  };
}

interface SurveyResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Guide;
  sdkIntegrationId: string;
  environment: 'live' | 'sandbox';
}

function SurveyResponsesModal({
  isOpen,
  onClose,
  survey,
  sdkIntegrationId,
  environment
}: SurveyResponsesModalProps): JSX.Element | null {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && survey.id) {
      setLoading(true);
      listSurveyResponses(sdkIntegrationId, survey.id, environment)
        .then(setResponses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, survey.id, sdkIntegrationId, environment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-olive-200 bg-white shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-olive-100 bg-olive-50/50 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-olive-950">Responses: {survey.title}</h3>
            <p className="mt-0.5 text-xs text-olive-500">Showing all collected response payloads, including dynamic custom fields.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-olive-400 hover:bg-olive-100 hover:text-olive-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm font-medium text-olive-600 animate-pulse">Loading responses...</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <Radio className="h-10 w-10 text-olive-300 animate-bounce" />
              <h4 className="mt-4 text-base font-semibold text-olive-900">No responses recorded yet</h4>
              <p className="mt-1 text-sm text-olive-500 max-w-xs">Once users submit responses through the SDK, they will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response._id} className="rounded-lg border border-olive-100 bg-olive-50/20 p-4 hover:border-olive-200 transition-colors shadow-sm">
                  {/* Respondent Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-olive-100/50 pb-2 mb-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-olive-500">User:</span>{' '}
                        <span className="font-mono text-olive-900 bg-olive-100/50 px-1.5 py-0.5 rounded">{response.userId || 'Anonymous'}</span>
                      </div>
                      {response.sessionId && (
                        <div>
                          <span className="font-semibold text-olive-500">Session:</span>{' '}
                          <span className="font-mono text-olive-900">{response.sessionId}</span>
                        </div>
                      )}
                      {response.category && response.category !== 'NONE' && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-olive-500">NPS Class:</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                            response.category === 'PROMOTER'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : response.category === 'PASSIVE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {response.category}
                          </span>
                        </div>
                      )}
                      {response.npsScore !== null && (
                        <div>
                          <span className="font-semibold text-olive-500">NPS Score:</span>{' '}
                          <span className="font-bold text-olive-900 bg-olive-100 px-1.5 py-0.5 rounded">{response.npsScore}/10</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-olive-400">
                      {new Date(response.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Answers */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-olive-800">Answers Payload</h4>
                      <div className="space-y-1.5">
                        {response.answers.map((answer) => (
                          <div key={answer.questionId} className="text-sm rounded border border-olive-100/65 bg-white p-2">
                            <div className="flex items-center justify-between text-xs text-olive-500">
                              <span className="font-medium truncate max-w-[200px]" title={answer.questionTitle}>
                                {answer.questionTitle}
                              </span>
                              <span className="bg-olive-50 px-1 rounded text-[11px] font-mono">{answer.questionType}</span>
                            </div>
                            <div className="mt-1 font-semibold text-olive-900">
                              {typeof answer.value === 'object' && answer.value !== null
                                ? JSON.stringify(answer.value, null, 2)
                                : String(answer.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata & Raw Details */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-olive-800">Telemetry & Context</h4>
                      <div className="rounded border border-olive-100/65 bg-olive-50/40 p-2.5 space-y-1.5 text-xs text-olive-700">
                        {response.metadata && Object.keys(response.metadata).length > 0 ? (
                          Object.entries(response.metadata).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-4 py-0.5 border-b border-olive-100 last:border-0">
                              <span className="font-mono text-olive-500 shrink-0">{key}:</span>
                              <span className="font-medium text-olive-900 text-right break-all truncate max-w-[240px]" title={String(val)}>
                                {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-olive-400 italic">No additional telemetry sent.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-olive-100 bg-olive-50/50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-md bg-olive-700 hover:bg-olive-800 text-white px-4 py-2 text-sm font-bold shadow transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExperienceModal({
  experience,
  onClose,
  onSave,
}: {
  experience: Guide;
  onClose: () => void;
  onSave: (updated: Guide & { frequencyRules?: FrequencyRules }) => Promise<void>;
}): JSX.Element {
  const [title, setTitle] = useState(experience.title);
  const [description, setDescription] = useState(experience.description ?? '');
  const [type, setType] = useState<GuideType>(experience.type);
  const [priority, setPriority] = useState<GuidePriority>(experience.priority ?? 'MEDIUM');
  const [steps, setSteps] = useState<GuideStep[]>(experience.steps ?? []);
  const [rules, setRules] = useState<TargetingRuleGroup>(experience.targetingRules ?? defaultRules());
  const [saving, setSaving] = useState(false);

  const mode = experience.type === 'SURVEY' ? 'survey' : experience.type === 'CHECKLIST' ? 'checklist' : 'guide';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...experience, title, description, type, priority, steps, targetingRules: rules, frequencyRules: defaultFrequency });
    } finally {
      setSaving(false);
    }
  };

  const experienceMock: Guide = {
    ...experience,
    title,
    description,
    type,
    priority,
    steps,
    targetingRules: rules
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-6xl rounded border border-olive-200 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">Edit {experience.type === 'SURVEY' ? 'Survey' : experience.type === 'CHECKLIST' ? 'Checklist' : 'Guide'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-olive-400 hover:bg-olive-100" type="button"><X size={18} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Title" value={title} onChange={setTitle} />
                {mode === 'guide' && (
                  <SelectInput label="Type" value={type} values={guideTypes} onChange={(v) => setType(v as GuideType)} />
                )}
                <TextInput label="Description" value={description} onChange={setDescription} />
                {mode !== 'checklist' && (
                  <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
                )}
              </div>
              <StepEditor steps={steps} onChange={setSteps} mode={mode} />
              <UrlTargeting rules={rules} onChange={setRules} />
              <RuleBuilder rules={rules} onChange={setRules} />
            </div>
            <div>
              <Preview guide={experienceMock} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <button onClick={onClose} className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" type="button">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            type="button"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateExperienceModal({
  type,
  onClose,
  onSave,
}: {
  type: 'guide' | 'survey' | 'checklist';
  onClose: () => void;
  onSave: (payload: GuidePayload | SurveyPayload | ChecklistPayload) => Promise<void>;
}): JSX.Element {
  const [title, setTitle] = useState(
    type === 'guide'
      ? 'New onboarding guide'
      : type === 'survey'
      ? 'NPS pulse'
      : 'Activation checklist'
  );
  const [description, setDescription] = useState(
    type === 'guide'
      ? 'Introduce the next best action.'
      : type === 'survey'
      ? 'Ask users how likely they are to recommend Pristine.'
      : 'Help users reach the first success milestone.'
  );
  const [guideType, setGuideType] = useState<GuideType>('MODAL');
  const [priority, setPriority] = useState<GuidePriority>('MEDIUM');
  const [steps, setSteps] = useState<GuideStep[]>(() => {
    if (type === 'survey') return [newSurveyQuestion('NPS')];
    if (type === 'checklist') return [newChecklistItem()];
    return [newStep()];
  });
  const [rules, setRules] = useState<TargetingRuleGroup>(defaultRules());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === 'survey') {
        await onSave({
          title,
          description,
          priority,
          questions: steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as SurveyPayload);
      } else if (type === 'checklist') {
        await onSave({
          title,
          description,
          items: steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as ChecklistPayload);
      } else {
        await onSave({
          title,
          description,
          type: guideType,
          priority,
          steps,
          targetingRules: rules,
          frequencyRules: defaultFrequency
        } as GuidePayload);
      }
    } finally {
      setSaving(false);
    }
  };

  const experienceMock: Guide = {
    id: 'preview',
    title,
    description,
    type: type === 'survey' ? 'SURVEY' : type === 'checklist' ? 'CHECKLIST' : guideType,
    priority,
    steps,
    targetingRules: rules,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-6xl rounded border border-olive-200 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">Create {type === 'guide' ? 'Guide' : type === 'survey' ? 'Survey' : 'Checklist'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-olive-400 hover:bg-olive-100" type="button"><X size={18} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <TextInput label="Title" value={title} onChange={setTitle} />
                {type === 'guide' && (
                  <SelectInput label="Type" value={guideType} values={guideTypes} onChange={(v) => setGuideType(v as GuideType)} />
                )}
                <TextInput label="Description" value={description} onChange={setDescription} />
                {type !== 'checklist' && (
                  <SelectInput label="Priority" value={priority} values={priorities} onChange={(v) => setPriority(v as GuidePriority)} />
                )}
              </div>
              <StepEditor steps={steps} onChange={setSteps} mode={type} />
              <UrlTargeting rules={rules} onChange={setRules} />
              <RuleBuilder rules={rules} onChange={setRules} />
            </div>
            <div>
              <Preview guide={experienceMock} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <button onClick={onClose} className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" type="button">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded bg-slate-900 hover:bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            type="button"
          >
            <Save size={14} />
            {saving ? 'Creating…' : `Create ${type === 'guide' ? 'Guide' : type === 'survey' ? 'Survey' : 'Checklist'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  experience
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  experience: Guide | null;
}): JSX.Element | null {
  if (!isOpen || !experience) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Publish Experience?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to publish <span className="font-semibold text-slate-800">"{experience.title}"</span>? 
          This will make it live and visible to matching users immediately.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow"
          >
            Publish Live
          </button>
        </div>
      </div>
    </div>
  );
}

export default EngagementPage;
