import { AlertCircle, FilePenLine, ListChecks, Trash2, MessageSquare, Ban } from 'lucide-react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import {
  TASK_WORKFLOW_STATUS_OPTIONS,
  type Subtask,
  type Task,
  type TaskWorkflowStatus,
  type TaskPriority
} from '@/types/task';
import { TASK_PRIORITY_META, statusMeta } from '@/utils/taskMeta';
import UserAvatar from './UserAvatar';
import SlaIndicator from './SlaIndicator';

interface TaskCardProps {
  actionTaskId?: string | null;
  availableEpics?: Epic[];
  onCreateSubtask?: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDeleteSubtask?: (task: Task, subtask: Subtask) => void;
  onEditTask?: (task: Task) => void;
  onEditSubtask?: (task: Task, subtask: Subtask) => void;
  onOpenEpicNotes?: (epic: Epic) => void;
  onOpenProjectNotes?: (project: Project) => void;
  onOpenSubtaskNote?: (task: Task, subtask: Subtask) => void;
  onOpenTaskNote?: (task: Task) => void;
  onUpdateEpic?: (task: Task, epicId: string | null) => void;
  onUpdateStatus?: (task: Task, status: TaskWorkflowStatus) => void;
  onUpdateSubtaskStatus?: (task: Task, subtask: Subtask, status: TaskWorkflowStatus) => void;
  epicName?: string;
  projectName?: string;
  task: Task;
  onSelect?: (task: Task) => void;
  onComment?: (task: Task) => void;
  onToggleBlocked?: (task: Task) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
}

