import { FormEvent, useMemo, useState } from 'react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import { TASK_WORKFLOW_STATUS_OPTIONS, type Task, type TaskWorkflowStatus, type TaskPriority } from '@/types/task';
import AssigneeSelector from './AssigneeSelector';
import { AlertCircle } from 'lucide-react';

interface EditTaskFormProps {
  epics: Epic[];
  allTasks: Task[];
  onSubmit: (payload: {
    title: string;
    description?: string;
    note?: string;
    date: string;
    status: TaskWorkflowStatus;
    priority: TaskPriority;
    isBlocked: boolean;
    blockedByTaskId: string | null;
    projectId: string | null;
    epicId: string | null;
    assignedTo: string;
  }) => Promise<void>;
  projects: Project[];
  task: Task;
}

const inputCls =
  'w-full bg-white/82  border border-olive-200  rounded-md ' +
  'text-olive-950  px-4 py-3.5 transition-all duration-200 focus:outline-none ' +
  'focus:border-olive-500  focus:ring-2 focus:ring-olive-500/10';
const labelCls = 'grid gap-1.5 text-[13px] font-medium text-olive-700';

function EditTaskForm({ epics, allTasks, onSubmit, projects, task }: EditTaskFormProps): JSX.Element {
  const initialStatus: TaskWorkflowStatus =
    task.status === 'rolled_over' ? 'TODO' : (task.status as TaskWorkflowStatus);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [note] = useState(task.note ?? '');
  const [date, setDate] = useState(task.date);
  const [status, setStatus] = useState<TaskWorkflowStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'MEDIUM');
  const [isBlocked, setIsBlocked] = useState(task.isBlocked || false);
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>(task.blockedByTaskId || '');
  const [projectId, setProjectId] = useState<string>(task.projectId ?? '');
  const [epicId, setEpicId] = useState<string>(task.epicId ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(task.assignedTo?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects]
  );
  const canChangeProject = currentProject == null || currentProject.currentUserRole === 'ADMIN';
  const selectableProjects = useMemo(
    () => projects.filter((project) => project.currentUserRole === 'ADMIN' || project.id === task.projectId),
    [projects, task.projectId]
  );

  const handleProjectChange = (newProjectId: string): void => {
    setProjectId(newProjectId);
    const currentEpic = epics.find((epic) => epic.id === epicId);

    if (currentEpic && currentEpic.projectId !== newProjectId) {
      setEpicId('');
    }
  };

  const availableEpics = projectId
    ? epics.filter((epic) => epic.projectId === projectId)
    : [];

  const otherTasks = useMemo(() => {
    return allTasks.filter(t => t.id !== task.id && (projectId ? t.projectId === projectId : true));
  }, [allTasks, task.id, projectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    if (!date) {
      setErrorMessage('Task date is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        date,
        status,
        priority,
        isBlocked,
        blockedByTaskId: isBlocked ? (blockedByTaskId || null) : null,
        projectId: projectId || null,
        epicId: epicId || null,
        assignedTo,
      });
    } catch {
      setErrorMessage('Unable to save the task right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <label className={labelCls}>
        <span>Title</span>
        <input
          autoFocus
          className={inputCls}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          type="text"
          value={title}
        />
      </label>

      <label className={labelCls}>
        <span>Description <span className="text-olive-400 font-normal">(optional)</span></span>
        <textarea
          className={`${inputCls} min-h-[88px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context or details"
          rows={3}
          value={description}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          <span>Priority</span>
          <select
            className={inputCls}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>

        <label className={labelCls}>
          <span>Status</span>
          <select
            className={inputCls}
            onChange={(event) => setStatus(event.target.value as TaskWorkflowStatus)}
            value={status}
          >
            {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`px-4 py-3 rounded-lg border transition-colors ${isBlocked
        ? 'bg-red-50/60 border-red-200'
        : 'bg-olive-50 border-olive-200'
      }`}>
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => setIsBlocked(!isBlocked)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <span role="switch" aria-checked={isBlocked} className={`w-8 h-[18px] flex items-center rounded-full p-0.5 transition-colors ${isBlocked ? 'bg-red-500' : 'bg-olive-300'}`}>
              <span className={`bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform ${isBlocked ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </span>
            <span className={`text-[13px] font-medium flex items-center gap-1.5 ${isBlocked ? 'text-red-700' : 'text-olive-700'}`}>
              <AlertCircle size={14} className={isBlocked ? 'text-red-500' : 'text-olive-400'} />
              This task is blocked
            </span>
          </button>
        </div>
        
        {isBlocked && (
          <div className="animate-in pt-3 border-t border-red-200/60 mt-3">
            <label className={labelCls}>
              <span>Blocked by</span>
              <select
                className={`${inputCls} !border-red-200`}
                onChange={(event) => setBlockedByTaskId(event.target.value)}
                value={blockedByTaskId}
              >
                <option value="">Select a task...</option>
                {otherTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          <span>Date</span>
          <input
            className={inputCls}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
        
        <div className="grid gap-1.5">
          <AssigneeSelector
            projectId={projectId || null}
            selectedUserId={assignedTo}
            onSelect={setAssignedTo}
            label="Assigned to"
            disabled={!task.permissions.canAssign && !task.permissions.canReassign}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelCls}>
          <span>Project <span className="text-olive-400 font-normal">(optional)</span></span>
          <select
            className={inputCls}
            disabled={!canChangeProject}
            onChange={(event) => handleProjectChange(event.target.value)}
            value={projectId}
          >
            <option value="">No project</option>
            {selectableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        {projectId && (
          <label className={labelCls}>
            <span>Epic <span className="text-olive-400 font-normal">(optional)</span></span>
            <select
              className={inputCls}
              onChange={(event) => setEpicId(event.target.value)}
              value={epicId}
            >
              <option value="">No epic</option>
              {availableEpics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        className="btn btn-primary justify-self-end min-w-[140px]"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Saving…' : 'Save changes'}
      </button>

      {errorMessage ? (
        <p className="text-red-600 m-0 text-[13px]">{errorMessage}</p>
      ) : null}
    </form>
  );
}

export default EditTaskForm;
