import { useState } from 'react';
import { Check } from 'lucide-react';
import { Subtask } from '@/types/task';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';

interface SubtaskInlineEditProps {
  subtask: Subtask;
  onSave: (patch: { title: string; description?: string; note?: string; assignedToUserId?: string | null }) => void;
  onCancel: () => void;
  isSaving?: boolean;
  members: ProjectMember[];
}

const inputCls = 'input-base';

export default function SubtaskInlineEdit({ subtask, onSave, onCancel, isSaving, members }: SubtaskInlineEditProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description ?? '');
  const [note, setNote] = useState(subtask.note ?? '');
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(subtask.assignedToUserId);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ 
      title: title.trim(), 
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      assignedToUserId
    });
  };

  return (
    <div className="grid gap-3 p-3 bg-olive-50 rounded-lg border border-olive-200">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-olive-600">Title</span>
        <input
          autoFocus
          className={inputCls}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="What needs to be done?"
          type="text"
          value={title}
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-olive-600">Description (optional)</span>
        <textarea
          className={`${inputCls} min-h-[60px] resize-none`}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add some details..."
          rows={2}
          value={description}
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-olive-600">Internal note (optional)</span>
        <textarea
          className={`${inputCls} min-h-[60px] resize-none`}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Private notes..."
          rows={2}
          value={note}
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-olive-600">Assignee</span>
        <div className="flex items-center gap-3">
          <select
            className={inputCls}
            onChange={(e) => setAssignedToUserId(e.target.value || null)}
            value={assignedToUserId || ''}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {member.user.name || member.user.email}
              </option>
            ))}
          </select>
          {assignedToUserId && (
            <UserAvatar 
              name={members.find(m => m.userId === assignedToUserId)?.user.name || null}
              email={members.find(m => m.userId === assignedToUserId)?.user.email || ''}
              size="md"
              showTooltip={false}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="btn btn-sm btn-ghost"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="btn btn-sm btn-primary"
          disabled={isSaving || !title.trim()}
          onClick={handleSave}
          type="button"
        >
          <Check size={14} />
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}