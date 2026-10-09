import type { TaskPriority, TaskStatus } from '@/types/task';

/** Human labels and tones for task statuses, shared by list, board and inspector. */
export const TASK_STATUS_META: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  BACKLOG: { label: 'Backlog', dot: 'bg-olive-300', badge: 'badge-slate' },
  TODO: { label: 'To do', dot: 'bg-olive-400', badge: 'badge-slate' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-amber-400', badge: 'badge-amber' },
  IN_REVIEW: { label: 'In review', dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  BLOCKED: { label: 'Blocked', dot: 'bg-red-500', badge: 'badge-red' },
  DONE: { label: 'Done', dot: 'bg-brand-500', badge: 'badge-green' },
  rolled_over: { label: 'Rolled over', dot: 'bg-olive-300', badge: 'badge-slate' },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; className: string; bars: number }> = {
  CRITICAL: { label: 'Critical', className: 'text-red-600', bars: 4 },
  HIGH: { label: 'High', className: 'text-orange-600', bars: 3 },
  MEDIUM: { label: 'Medium', className: 'text-amber-600', bars: 2 },
  LOW: { label: 'Low', className: 'text-olive-400', bars: 1 },
};

export const statusMeta = (status: string) =>
  TASK_STATUS_META[status as TaskStatus] ?? { label: status.replace(/_/g, ' ').toLowerCase(), dot: 'bg-olive-300', badge: 'badge-slate' };
