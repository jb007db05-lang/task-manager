import { FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { TASK_WORKFLOW_STATUS_OPTIONS, type TaskWorkflowStatus } from '@/types/task';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';

interface SubtaskDraft {
  id: string;
  title: string;
  description?: string;
  note?: string;
  status: TaskWorkflowStatus;
  assignedToUserId?: string | null;
}

interface SubtaskFormProps {
  onSubmit: (payload: Array<{ title: string; description?: string; note?: string; status: TaskWorkflowStatus; assignedToUserId?: string | null }>) => Promise<void>;
  members: ProjectMember[];
}

const createDraft = (): SubtaskDraft => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  note: '',
  status: 'TODO',
  assignedToUserId: null
});

const inputCls = 'input-base';

function SubtaskForm({ onSubmit, members }: SubtaskFormProps): JSX.Element {
  const [drafts, setDrafts] = useState<SubtaskDraft[]>([createDraft()]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateDraft = (draftId: string, field: keyof Omit<SubtaskDraft, 'id'>, value: string | null): void => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft))
    );
  };

  const handleAddDraft = (): void => {
    setDrafts((current) => [...current, createDraft()]);
  };

  const handleRemoveDraft = (draftId: string): void => {
    setDrafts((current) => (current.length === 1 ? current : current.filter((draft) => draft.id !== draftId)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalizedDrafts = drafts
      .map((draft) => ({
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        note: draft.note?.trim() || undefined,
        status: draft.status,
        assignedToUserId: draft.assignedToUserId
      }))
      .filter((draft) => draft.title !== '');

    if (normalizedDrafts.length === 0) {
      setErrorMessage('At least one sub-task title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(
        normalizedDrafts.map((draft) => ({
          title: draft.title,
          description: draft.description,
          note: draft.note,
          status: draft.status,
          assignedToUserId: draft.assignedToUserId
        }))
      );
      setDrafts([createDraft()]);
    } catch {
      setErrorMessage('Unable to create the sub-tasks right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      {/* Builder cards */}
      <div className="grid gap-4">
        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className="border border-olive-200 rounded-xl grid gap-3 p-4"
          >
            {/* Head */}
            <div className="flex items-center justify-between gap-3">
              <strong className="text-olive-900 text-[13px] font-medium">Subtask {index + 1}</strong>
              <button
                className="icon-btn !w-7 !h-7 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30" aria-label="Remove subtask"
                disabled={submitting || drafts.length === 1}
                onClick={() => handleRemoveDraft(draft.id)}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>Title</span>
              <input
                className={inputCls}
                onChange={(event) => updateDraft(draft.id, 'title', event.target.value)}
                placeholder="Write tests"
                type="text"
                value={draft.title}
              />
            </label>

            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>Description</span>
              <input
                className={inputCls}
                onChange={(event) => updateDraft(draft.id, 'description', event.target.value)}
                placeholder="Optional description"
                type="text"
                value={draft.description}
              />
            </label>

            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>Internal note</span>
              <input
                className={inputCls}
                onChange={(event) => updateDraft(draft.id, 'note', event.target.value)}
                placeholder="Optional private note"
                type="text"
                value={draft.note}
              />
            </label>

            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>Status</span>
              <select
                className={inputCls}
                onChange={(event) => updateDraft(draft.id, 'status', event.target.value)}
                value={draft.status}
              >
                {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>Assignee</span>
              <div className="flex items-center gap-3">
                <select
                  className={inputCls}
                  onChange={(event) => updateDraft(draft.id, 'assignedToUserId', event.target.value || null)}
                  value={draft.assignedToUserId || ''}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.userId}>
                      {member.user.name || member.user.email}
                    </option>
                  ))}
                </select>
                {draft.assignedToUserId && (
                  <UserAvatar 
                    name={members.find(m => m.userId === draft.assignedToUserId)?.user.name || null}
                    email={members.find(m => m.userId === draft.assignedToUserId)?.user.email || ''}
                    size="md"
                    showTooltip={false}
                  />
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <button
          className="btn btn-ghost -ml-2"
          disabled={submitting}
          onClick={handleAddDraft}
          type="button"
        >
          <Plus size={16} /> Add another
        </button>
        <button
          className="btn btn-primary"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Creating…' : drafts.length > 1 ? `Create ${drafts.length} subtasks` : 'Create subtask'}
        </button>
      </div>

      {errorMessage ? <p className="text-red-600 m-0 text-[13px]">{errorMessage}</p> : null}
    </form>
  );
}

export default SubtaskForm;