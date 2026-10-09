import { Clock3, PauseCircle, ShieldAlert } from 'lucide-react';

import type { Task, TaskSlaState } from '@/types/task';

interface SlaIndicatorProps {
  compact?: boolean;
  task: Task;
}

const stateClass: Record<TaskSlaState, string> = {
  HEALTHY: 'badge-green',
  NEAR_BREACH: 'badge-amber',
  BREACHED: 'badge-red',
  PAUSED: 'badge-slate',
  COMPLETED: 'badge-green'
};

const stateLabel: Record<TaskSlaState, string> = {
  HEALTHY: 'On track',
  NEAR_BREACH: 'Due soon',
  BREACHED: 'SLA breached',
  PAUSED: 'SLA paused',
  COMPLETED: 'SLA met'
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

  const label = stateLabel[state] ?? state;

  if (compact) {
    return (
      <span className={`badge ${stateClass[state]} !h-5 !text-[11px]`} title={`Resolution ${remaining}`}>
        {state === 'PAUSED' ? <PauseCircle size={11} /> : breached ? <ShieldAlert size={11} /> : <Clock3 size={11} />}
        {label}
      </span>
    );
  }

  return (
    <div className="grid gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-olive-700">
          {state === 'PAUSED' ? <PauseCircle size={13} /> : breached ? <ShieldAlert size={13} className="text-red-600" /> : <Clock3 size={13} className="text-olive-400" />}
          {label}
        </span>
        <span className="text-olive-500 tabular-nums">Resolution {remaining}</span>
      </div>
      <div className="h-1 bg-olive-100 rounded-full overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-all',
            breached ? 'bg-red-500' : state === 'NEAR_BREACH' ? 'bg-amber-500' : 'bg-brand-500'
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default SlaIndicator;
