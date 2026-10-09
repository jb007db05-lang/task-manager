import { FormEvent, useState } from 'react';

import { EPIC_STATUS_OPTIONS, type EpicStatus } from '@/types/epic';

interface EpicFormProps {
  initialDescription?: string;
  initialName?: string;
  initialStatus?: EpicStatus;
  onSubmit: (payload: { description?: string; name: string; status: EpicStatus }) => Promise<void>;
  submitLabel?: string;
}

const inputCls = 'input-base';
const labelCls = 'grid gap-1.5 text-[13px] font-medium text-olive-700';

function EpicForm({
  initialDescription = '',
  initialName = '',
  initialStatus = 'planned',
  onSubmit,
  submitLabel = 'Save epic'
}: EpicFormProps): JSX.Element {
  const [name, setName] = useState<string>(initialName);
  const [description, setDescription] = useState<string>(initialDescription);
  const [status, setStatus] = useState<EpicStatus>(initialStatus);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (name.trim() === '') {
      setErrorMessage('Epic name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        status
      });
    } catch {
      setErrorMessage('Unable to save the epic right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <label className={labelCls}>
        <span>Name</span>
        <input className={inputCls} onChange={(event) => setName(event.target.value)} autoFocus placeholder="e.g. Launch checklist" type="text" value={name} />
      </label>

      <label className={labelCls}>
        <span>Description <span className="text-olive-400 font-normal">(optional)</span></span>
        <textarea
          className={`${inputCls} min-h-[112px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context for the tasks grouped under this epic"
          rows={4}
          value={description}
        />
      </label>

      <label className={labelCls}>
        <span>Status</span>
        <select className={inputCls} onChange={(event) => setStatus(event.target.value as EpicStatus)} value={status}>
          {EPIC_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn btn-primary justify-self-end min-w-[140px]"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>

      {errorMessage ? <p className="text-red-600 m-0 text-[13px]">{errorMessage}</p> : null}
    </form>
  );
}

export default EpicForm;