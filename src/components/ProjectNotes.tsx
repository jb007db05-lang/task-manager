import { Plus, ScrollText, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import type { Note } from '@/types/note';

interface ProjectNotesProps {
  actionNoteId: string | null;
  createLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  heading?: string;
  loading: boolean;
  notes: Note[];
  onCreateNote?: () => void;
  onDeleteNote?: (note: Note) => void;
  onOpenNote: (note: Note) => void;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const formatTimestamp = (value?: string): string => {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : timestampFormatter.format(date);
};

function ProjectNotes({
  actionNoteId,
  createLabel = 'Create note',
  emptyDescription = 'Create the first note to capture decisions, references, or follow-ups for this project.',
  emptyTitle = 'No notes yet',
  heading = 'Notes',
  loading,
  notes,
  onCreateNote,
  onDeleteNote,
  onOpenNote
}: ProjectNotesProps): JSX.Element {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-olive-500">
          {heading} · {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </p>
        {onCreateNote ? (
          <button className="btn btn-sm btn-primary" onClick={onCreateNote} type="button">
            <Plus size={14} />
            {createLabel}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-2">
          {[0, 1].map((i) => <div key={i} className="skeleton h-14" />)}
        </div>
      ) : null}

      {!loading && notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-olive-200">
          <EmptyState compact description={emptyDescription} icon={ScrollText} title={emptyTitle} />
        </div>
      ) : null}

      {notes.length ? (
        <ul className="m-0 p-0 list-none rounded-xl border border-olive-200 divide-y divide-olive-100 max-h-[460px] overflow-auto">
          {notes.map((note) => (
            <li key={note.id} className="group flex items-center gap-2 pr-2 hover:bg-olive-50 transition-colors">
              <button
                className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3 text-left"
                onClick={() => onOpenNote(note)}
                type="button"
              >
                <ScrollText size={16} className="text-olive-400 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-olive-950 truncate">{note.title}</span>
                  <span className="block text-xs text-olive-500">Updated {formatTimestamp(note.updatedAt)}</span>
                </span>
              </button>
              {onDeleteNote ? (
                <button
                  aria-label={`Delete ${note.title}`}
                  className="icon-btn hover:!text-red-600 hover:!bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                  disabled={actionNoteId === note.id}
                  onClick={() => onDeleteNote(note)}
                  title="Delete"
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default ProjectNotes;