/** Signal-strength style priority glyph. */
export function PriorityGlyph({ priority }: { priority?: TaskPriority }): JSX.Element | null {
  if (!priority) return null;
  const meta = TASK_PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.className}`} title={`${meta.label} priority`}>
      {priority === 'CRITICAL' ? (
        <AlertCircle size={13} strokeWidth={2.25} />
      ) : (
        <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
          {[1, 2, 3].map((bar) => (
            <span
              key={bar}
              className={`w-[3px] rounded-[1px] ${bar <= meta.bars ? 'bg-current' : 'bg-olive-200'}`}
              style={{ height: `${bar * 4}px` }}
            />
          ))}
        </span>
      )}
      <span className="text-olive-600">{meta.label}</span>
    </span>
  );
}

function TaskCard({
  actionTaskId,
  onDelete,
  onEditTask,
  onUpdateStatus,
  epicName,
  projectName,
  task,
  onSelect,
  onComment,
  onToggleBlocked,
  isSelected,
  isMultiSelected,
  onToggleSelection
}: TaskCardProps): JSX.Element {
  const completedSubtasksCount = task.subtasks.filter((subtask) => subtask.status === 'DONE').length;
  const status = statusMeta(task.status);
  const isUpdating = actionTaskId === task.id;
  const breached = task.responseBreached || task.resolutionBreached;
  const isDone = task.status === 'DONE';

  const priorityColorClass =
    task.priority === 'CRITICAL'
      ? 'bg-red-50 text-red-700 border-red-200/80'
      : task.priority === 'HIGH'
      ? 'bg-orange-50 text-orange-700 border-orange-200/80'
      : task.priority === 'MEDIUM'
      ? 'bg-amber-50/80 text-amber-700 border-amber-200/70'
      : 'bg-olive-50 text-olive-600 border-olive-200/60';

  return (
    <article
      className={[
        'group relative flex flex-col gap-2.5 p-3.5 transition-all duration-200 rounded-xl bg-white border',
        isSelected
          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 shadow-sm'
          : isMultiSelected
          ? 'border-brand-400 bg-olive-50/80 shadow-xs'
          : 'border-olive-200/80 hover:border-olive-300 hover:shadow-md',
        isUpdating ? 'opacity-60 cursor-wait' : 'cursor-pointer'
      ].join(' ')}
      onClick={() => !isUpdating && onSelect?.(task)}
    >
      {/* Left accent bar for high priority or blocked */}
      {task.isBlocked ? (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-red-500" />
      ) : task.priority === 'CRITICAL' ? (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-red-500" />
      ) : task.priority === 'HIGH' ? (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-orange-400" />
      ) : isSelected ? (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-brand-600" />
      ) : null}

      {/* Floating Actions on Hover */}
      <div className="absolute right-2.5 top-2.5 z-20 hidden group-hover:flex focus-within:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/95 backdrop-blur-md shadow-md border border-olive-200 animate-fadeIn">
        {onEditTask && (
          <button
            aria-label="Edit task"
            className="icon-btn !w-6 !h-6 hover:bg-olive-100 text-olive-600 disabled:opacity-30"
            disabled={!task.permissions.canEdit}
            onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
            title="Edit"
            type="button"
          >
            <FilePenLine size={13} />
          </button>
        )}
        <button
          aria-label="Comments"
          className="icon-btn !w-6 !h-6 hover:bg-olive-100 text-olive-600"
          onClick={(e) => { e.stopPropagation(); onComment?.(task); }}
          title="Comments"
          type="button"
        >
          <MessageSquare size={13} />
        </button>
        {onToggleBlocked && (
          <button
            aria-label={task.isBlocked ? 'Unblock task' : 'Mark blocked'}
            className={`icon-btn !w-6 !h-6 disabled:opacity-30 ${task.isBlocked ? '!text-red-600 bg-red-50' : 'text-olive-600 hover:bg-olive-100'}`}
            disabled={!task.permissions.canEdit}
            onClick={(e) => { e.stopPropagation(); onToggleBlocked(task); }}
            title={task.isBlocked ? 'Unblock' : 'Mark blocked'}
            type="button"
          >
            <Ban size={13} />
          </button>
        )}
        <button
          aria-label="Delete task"
          className="icon-btn !w-6 !h-6 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30"
          disabled={!task.permissions.canDelete}
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          title="Delete"
          type="button"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Header Tags Row (Project, Epic, Blocked) */}
      <div className="flex items-center justify-between gap-2 pr-6">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {onToggleSelection && (
            <input
              aria-label={`Select ${task.title}`}
              type="checkbox"
              checked={isMultiSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelection(task.id)}
              className="w-3.5 h-3.5 accent-brand-600 cursor-pointer shrink-0 rounded transition-opacity"
            />
          )}

          {projectName && (
            <span
              className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-olive-100/80 text-olive-700 border border-olive-200/60 max-w-[120px] truncate"
              title={`Project: ${projectName}`}
            >
              {projectName}
            </span>
          )}

          {epicName && (
            <span
              className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-100 max-w-[120px] truncate"
              title={`Epic: ${epicName}`}
            >
              {epicName}
            </span>
          )}

          {task.isBlocked && (
            <span className="badge badge-red !h-4.5 !text-[10px] font-semibold shrink-0" title={task.blockedByTaskId ? `Blocked by task ${task.blockedByTaskId}` : 'Blocked'}>
              <Ban size={10} />
              Blocked
            </span>
          )}
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="min-w-0 space-y-1">
        <h3 className={`text-[13.5px] font-semibold m-0 leading-snug group-hover:text-brand-900 transition-colors ${isDone ? 'text-olive-400 line-through decoration-olive-300' : 'text-olive-950'}`}>
          {task.title}
        </h3>

        {task.description && (
          <p className="m-0 text-olive-600 text-xs leading-relaxed line-clamp-2 font-normal">{task.description}</p>
        )}

        {task.note && (
          <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-olive-50/90 border border-olive-200/50 text-xs text-olive-700 italic flex items-center gap-1.5">
            <MessageSquare size={12} className="shrink-0 text-olive-400" />
            <span className="truncate">{task.note}</span>
          </div>
        )}
      </div>

      {/* Bottom Metadata & Status Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-olive-100/70">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Status Dropdown Pill */}
          <label
            className="relative inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-md bg-olive-50 border border-olive-200/80 text-[11px] font-medium text-olive-800 hover:border-olive-300 hover:bg-olive-100/70 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
            {onUpdateStatus && task.status !== 'rolled_over' && (
              <select
                aria-label="Change status"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={!task.permissions.canEdit || isUpdating}
                onChange={(e) => onUpdateStatus(task, e.target.value as TaskWorkflowStatus)}
                value={task.status}
              >
                {TASK_WORKFLOW_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </label>

          {/* Priority Badge */}
          {task.priority && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${priorityColorClass}`}>
              <PriorityGlyph priority={task.priority} />
            </span>
          )}

          {/* SLA Indicator */}
          {task.slaResolutionDueAt && (breached || task.currentSlaState !== 'HEALTHY') && <SlaIndicator task={task} compact />}

          {/* Subtasks Count */}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-olive-100/60 border border-olive-200/50 text-[11px] text-olive-600 font-medium tabular-nums" title="Subtasks done">
              <ListChecks size={12} className="text-olive-500" />
              {completedSubtasksCount}/{task.subtasks.length}
            </span>
          )}

          {task.dynamicPriorityScore > 0 && (
            <span className="text-[11px] text-olive-400 tabular-nums font-medium" title={`${task.dependencyWeight} downstream tasks`}>
              Score {task.dynamicPriorityScore}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="shrink-0">
          {task.assignedTo ? (
            <UserAvatar name={task.assignedTo.name} email={task.assignedTo.email} size="sm" />
          ) : (
            <span className="inline-block w-5 h-5 rounded-full border border-dashed border-olive-300/80 bg-olive-50" title="Unassigned" />
          )}
        </div>
      </div>
    </article>
  );
}

export default TaskCard;
