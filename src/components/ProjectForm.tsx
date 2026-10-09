import { FormEvent, useState } from 'react';

interface ProjectFormProps {
  initialDescription?: string;
  initialName?: string;
  onSubmit: (payload: { name: string; description?: string }) => Promise<void>;
  submitLabel?: string;
}

function ProjectForm({
  initialDescription = '',
  initialName = '',
  onSubmit,
  submitLabel = 'Create project'
}: ProjectFormProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Project name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined
      });
      setName(initialName);
      setDescription(initialDescription);
    } catch {
      setErrorMessage(`Unable to ${submitLabel.toLowerCase()} right now.`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'input-base';

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
        <span>Name</span>
        <input className={inputCls} onChange={(event) => setName(event.target.value)} autoFocus placeholder="e.g. Website relaunch" type="text" value={name} />
      </label>
      <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
        <span>Description <span className="text-olive-400 font-normal">(optional)</span></span>
        <textarea
          className={`${inputCls} min-h-[96px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this project about?"
          rows={3}
          value={description}
        />
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

export default ProjectForm;