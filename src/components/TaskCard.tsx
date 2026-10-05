import { AlertCircle, FilePenLine, Rows3, Trash2, ArrowUpCircle, ArrowDownCircle, MinusCircle, MessageSquare, Siren } from 'lucide-react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import {
  type Subtask,
  type Task,
  type TaskWorkflowStatus,
  type TaskPriority
} from '@/types/task';
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

const statusPillClasses: Record<string, string> = {
  BACKLOG: 'bg-olive-100  text-olive-600  border-olive-200',
  TODO: 'bg-olive-50  text-olive-700  border-olive-100',
  IN_PROGRESS: 'bg-amber-50  text-amber-700  border-amber-100',
  IN_REVIEW: 'bg-purple-50  text-purple-700  border-purple-100',
  BLOCKED: 'bg-red-50  text-red-700  border-red-100',
  DONE: 'bg-emerald-50  text-emerald-700  border-emerald-100',
  rolled_over: 'bg-olive-50  text-olive-500  border-olive-100'
};

const priorityIcons: Record<TaskPriority, JSX.Element> = {
  CRITICAL: <Siren size={12} className="text-red-600" />,
  HIGH: <ArrowUpCircle size={12} className="text-red-500" />,
  MEDIUM: <MinusCircle size={12} className="text-amber-500" />,
  LOW: <ArrowDownCircle size={12} className="text-olive-400" />,
};

function TaskCard({
  actionTaskId,
  onDelete,
  onEditTask,
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
  const statusCls = statusPillClasses[task.status] || statusPillClasses.TODO;
  const isUpdating = actionTaskId === task.id;

  return (
    <article
      className={[
        'group relative flex flex-col gap-4 p-4 transition-all duration-300',
        'bg-white',
        'border rounded-xl font-["Inter"] shadow-sm',
        task.responseBreached || task.resolutionBreached ? 'ring-1 ring-red-300 bg-red-50/30' : '',
        isSelected
          ? 'border-olive-400/70  shadow-sm bg-olive-50/60'
          : 'border-olive-200/80  hover:border-olive-300  hover:-translate-y-[2px]',
        isUpdating ? 'opacity-60 grayscale-[0.5] cursor-wait' : 'cursor-pointer'
      ].join(' ')}
      onClick={() => !isUpdating && onSelect?.(task)}
    >
      {isUpdating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10  backdrop-blur-[1px] rounded-xl overflow-hidden">
          <div className="flex gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-bounce [animation-delay:-0.3s]" />
             <div className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-bounce [animation-delay:-0.15s]" />
             <div className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-bounce" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-olive-300/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {onToggleSelection && (
                <input
                  type="checkbox"
                  checked={isMultiSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelection(task.id);
                  }}
                  className="w-4 h-4 rounded border-olive-300 text-olive-600 focus:ring-olive-500 cursor-pointer"
                />
              )}
              <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm ${statusCls}`}>
                {task.status.replace('_', ' ')}
              </div>
              {task.priority && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-olive-100  border border-olive-200 ">
                  {priorityIcons[task.priority]}
                  <span className="text-[11px] font-bold text-olive-500 ">{task.priority}</span>
                </div>
              )}
            </div>

            {task.isBlocked && (
              <div className="flex items-center gap-1 text-red-500" title={task.blockedByTaskId ? `Blocked by task ${task.blockedByTaskId}` : 'Blocked'}>
                <AlertCircle size={14} />
              </div>
            )}
          </div>

          <h3 className="text-[0.95rem] font-bold tracking-tight text-olive-950  m-0 leading-snug line-clamp-2">
            {task.title}
          </h3>

          <p className="mt-1.5 text-olive-500  text-[0.75rem] leading-relaxed line-clamp-2 font-medium">
            {task.description || 'No description provided.'}
          </p>

          <div className="mt-3">
            <SlaIndicator task={task} />
          </div>

          {task.dynamicPriorityScore > 0 && (
            <div className="mt-2 flex items-center gap-2 text-[0.66rem] font-bold text-olive-500">
              <span>Dynamic score {task.dynamicPriorityScore}</span>
              <span className="h-1 w-1 rounded-full bg-olive-300" />
              <span>{task.dependencyWeight} downstream</span>
            </div>
          )}

          {(projectName || epicName || task.subtasks.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-olive-100/90  text-olive-400 ">
              {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-olive-100/80 ">
                  <Rows3 size={10} />
                  <span className="text-[11px] font-bold">
                    {completedSubtasksCount}<span className="opacity-40">/</span>{task.subtasks.length}
                  </span>
                </div>
              )}
              {projectName && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-olive-100/80 ">
                  <div className="w-1 h-1 rounded-full bg-olive-500/50" />
                  <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[100px]">{projectName}</span>
                </div>
              )}
              {epicName && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-olive-100/80 ">
                  <div className="w-1 h-1 rounded-full bg-olive-500/50" />
                  <span className="text-[11px] font-bold uppercase tracking-wider truncate max-w-[100px]">{epicName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <UserAvatar 
            name={task.assignedTo?.name} 
            email={task.assignedTo?.email} 
            size="sm" 
            className="ring-2 ring-white  shadow-md"
          />
          <div className="flex flex-col gap-1">
            {onEditTask && (
              <button
                className="p-2 rounded-lg bg-white/90  border border-olive-200/80  text-olive-400 hover:text-olive-600  transition-colors disabled:opacity-40 shadow-sm"
                disabled={!task.permissions.canEdit}
                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                title="Edit Task"
              >
                <FilePenLine size={13} />
              </button>
            )}
            {onToggleBlocked && (
              <button
                className={[
                  'p-2 rounded-lg border transition-all shadow-sm',
                  task.isBlocked 
                    ? 'bg-red-500 border-red-600 text-white hover:bg-red-600' 
                    : 'bg-white/90  border-olive-200/80  text-olive-400 hover:text-red-500'
                ].join(' ')}
                disabled={!task.permissions.canEdit}
                onClick={(e) => { e.stopPropagation(); onToggleBlocked(task); }}
                title={task.isBlocked ? 'Unblock Task' : 'Block Task'}
              >
                <AlertCircle size={13} />
              </button>
            )}
            <button
              className="p-2 rounded-lg bg-white/90  border border-olive-200/80  text-olive-400 hover:text-olive-600  transition-colors shadow-sm"
              onClick={(e) => { e.stopPropagation(); onComment?.(task); }}
              title="Add Comment"
            >
              <MessageSquare size={13} />
            </button>
            <button
              className="p-2 rounded-lg bg-white/90  border border-olive-200/80  text-olive-400 hover:text-red-500 transition-colors disabled:opacity-40 shadow-sm"
              disabled={!task.permissions.canDelete}
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              title="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default TaskCard;
