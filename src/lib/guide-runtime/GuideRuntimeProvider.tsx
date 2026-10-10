import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Megaphone, MousePointerClick, Sparkles, X, Star, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import {
  evaluateRuntime,
  submitSurveyResponse,
  trackEngagementEvent
} from '@/lib/engagement/api';
import type { EngagementEventName, Guide, GuideStep } from '@/lib/guides/types';

interface GuideRuntimeProviderProps {
  children: ReactNode;
}

interface RuntimeEventDetail {
  eventName: string;
  properties?: Record<string, unknown>;
}

const SESSION_STARTED_AT = Date.now();
/** Mouse-leave fires repeatedly; ask the server at most this often. */
const EXIT_INTENT_THROTTLE_MS = 30_000;
const IDLE_TIMEOUT_MS = 15_000;

const integrationOf = (guide: Guide): string | undefined => {
  const fromGuide = guide.sdkIntegrationId || guide.metadata?.sdkIntegrationId;
  if (typeof fromGuide === 'string' && fromGuide) return fromGuide;
  try {
    return localStorage.getItem('active_sdk_integration_id') || undefined;
  } catch {
    return undefined;
  }
};

const newRunKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isEmptyAnswer = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && value !== null && !('consented' in value) && Object.keys(value).length === 0);

