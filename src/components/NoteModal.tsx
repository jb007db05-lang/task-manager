import { FormEvent, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import type { Note } from '@/types/note';

interface NoteModalProps {
  allowAppend?: boolean;
  allowDelete?: boolean;
  deleteLabel?: string;
  entityLabel: string;
  modalTitle?: string;
  note?: Pick<Note, 'title' | 'content'> | null;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  onSave: (payload: { appendContent?: boolean; title?: string; content: string }) => Promise<void>;
  showTitle?: boolean;
  titlePlaceholder?: string;
}

function NoteModal({
  allowAppend = false,
  allowDelete = false,
  deleteLabel = 'Delete',
  entityLabel,
  modalTitle,
  note = null,
  onClose,
  onDelete,
  onSave,
  showTitle = true,
  titlePlaceholder = 'Note title'
}: NoteModalProps): JSX.Element {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setSubmitting(false);
    setErrorMessage(null);
  }, [note]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<void> => {
    event.preventDefault();

    if (showTitle && !title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }

    if (!content.trim()) {
      setErrorMessage('Description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSave({
        appendContent: mode === 'append',
        title: showTitle ? title.trim() : undefined,
        content: content.trim()
      });
    } catch {
      setErrorMessage('Unable to save note right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-[640px]"
      title={modalTitle ?? (note ? 'Edit note' : 'New note')}
      description={entityLabel}
    >
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        {showTitle ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Title</span>
            <input
              autoFocus
              className="input-base"
              onChange={(event) => setTitle(event.target.value)}
              placeholder={titlePlaceholder}
              type="text"
              value={title}
            />
          </label>
        ) : null}

        <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
          <span>Note</span>
          <textarea
            autoFocus={!showTitle}
            className="input-base min-h-[220px] resize-y leading-6"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Decisions, references, follow-ups…"
            value={content}
          />
          {note && allowAppend ? (
            <span className="text-xs font-normal text-olive-500">“Append” adds this text to the end of the existing note instead of replacing it.</span>
          ) : null}
        </label>

        {errorMessage ? (
          <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{errorMessage}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            {note && allowDelete && onDelete ? (
              <button
                className="btn btn-ghost !text-red-600 hover:!bg-red-50 -ml-2"
                disabled={submitting}
                onClick={() => void onDelete()}
                type="button"
              >
                {deleteLabel}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={onClose} type="button">
              Cancel
            </button>
            {note && allowAppend ? (
              <button
                className="btn btn-secondary"
                disabled={submitting}
                onClick={(event) => void handleSubmit(event, 'append')}
                type="button"
              >
                Append
              </button>
            ) : null}
            <button className="btn btn-primary" disabled={submitting} type="submit">
              {submitting ? 'Saving…' : note ? 'Save changes' : 'Create note'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default NoteModal;