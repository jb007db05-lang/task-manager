import { FormEvent, useState, useEffect } from 'react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import { TASK_WORKFLOW_STATUS_OPTIONS, type TaskWorkflowStatus, type TaskPriority } from '@/types/task';
import { flattenProjectOptions } from '@/utils/projectTree';
import AssigneeSelector from './AssigneeSelector';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface AddTaskFormProps {
  epics: Epic[];
  initialProjectId?: string | null;
  initialEpicId?: string | null;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    note?: string;
    status?: TaskWorkflowStatus;
    priority?: TaskPriority;
    projectId?: string | null;
    epicId?: string | null;
    assignedTo?: string;
  }) => Promise<void>;
  projects: Project[];
}

const inputCls = 'input-base';
const labelCls = 'grid gap-1.5 text-[13px] font-medium text-olive-700';

function AddTaskForm({ epics, initialProjectId = null, initialEpicId = null, onCreateTask, projects }: AddTaskFormProps): JSX.Element {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<TaskWorkflowStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [projectId, setProjectId] = useState<string>(initialProjectId ?? '');
  const [epicId, setEpicId] = useState<string>(initialEpicId ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(user?.id ?? '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && !assignedTo) {
      setAssignedTo(user.id);
    }
  }, [user?.id, assignedTo]);

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  useEffect(() => {
    if (initialEpicId) {
      setEpicId(initialEpicId);
      // If we have an epic but no project ID, try to find the project ID from epics list
      if (!projectId) {
        const parentEpic = epics.find(e => e.id === initialEpicId);
        if (parentEpic) {
          setProjectId(parentEpic.projectId);
        }
      }
    }
  }, [initialEpicId, epics, projectId]);

  const projectOptions = flattenProjectOptions(projects);
  const visibleEpics = epics.filter((epic) => epic.projectId === (projectId || initialProjectId)).sort((left, right) => left.order - right.order);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (title.trim() === '') {
      setErrorMessage('Task title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const finalProjectId = projectId || initialProjectId || null;
    const finalEpicId = epicId || initialEpicId || null;


    try {
      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        status,
        priority,
        projectId: finalProjectId,
        epicId: finalEpicId || null,
        assignedTo: assignedTo || undefined
      });
      setTitle('');
      setDescription('');
      setNote('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setProjectId(initialProjectId ?? '');
      setEpicId(initialEpicId ?? '');
    } catch {
      setErrorMessage('Unable to create the task right now.');
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
          placeholder="What needs to be done?"
          required
          type="text"
          value={title}
        />
      </label>

      <label className={labelCls}>
        <span>Description <span className="text-olive-400 font-normal">(optional)</span></span>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add more details about this task"
          rows={2}
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

      <div className="grid gap-1.5">
        <AssigneeSelector
          projectId={projectId || initialProjectId || null}
          selectedUserId={assignedTo}
          onSelect={setAssignedTo}
          label="Assigned to"
        />
      </div>

      {!initialProjectId && (
        <label className={labelCls}>
          <span>Project</span>
          <select
            className={inputCls}
            onChange={(event) => {
              setProjectId(event.target.value);
              setEpicId('');
            }}
            value={projectId}
          >
            <option value="">No project</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {(!initialEpicId && (projectId || initialProjectId)) && (
        <label className={labelCls}>
          <span>Epic</span>
          <select className={inputCls} onChange={(event) => setEpicId(event.target.value)} value={epicId}>
            <option value="">No epic</option>
            {visibleEpics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        className="btn btn-primary justify-self-end min-w-[140px]"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Creating…' : 'Create task'}
      </button>

      {errorMessage ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={14} className="text-red-600 shrink-0" />
          <p className="text-red-700 m-0 text-[13px]">{errorMessage}</p>
        </div>
      ) : null}
    </form>
  );
}

export default AddTaskForm;