export function GuideRuntimeProvider({ children }: GuideRuntimeProviderProps): JSX.Element {
  const location = useLocation();
  const { user, session } = useAuth();
  const [experiences, setExperiences] = useState<Guide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const evaluatingRef = useRef(false);
  /** An evaluation requested while one was in flight; null = plain refresh. */
  const pendingRef = useRef<RuntimeEventDetail | null | undefined>(undefined);
  const activeGuideRef = useRef<Guide | null>(null);
  /** Experiences finished (completed or dismissed) on this page load. */
  const handledRef = useRef<Set<string>>(new Set());
  const shownRef = useRef<string | null>(null);
  const startedRef = useRef<Set<string>>(new Set());

  const activeGuide = experiences[activeIndex] ?? null;
  activeGuideRef.current = activeGuide;

  const evaluate = useCallback(
    async (event?: RuntimeEventDetail) => {
      if (!user) {
        return;
      }
      if (evaluatingRef.current) {
        // Keep the request that carries an event; a plain refresh is implied.
        if (event || pendingRef.current === undefined) {
          pendingRef.current = event ?? null;
        }
        return;
      }

      evaluatingRef.current = true;
      try {
        let activeIntegration: string | undefined;
        try {
          activeIntegration = localStorage.getItem('active_sdk_integration_id') || undefined;
        } catch {
          activeIntegration = undefined;
        }
        const result = await evaluateRuntime({
          userId: user.id,
          sessionId: session?.sessionId,
          sdkIntegrationId: activeIntegration,
          url: window.location.href,
          referrer: document.referrer,
          role: 'ADMIN',
          plan: 'default',
          userProperties: {
            email: user.email,
            name: user.name
          },
          session: {
            durationSeconds: Math.floor((Date.now() - SESSION_STARTED_AT) / 1000),
            count: Number(sessionStorage.getItem('sync-session-count') ?? '1'),
            engagementScore: Math.min(100, Math.floor((Date.now() - SESSION_STARTED_AT) / 6000))
          },
          eventName: event?.eventName,
          eventProperties: event?.properties
        });

        const active = activeGuideRef.current;
        const isManual = event?.eventName === 'manual_tour' && result.length > 0;
        const fresh = result.filter((e) => !handledRef.current.has(e.id) && e.id !== active?.id);
        if (active && !isManual) {
          // Re-evaluation (navigation, idle, exit intent) must not interrupt
          // what the user is looking at; new experiences queue behind it.
          setExperiences([active, ...fresh]);
          setActiveIndex(0);
        } else {
          setExperiences(isManual ? result : fresh);
          setActiveIndex(0);
          setStepIndex(0);
        }
      } catch {
        // Keep whatever is on screen; the next evaluation will retry.
      } finally {
        evaluatingRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = undefined;
        if (pending !== undefined) {
          void evaluate(pending ?? undefined);
        }
      }
    },
    [session?.sessionId, user]
  );

  useEffect(() => {
    const count = Number(sessionStorage.getItem('sync-session-count') ?? '0') + 1;
    sessionStorage.setItem('sync-session-count', String(count));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void evaluate();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [evaluate, location.pathname, location.search]);

  useEffect(() => {
    const listener = () => {
      void evaluate();
    };
    window.addEventListener('sync:active-integration-changed', listener);
    return () => window.removeEventListener('sync:active-integration-changed', listener);
  }, [evaluate]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeEventDetail>).detail;
      if (detail?.eventName) {
        void evaluate(detail);
      }
    };
    window.addEventListener('sync:analytics-event', listener);
    return () => window.removeEventListener('sync:analytics-event', listener);
  }, [evaluate]);

  // Exit Intent trigger
  useEffect(() => {
    let lastFired = 0;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 50 && Date.now() - lastFired > EXIT_INTENT_THROTTLE_MS) {
        lastFired = Date.now();
        void evaluate({ eventName: 'exit_intent' });
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [evaluate]);

  // Idle Timeout trigger
  useEffect(() => {
    let idleTimer: number;

    const resetTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        void evaluate({ eventName: 'idle_timeout' });
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });
    resetTimer();

    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [evaluate]);

  const track = useCallback(
    async (eventName: EngagementEventName, guide: Guide, step?: GuideStep, properties?: Record<string, unknown>) => {
      const surveyId = typeof guide.metadata?.surveyId === 'string' ? guide.metadata.surveyId : undefined;
      const checklistId = typeof guide.metadata?.checklistId === 'string' ? guide.metadata.checklistId : undefined;
      try {
        await trackEngagementEvent({
          eventName,
          sdkIntegrationId: integrationOf(guide),
          guideId: surveyId || checklistId ? undefined : guide.id,
          surveyId,
          checklistId,
          stepId: step?.id,
          userId: user?.id,
          sessionId: session?.sessionId,
          properties
        });
      } catch {
        // Tracking is best effort; it must never break the experience.
      }
    },
    [session?.sessionId, user?.id]
  );

  // One impression per display: drives frequency caps and the cooldown.
  useEffect(() => {
    if (activeGuide && shownRef.current !== activeGuide.id) {
      shownRef.current = activeGuide.id;
      void track('guide_shown', activeGuide);
    }
    if (!activeGuide) {
      shownRef.current = null;
    }
  }, [activeGuide, track]);

  const closeActive = useCallback(
    (completed: boolean) => {
      if (!activeGuide) {
        return;
      }

      const eventName = completed
        ? activeGuide.type === 'SURVEY'
          ? 'survey_completed'
          : 'guide_completed'
        : activeGuide.type === 'SURVEY'
          ? 'survey_abandoned'
          : 'guide_dismissed';

      handledRef.current.add(activeGuide.id);
      void track(eventName, activeGuide);
      setActiveIndex((current) => current + 1);
      setStepIndex(0);
    },
    [activeGuide, track]
  );

  const runtimeOverlay = useMemo(() => {
    if (!activeGuide) {
      return null;
    }

    return (
      <GuideOverlay
        key={activeGuide.id}
        guide={activeGuide}
        stepIndex={stepIndex}
        onDismiss={() => closeActive(false)}
        onComplete={() => closeActive(true)}
        onNext={() => {
          const step = activeGuide.steps[stepIndex];
          if (!startedRef.current.has(activeGuide.id)) {
            startedRef.current.add(activeGuide.id);
            void track('guide_started', activeGuide, step);
          }
          void track('step_completed', activeGuide, step);
          setStepIndex((current) => Math.min(current + 1, activeGuide.steps.length - 1));
        }}
        onPrevious={() => setStepIndex((current) => Math.max(current - 1, 0))}
        onStepViewed={(step) => void track('step_viewed', activeGuide, step)}
        onSurveySubmit={async (answers, metadata, idempotencyKey) => {
          const surveyId = typeof activeGuide.metadata?.surveyId === 'string' ? activeGuide.metadata.surveyId : undefined;
          const integrationId = integrationOf(activeGuide);
          if (surveyId && integrationId) {
            // Throws on failure so the survey stays open and can be retried.
            await submitSurveyResponse(integrationId, surveyId, {
              userId: user?.id,
              sessionId: session?.sessionId,
              answers,
              metadata,
              idempotencyKey
            });
          } else {
            await track('survey_completed', activeGuide, undefined, { answers, idempotencyKey, ...metadata });
          }
          handledRef.current.add(activeGuide.id);
          setActiveIndex((current) => current + 1);
          setStepIndex(0);
        }}
        onTrack={(eventName, step, properties) => void track(eventName, activeGuide, step, properties)}
      />
    );
  }, [activeGuide, closeActive, session?.sessionId, stepIndex, track, user?.id]);

  return (
    <>
      {children}
      {runtimeOverlay}
    </>
  );
}

