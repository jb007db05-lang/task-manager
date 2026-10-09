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

  return (
    <article
      className={[
        'group relative flex items-start gap-3 px-4 py-3 transition-colors',
        isSelected ? 'bg-brand-50/60' : isMultiSelected ? 'bg-olive-50' : 'bg-white hover:bg-olive-50/60',
        isUpdating ? 'opacity-60 cursor-wait' : 'cursor-pointer'
      ].join(' ')}
      onClick={() => !isUpdating && onSelect?.(task)}
    >
      {isSelected && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-600" />}

      {onToggleSelection && (
        <input
          aria-label={`Select ${task.title}`}
          type="checkbox"
          checked={isMultiSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelection(task.id)}
          className={`mt-1 w-4 h-4 accent-brand-600 cursor-pointer shrink-0 transition-opacity ${isMultiSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className={`text-sm font-medium m-0 leading-snug line-clamp-2 ${isDone ? 'text-olive-400 line-through decoration-olive-300' : 'text-olive-950'}`}>
            {task.title}
          </h3>
          {task.isBlocked && (
            <span className="badge badge-red !h-5 shrink-0" title={task.blockedByTaskId ? `Blocked by task ${task.blockedByTaskId}` : 'Blocked'}>
              <Ban size={11} />
              Blocked
            </span>
          )}
        </div>

        {task.description && (
          <p className="mt-0.5 mb-0 text-olive-500 text-[13px] leading-relaxed line-clamp-1">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-2">
          {/* Inline status change */}
          <label
            className="relative inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-md border border-olive-200 bg-white text-xs text-olive-700 hover:border-olive-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.label}
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

          <PriorityGlyph priority={task.priority} />

          {task.slaResolutionDueAt && (breached || task.currentSlaState !== 'HEALTHY') && <SlaIndicator task={task} compact />}

          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-olive-500 tabular-nums" title="Subtasks done">
              <ListChecks size={13} />
              {completedSubtasksCount}/{task.subtasks.length}
            </span>
          )}

          {(epicName || projectName) && (
            <span className="text-xs text-olive-400 truncate max-w-[200px]">{epicName ?? projectName}</span>
          )}

          {task.dynamicPriorityScore > 0 && (
            <span className="text-xs text-olive-400 tabular-nums" title={`${task.dependencyWeight} downstream tasks`}>
              Score {task.dynamicPriorityScore}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <div className="absolute right-11 top-2 z-10 hidden group-hover:flex focus-within:flex items-center gap-0.5 p-0.5 rounded-lg bg-white shadow-md ring-1 ring-olive-950/[0.06]">
          {onEditTask && (
            <button
              aria-label="Edit task"
              className="icon-btn !w-7 !h-7 disabled:opacity-30"
              disabled={!task.permissions.canEdit}
              onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
              title="Edit"
              type="button"
            >
              <FilePenLine size={14} />
            </button>
          )}
          <button
            aria-label="Comments"
            className="icon-btn !w-7 !h-7"
            onClick={(e) => { e.stopPropagation(); onComment?.(task); }}
            title="Comments"
            type="button"
          >
            <MessageSquare size={14} />
          </button>
          {onToggleBlocked && (
            <button
              aria-label={task.isBlocked ? 'Unblock task' : 'Mark blocked'}
              className={`icon-btn !w-7 !h-7 disabled:opacity-30 ${task.isBlocked ? '!text-red-600' : ''}`}
              disabled={!task.permissions.canEdit}
              onClick={(e) => { e.stopPropagation(); onToggleBlocked(task); }}
              title={task.isBlocked ? 'Unblock' : 'Mark blocked'}
              type="button"
            >
              <Ban size={14} />
            </button>
          )}
          <button
            aria-label="Delete task"
            className="icon-btn !w-7 !h-7 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30"
            disabled={!task.permissions.canDelete}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            title="Delete"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {task.assignedTo ? (
          <UserAvatar name={task.assignedTo.name} email={task.assignedTo.email} size="sm" />
        ) : (
          <span className="w-6 h-6 rounded-full border border-dashed border-olive-300" title="Unassigned" />
        )}
      </div>
    </article>
  );
}

export default TaskCard;
