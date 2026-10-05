import { Clock3, PauseCircle, ShieldAlert } from 'lucide-react';

import type { Task, TaskSlaState } from '@/types/task';

interface SlaIndicatorProps {
  compact?: boolean;
  task: Task;
}

const stateClass: Record<TaskSlaState, string> = {
  HEALTHY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NEAR_BREACH: 'bg-amber-50 text-amber-700 border-amber-200',
  BREACHED: 'bg-red-50 text-red-700 border-red-200',
  PAUSED: 'bg-olive-100 text-olive-600 border-olive-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const formatRemaining = (dueAt: string | null): string => {
  if (!dueAt) return 'No SLA';
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return 'Breached';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)}d`;
};

const progressPercent = (task: Task): number => {
  if (!task.slaResolutionDueAt || !task.slaResponseDueAt) return 0;
  const created = new Date(task.assignedAt).getTime();
  const due = new Date(task.slaResolutionDueAt).getTime();
  const total = Math.max(1, due - created);
  const elapsed = Math.max(0, Date.now() - created - (task.totalPausedDuration ?? 0));
  return Math.min(100, Math.round((elapsed / total) * 100));
};

function SlaIndicator({ compact = false, task }: SlaIndicatorProps): JSX.Element {
  const state = task.currentSlaState ?? 'HEALTHY';
  const breached = task.responseBreached || task.resolutionBreached;
  const remaining = formatRemaining(task.slaResolutionDueAt);
  const pct = progressPercent(task);

  return (
    <div className="grid gap-1.5 min-w-0">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-black uppercase tracking-wider ${stateClass[state]}`}>
        {state === 'PAUSED' ? <PauseCircle size={12} /> : breached ? <ShieldAlert size={12} /> : <Clock3 size={12} />}
        <span>{state.replace('_', ' ')}</span>
        {!compact && <span className="opacity-70">Resolution {remaining}</span>}
      </div>
      {!compact && (
        <div className="h-1.5 bg-olive-100 rounded-full overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all',
              breached ? 'bg-red-500' : state === 'NEAR_BREACH' ? 'bg-amber-500' : 'bg-emerald-500'
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default SlaIndicator;