interface GuideOverlayProps {
  guide: Guide;
  stepIndex: number;
  onDismiss: () => void;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStepViewed: (step: GuideStep) => void;
  onSurveySubmit: (answers: Record<string, unknown>, metadata: Record<string, unknown> | undefined, idempotencyKey: string) => Promise<void>;
  onTrack: (eventName: EngagementEventName, step?: GuideStep, properties?: Record<string, unknown>) => void;
}

function GuideOverlay({
  guide,
  stepIndex,
  onDismiss,
  onComplete,
  onNext,
  onPrevious,
  onStepViewed,
  onSurveySubmit,
  onTrack
}: GuideOverlayProps): JSX.Element | null {
  const isSurvey = guide.type === 'SURVEY';
  
  // Survey-specific state
  const [currentSurveyIdx, setCurrentSurveyIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([0]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  // One key per display, reused on retries so a resubmit cannot duplicate.
  const runKeyRef = useRef<string>(newRunKey());
  const onStepViewedRef = useRef(onStepViewed);
  onStepViewedRef.current = onStepViewed;
  const [completedItems, setCompletedItems] = useState<Set<string>>(
    () =>
      new Set(
        Array.isArray(guide.metadata?.completedItemIds)
          ? (guide.metadata.completedItemIds as unknown[]).filter((id): id is string => typeof id === 'string')
          : []
      )
  );
  const [hotspotOpen, setHotspotOpen] = useState(false);

  // Track survey start once
  const startTracked = useRef(false);
  useEffect(() => {
    if (isSurvey && !startTracked.current) {
      onTrack('survey_started');
      startTracked.current = true;
      startedAtRef.current = Date.now();
    }
  }, [isSurvey, onTrack, guide.id]);

  const step = isSurvey
    ? guide.steps[currentSurveyIdx]
    : (guide.steps[stepIndex] ?? guide.steps[0]);

  const anchor = useAnchorRect(step?.selector);

  // One step_viewed per step change (not per re-render).
  const stepId = step?.id;
  useEffect(() => {
    if (step) {
      onStepViewedRef.current(step);
    }
  }, [stepId]);

  if (guide.type === 'BANNER') {
    return (
      <div className="fixed left-0 right-0 top-0 z-[10000] border-b border-olive-200 bg-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Megaphone size={18} className="shrink-0 text-olive-700" />
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-olive-950">{guide.title}</p>
              {guide.description && <p className="m-0 text-xs text-olive-500">{guide.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md bg-olive-700 px-3 py-1.5 text-xs font-bold text-white cursor-pointer hover:bg-olive-800 transition" onClick={() => { onTrack('banner_clicked'); onComplete(); }} type="button">
              Open
            </button>
            <button className="rounded-md p-1.5 text-olive-500 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (guide.type === 'HOTSPOT') {
    const style = anchor
      ? { left: anchor.left + anchor.width - 8, top: anchor.top - 8 }
      : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
    return (
      <>
        <button
          aria-expanded={hotspotOpen}
          className="fixed z-[10000] flex h-7 w-7 items-center justify-center rounded-full bg-accent-amber text-white shadow-xl ring-8 ring-amber-300/30 cursor-pointer"
          onClick={() => {
            if (!hotspotOpen) onTrack('hotspot_opened', step);
            setHotspotOpen((open) => !open);
          }}
          style={style}
          title={guide.title}
          type="button"
        >
          <Sparkles size={15} />
        </button>
        {hotspotOpen && (
          <div className="fixed z-[10000] w-[280px] rounded-lg border border-olive-200 bg-white p-4 shadow-2xl" style={buildPopoverStyle(anchor, step?.placement ?? 'BOTTOM')}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-sm font-bold text-olive-950">{step?.title ?? guide.title}</p>
                {(step?.description || guide.description) && (
                  <p className="m-0 mt-1 text-xs text-olive-500">{step?.description || guide.description}</p>
                )}
              </div>
              <button className="rounded-md p-1 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
                <X size={14} />
              </button>
            </div>
            <button className="w-full rounded-md bg-olive-700 px-3 py-1.5 text-xs font-bold text-white cursor-pointer hover:bg-olive-800 transition" onClick={onComplete} type="button">
              Got it
            </button>
          </div>
        )}
      </>
    );
  }

  if (guide.type === 'SMART_TIP' || guide.type === 'TOUR') {
    const style = buildPopoverStyle(anchor, step?.placement);
    return (
      <>
        {anchor && <Spotlight rect={anchor} />}
        <div className="fixed z-[10000] w-[320px] rounded-lg border border-olive-200 bg-white p-4 shadow-2xl" style={style}>
          <GuideCard
            guide={guide}
            step={step}
            stepIndex={stepIndex}
            onDismiss={onDismiss}
            onComplete={onComplete}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        </div>
      </>
    );
  }

  if (guide.type === 'CHECKLIST') {
    return (
      <div className="fixed bottom-5 right-5 z-[10000] w-[360px] rounded-lg border border-olive-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-bold text-olive-950">{guide.title}</p>
            {guide.description && <p className="m-0 mt-1 text-xs text-olive-500">{guide.description}</p>}
          </div>
          <button className="rounded-md p-1 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-2">
          {guide.steps.map((item) => {
            const done = completedItems.has(item.id);
            return (
            <button
              aria-pressed={done}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm cursor-pointer ${done ? 'border-olive-200 bg-olive-50' : 'border-olive-100 hover:bg-olive-50'}`}
              disabled={done}
              key={item.id}
              onClick={() => {
                setCompletedItems((current) => new Set(current).add(item.id));
                onTrack('step_completed', item, { checklistItemId: item.id });
              }}
              type="button"
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? 'border-olive-700 bg-olive-700 text-white' : 'border-olive-300 text-transparent'}`}>
                <Check size={13} />
              </span>
              <span>
                <span className="block font-semibold text-olive-900">{item.title}</span>
                {item.description && <span className="block text-xs text-olive-500">{item.description}</span>}
              </span>
            </button>
            );
          })}
        </div>
        {guide.steps.length > 0 && (
          <p className="m-0 mt-3 text-xs font-semibold text-olive-500">
            {completedItems.size} of {guide.steps.length} done
          </p>
        )}
        <button className="mt-4 w-full rounded-md bg-olive-700 px-3 py-2 text-sm font-bold text-white cursor-pointer hover:bg-olive-800 transition" onClick={onComplete} type="button">
          Done
        </button>
      </div>
    );
  }

  if (isSurvey) {
    if (!step) {
      return null;
    }

    const isLast = currentSurveyIdx >= guide.steps.length - 1;
    const answer = surveyAnswers[step.id];

    // Branching and navigation helper
    const handleSurveyNext = () => {
      // 1. Validation
      if (submitting) return;
      if (step.required && isEmptyAnswer(answer)) {
        setValidationError('This question is required.');
        return;
      }
      setValidationError(null);
      
      // Track step completed
      onTrack('step_completed', step);

      // 2. Evaluate branching
      let nextIdx = currentSurveyIdx + 1;
      if (step.branchConditions && step.branchConditions.conditions) {
        const conds = step.branchConditions.conditions;
        for (const cond of conds) {
          const op = cond.operator || 'EQUALS';
          const val = cond.value;
          let matched = false;

          if (op === 'EQUALS' && answer === val) matched = true;
          else if (op === 'NOT_EQUALS' && answer !== val) matched = true;
          else if (op === 'GREATER_THAN' && Number(answer) > Number(val)) matched = true;
          else if (op === 'LESS_THAN' && Number(answer) < Number(val)) matched = true;
          else if (op === 'CONTAINS' && Array.isArray(answer) && answer.includes(val)) matched = true;
          else if (op === 'IN' && Array.isArray(val) && val.includes(answer)) matched = true;

          if (matched) {
            const targetId = cond.metadata?.nextStepId || cond.metadata?.branchTo;
            if (targetId === 'SUBMIT') {
              nextIdx = -1;
              break;
            }
            const foundIdx = guide.steps.findIndex((s) => s.id === targetId);
            if (foundIdx !== -1) {
              nextIdx = foundIdx;
              break;
            }
          }
        }
      }

      if (nextIdx === -1 || nextIdx >= guide.steps.length) {
        // Submit survey with metadata containing completion duration
        const metadata = {
          startedAt: new Date(startedAtRef.current).toISOString(),
          completionTimeSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000)
        };
        setSubmitting(true);
        onSurveySubmit(surveyAnswers, metadata, runKeyRef.current)
          .catch((error: unknown) => {
            const message =
              (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'Your answers could not be sent. Please try again.';
            setValidationError(message);
          })
          .finally(() => setSubmitting(false));
      } else {
        setHistory((prev) => [...prev, nextIdx]);
        setCurrentSurveyIdx(nextIdx);
      }
    };

    const handleSurveyBack = () => {
      if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop(); // remove current index
        const prevIdx = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        setCurrentSurveyIdx(prevIdx);
        setValidationError(null);
      }
    };

    // Formats: 'MODAL' | 'BOTTOM_POPUP' | 'SLIDE_OUT' | 'BANNER' | 'FLOATING_CARD'
    const format = (guide.metadata?.format as string) || 'MODAL';
    const primaryColor = (guide.theme?.primaryColor as string) || '#0f172a';
    const textColor = (guide.theme?.textColor as string) || '#0f172a';
    const backgroundColor = (guide.theme?.backgroundColor as string) || '#ffffff';

    const outerStyle = {
      backgroundColor,
      color: textColor,
    };

    const shellClasses =
      format === 'BOTTOM_POPUP'
        ? 'fixed bottom-5 right-5 z-[10000] w-[420px] rounded-xl border border-olive-200 shadow-2xl p-6 transition-all duration-300'
        : format === 'SLIDE_OUT'
          ? 'fixed right-0 top-0 bottom-0 z-[10000] w-[460px] border-l border-olive-200 shadow-2xl p-6 transition-all duration-300 overflow-y-auto'
          : format === 'BANNER'
            ? 'fixed top-0 left-0 right-0 z-[10000] border-b border-olive-200 shadow-lg p-5 transition-all duration-300'
            : format === 'FLOATING_CARD'
              ? 'fixed bottom-5 left-5 z-[10000] w-[380px] rounded-xl border border-olive-200 shadow-xl p-6 transition-all duration-300'
              : 'w-full max-w-lg rounded-xl border border-olive-200 shadow-2xl p-6 relative'; // MODAL default

    const surveyContent = (
      <div style={outerStyle} className={shellClasses}>
        {format === 'MODAL' && (
          <button className="absolute right-4 top-4 rounded-md p-1.5 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
            <X size={16} />
          </button>
        )}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="m-0 text-lg font-bold text-olive-950" style={{ color: textColor }}>{guide.title}</p>
            {guide.description && <p className="m-0 mt-1 text-sm text-olive-500">{guide.description}</p>}
          </div>
          {format !== 'MODAL' && (
            <button className="rounded-md p-1.5 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mb-5">
          <div className="flex justify-between items-center text-xs text-olive-500 mb-1.5 font-semibold">
            <span>Question {history.length}</span>
            <span>Progress {Math.round((history.length / guide.steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-olive-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(history.length / guide.steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-full"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>

        {/* Question content with page transition animation */}
        <div className="min-h-[160px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <SurveyQuestionField
                question={step}
                value={answer}
                onChange={(value) => {
                  setSurveyAnswers((current) => ({ ...current, [step.id]: value }));
                  setValidationError(null);
                }}
                primaryColor={primaryColor}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {validationError && (
          <p className="text-red-600 text-xs font-semibold mt-2">{validationError}</p>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-olive-100 pt-4">
          <button
            className="rounded-md border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            disabled={history.length === 1}
            onClick={handleSurveyBack}
            type="button"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            className="rounded-md px-5 py-2 text-sm font-bold text-white flex items-center gap-1 cursor-pointer hover:opacity-90 transition"
            style={{ backgroundColor: primaryColor }}
            disabled={submitting}
            onClick={handleSurveyNext}
            type="button"
          >
            {submitting ? 'Sending…' : isLast ? 'Submit' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );

    if (format === 'MODAL') {
      return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs">
          {surveyContent}
        </div>
      );
    }

    return surveyContent;
  }

  return (
    <ModalShell onDismiss={onDismiss}>
      <GuideCard
        guide={guide}
        step={step}
        stepIndex={stepIndex}
        onDismiss={onDismiss}
        onComplete={onComplete}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </ModalShell>
  );
}

function GuideCard({
  guide,
  step,
  stepIndex,
  onDismiss,
  onComplete,
  onNext,
  onPrevious
}: {
  guide: Guide;
  step?: GuideStep;
  stepIndex: number;
  onDismiss: () => void;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
}): JSX.Element {
  const hasSteps = guide.steps.length > 0;
  const isLast = !hasSteps || stepIndex >= guide.steps.length - 1;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-olive-700 text-white">
            <MousePointerClick size={16} />
          </span>
          <div>
            <p className="m-0 text-base font-bold text-olive-950">{step?.title ?? guide.title}</p>
            {(step?.description || guide.description) && (
              <p className="m-0 mt-1 text-sm text-olive-500">{step?.description ?? guide.description}</p>
            )}
          </div>
        </div>
        <button className="rounded-md p-1 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
          <X size={16} />
        </button>
      </div>
      {hasSteps && (
        <div className="mb-4 h-1.5 rounded-full bg-olive-100">
          <div className="h-1.5 rounded-full bg-olive-700" style={{ width: `${((stepIndex + 1) / guide.steps.length) * 100}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <button className="rounded-md border border-olive-200 p-2 text-olive-600 disabled:opacity-30 cursor-pointer" disabled={stepIndex === 0} onClick={onPrevious} title="Previous" type="button">
          <ChevronLeft size={16} />
        </button>
        <button className="rounded-md bg-olive-700 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-olive-800 transition" onClick={isLast ? onComplete : onNext} type="button">
          {isLast ? 'Complete' : 'Next'}
        </button>
        <button className="rounded-md border border-olive-200 p-2 text-olive-600 disabled:opacity-30 cursor-pointer" disabled={isLast} onClick={onNext} title="Next" type="button">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function SurveyQuestionField({
  question,
  value,
  onChange,
  primaryColor
}: {
  question: GuideStep;
  value: unknown;
  onChange: (value: unknown) => void;
  primaryColor?: string;
}): JSX.Element {
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-lg border border-olive-200 bg-white px-3 py-2.5 text-sm text-olive-900 focus:border-olive-500 focus:outline-none transition shadow-xs';

  const triggerChange = (val: unknown) => {
    onChange(val);
  };

  // NPS Scale 0-10
  if (question.type === 'NPS') {
    const activeVal = typeof value === 'number' ? value : null;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex flex-wrap justify-between gap-1 mt-2">
          {Array.from({ length: 11 }).map((_, i) => {
            const isSelected = activeVal === i;
            return (
              <button
                key={i}
                type="button"
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'border-olive-200 text-olive-700 bg-white hover:bg-olive-50'
                }`}
                style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                onClick={() => triggerChange(i)}
              >
                {i}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-olive-400 font-bold px-1">
          <span>Not likely at all</span>
          <span>Extremely likely</span>
        </div>
      </div>
    );
  }

  // Rating Stars 1-5
  if (question.type === 'CSAT' || question.type === 'RATING_SCALE') {
    const maxVal = question.max ?? (question.type === 'CSAT' ? 5 : 10);
    const activeVal = typeof value === 'number' ? value : null;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex items-center gap-2 mt-2 justify-center">
          {Array.from({ length: maxVal }).map((_, i) => {
            const starVal = i + 1;
            const isFilled = activeVal !== null && starVal <= activeVal;
            return (
              <button
                key={i}
                type="button"
                className="p-1 cursor-pointer transition hover:scale-110"
                onClick={() => triggerChange(starVal)}
              >
                <Star
                  size={32}
                  className={`transition-colors duration-150 ${
                    isFilled
                      ? 'fill-amber-400 stroke-amber-500'
                      : 'stroke-olive-300 fill-transparent hover:stroke-amber-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
        {question.type === 'CSAT' && (
          <div className="flex justify-between text-[11px] text-olive-400 font-bold px-4">
            <span>Very Unsatisfied</span>
            <span>Very Satisfied</span>
          </div>
        )}
      </div>
    );
  }

  // Emoji Scale 😡🙁😐🙂😀
  if (question.type === 'EMOJI') {
    const emojis = ['😡', '🙁', '😐', '🙂', '😀'];
    const activeVal = typeof value === 'number' ? value : null;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex items-center justify-around gap-2 mt-3">
          {emojis.map((emoji, i) => {
            const index = i + 1;
            const isSelected = activeVal === index;
            return (
              <button
                key={i}
                type="button"
                className={`text-3xl p-2 rounded-xl transition cursor-pointer hover:scale-125 hover:bg-olive-50 ${
                  isSelected ? 'bg-olive-100 ring-2 ring-olive-400' : ''
                }`}
                onClick={() => triggerChange(index)}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // CES (1-7 Scale) or Opinion Scale
  if (question.type === 'CES' || question.type === 'OPINION_SCALE') {
    const minVal = question.min ?? 1;
    const maxVal = Math.max(minVal, question.max ?? (question.type === 'CES' ? 7 : 5));
    const activeVal = typeof value === 'number' ? value : null;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex justify-between gap-1.5 mt-2">
          {Array.from({ length: maxVal - minVal + 1 }).map((_, i) => {
            const num = minVal + i;
            const isSelected = activeVal === num;
            return (
              <button
                key={i}
                type="button"
                className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition cursor-pointer ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'border-olive-200 text-olive-700 bg-white hover:bg-olive-50'
                }`}
                style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                onClick={() => triggerChange(num)}
              >
                {num}
              </button>
            );
          })}
        </div>
        {question.type === 'CES' && (
          <div className="flex justify-between text-[11px] text-olive-400 font-bold px-1">
            <span>Very Difficult</span>
            <span>Very Easy</span>
          </div>
        )}
      </div>
    );
  }

  // Yes / No
  if (question.type === 'YES_NO') {
    const activeVal = value;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex gap-4 mt-2">
          {['Yes', 'No'].map((option) => {
            const isSelected = activeVal === option;
            return (
              <button
                key={option}
                type="button"
                className={`flex-1 py-3 border rounded-xl font-bold text-sm cursor-pointer transition ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'border-olive-200 text-olive-700 bg-white hover:bg-olive-50'
                }`}
                style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                onClick={() => triggerChange(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Contact Permission
  if (question.type === 'CONTACT') {
    const activeVal = value as { consented: string; email?: string } | undefined;
    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="flex gap-4 mt-2">
          {['Yes', 'No'].map((option) => {
            const isSelected = activeVal?.consented === option;
            return (
              <button
                key={option}
                type="button"
                className={`flex-1 py-2.5 border rounded-lg font-bold text-sm cursor-pointer transition ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'border-olive-200 text-olive-700 bg-white hover:bg-olive-50'
                }`}
                style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                onClick={() => triggerChange({ consented: option, email: activeVal?.email || '' })}
              >
                {option}
              </button>
            );
          })}
        </div>
        {activeVal?.consented === 'Yes' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
          >
            <label className="text-xs text-olive-700 font-semibold mb-1 block">Your Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="name@example.com"
              value={activeVal.email || ''}
              onChange={(e) => triggerChange({ consented: 'Yes', email: e.target.value })}
            />
          </motion.div>
        )}
      </div>
    );
  }

  // File Upload
  if (question.type === 'FILE_UPLOAD') {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        setFileProgress(10);
        const interval = setInterval(() => {
          setFileProgress((prev) => {
            if (prev === null || prev >= 100) {
              clearInterval(interval);
              triggerChange(file.name);
              return 100;
            }
            return prev + 15;
          });
        }, 150);
      }
    };

    return (
      <div className="grid gap-3">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="mt-2 border-2 border-dashed border-olive-200 rounded-xl p-6 bg-olive-50/50 flex flex-col items-center justify-center transition hover:border-olive-400 relative">
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <CloudUpload size={40} className="text-olive-400 mb-2" />
          <p className="text-xs font-semibold text-olive-700 m-0">Click or drag file here to upload</p>
          <span className="text-[11px] text-olive-400">PDF, PNG, JPG up to 10MB</span>
        </div>

        {fileProgress !== null && (
          <div className="mt-3 p-3 rounded-lg border border-olive-100 bg-white">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-olive-700 truncate max-w-[200px]">{fileName}</span>
              <span className="text-olive-500 font-bold">{fileProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-olive-100 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{ width: `${fileProgress}%`, backgroundColor: primaryColor ?? '#0f172a' }}
              />
            </div>
            {fileProgress === 100 && (
              <span className="text-[11px] text-emerald-600 font-bold mt-1.5 block">✓ Upload complete</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multi Choice (Single Selection)
  if (question.type === 'SINGLE_CHOICE' || question.type === 'DROPDOWN') {
    const activeVal = String(value ?? '');
    return (
      <div className="grid gap-2 text-sm font-semibold text-olive-900">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0 font-normal">{question.description}</p>}
        
        {question.type === 'DROPDOWN' ? (
          <select
            className={inputClass}
            onChange={(event) => triggerChange(event.target.value)}
            value={activeVal}
          >
            <option value="">Select an option</option>
            {(question.options ?? []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <div className="grid gap-2 mt-2">
            {(question.options ?? []).map((option) => {
              const isSelected = activeVal === option;
              return (
                <button
                  key={option}
                  type="button"
                  className={`w-full py-3 px-4 border rounded-xl text-left text-sm transition cursor-pointer ${
                    isSelected
                      ? 'border-transparent font-bold text-white shadow-md'
                      : 'border-olive-200 text-olive-800 bg-white hover:bg-olive-50'
                  }`}
                  style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                  onClick={() => triggerChange(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Multi Choice (Multiple Selection)
  if (question.type === 'MULTI_CHOICE') {
    const currentList = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <div className="grid gap-2 mt-2">
          {(question.options ?? []).map((option) => {
            const isSelected = currentList.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`w-full py-3 px-4 border rounded-xl text-left text-sm transition cursor-pointer flex justify-between items-center ${
                  isSelected
                    ? 'border-transparent font-bold text-white shadow-md'
                    : 'border-olive-200 text-olive-800 bg-white hover:bg-olive-50'
                }`}
                style={isSelected ? { backgroundColor: primaryColor ?? '#0f172a' } : {}}
                onClick={() => {
                  if (isSelected) {
                    triggerChange(currentList.filter((item) => item !== option));
                  } else {
                    triggerChange([...currentList, option]);
                  }
                }}
              >
                <span>{option}</span>
                {isSelected && <Check size={16} className="text-white" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Textarea
  if (question.type === 'TEXTAREA') {
    return (
      <div className="grid gap-2">
        <span className="text-sm font-semibold text-olive-950">{question.title}</span>
        {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
        <textarea
          className={`${inputClass} min-h-[90px] resize-none mt-1`}
          placeholder="Type your response here..."
          onChange={(event) => triggerChange(event.target.value)}
          value={String(value ?? '')}
        />
      </div>
    );
  }

  // Short Text (Default)
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-olive-950">{question.title}</span>
      {question.description && <p className="text-xs text-olive-500 m-0">{question.description}</p>}
      <input
        type="text"
        className={`${inputClass} mt-1`}
        placeholder="Type your response here..."
        onChange={(event) => triggerChange(event.target.value)}
        value={String(value ?? '')}
      />
    </div>
  );
}

function ModalShell({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 px-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-olive-200 bg-white p-6 shadow-2xl relative">
        <button className="absolute right-4 top-4 rounded-md p-1.5 text-olive-400 hover:bg-olive-100 cursor-pointer" onClick={onDismiss} title="Dismiss" type="button">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Spotlight({ rect }: { rect: DOMRect }): JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div className="absolute rounded-lg ring-[9999px] ring-black/35" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
    </div>
  );
}

function useAnchorRect(selector?: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let frame = 0;
    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        setRect(element ? element.getBoundingClientRect() : null);
      });
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    refresh();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      window.cancelAnimationFrame(frame);
    };
  }, [selector]);

  return rect;
}

function buildPopoverStyle(rect: DOMRect | null, placement?: string): CSSProperties {
  if (!rect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  const gap = 12;
  if (placement === 'LEFT') {
    return { left: Math.max(16, rect.left - 332), top: rect.top };
  }
  if (placement === 'RIGHT') {
    return { left: Math.min(window.innerWidth - 336, rect.right + gap), top: rect.top };
  }
  if (placement === 'TOP') {
    return { left: rect.left, top: Math.max(16, rect.top - 220) };
  }
  return { left: Math.min(window.innerWidth - 336, rect.left), top: Math.min(window.innerHeight - 220, rect.bottom + gap) };
}

export const emitEngagementEvent = (eventName: string, properties?: Record<string, unknown>): void => {
  window.dispatchEvent(new CustomEvent<RuntimeEventDetail>('sync:analytics-event', { detail: { eventName, properties } }));
};
