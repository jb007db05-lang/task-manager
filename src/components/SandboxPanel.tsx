import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, FlaskConical, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import {
  createSandbox,
  deleteSandbox,
  regenerateSandboxKey,
  resetSandbox,
  type SandboxPurgeResult,
  type SdkIntegration
} from '@/lib/sdk-integrations/api';
import { useConfirm } from '@/context/ConfirmationContext';
import { normalizeApiError } from '@/utils/apiError';

interface SandboxPanelProps {
  integration: SdkIntegration;
  onChange: (integration: SdkIntegration) => void;
}

const describePurge = (purged: SandboxPurgeResult): string =>
  `Removed ${purged.events} events, ${purged.exposures} guide/survey views, ${purged.surveyResponses} survey responses and ${purged.users} users.`;

/**
 * Sandbox (test-mode) key for an integration. Traffic signed with it sees
 * draft guides and surveys, and its data is kept apart from live data.
 */
const SandboxPanel: React.FC<SandboxPanelProps> = ({ integration, onChange }) => {
  const confirm = useConfirm();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sandbox = integration.sandbox ?? { enabled: false };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(normalizeApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () =>
    run('create', async () => {
      const res = await createSandbox(integration.id);
      setRevealedKey(res.sandboxKey);
      onChange(res.integration);
    });

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: 'Regenerate sandbox key',
      message: 'The current sandbox key stops working immediately. Sandbox data is kept.',
      confirmText: 'Regenerate',
      type: 'danger'
    });
    if (!ok) return;
    await run('regenerate', async () => {
      const res = await regenerateSandboxKey(integration.id);
      setRevealedKey(res.sandboxKey);
      onChange(res.integration);
    });
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset sandbox data',
      message: 'This permanently deletes all sandbox events, guide and survey views, survey responses and users. Live data is not touched.',
      confirmText: 'Reset data',
      type: 'danger'
    });
    if (!ok) return;
    await run('reset', async () => {
      const purged = await resetSandbox(integration.id);
      setNotice(describePurge(purged));
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete sandbox',
      message: 'The sandbox key stops working and all sandbox data is permanently deleted. Live data is not touched.',
      confirmText: 'Delete sandbox',
      type: 'danger'
    });
    if (!ok) return;
    await run('delete', async () => {
      const purged = await deleteSandbox(integration.id);
      setRevealedKey(null);
      onChange({ ...integration, sandbox: { enabled: false } });
      setNotice(describePurge(purged));
    });
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-amber-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-amber-600" />
        </div>
        <h3 className="m-0 text-base font-semibold text-slate-800">Sandbox</h3>
        {sandbox.enabled && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
            Enabled
          </span>
        )}
      </div>

      <p className="m-0 mb-4 text-xs leading-relaxed text-slate-600">
        A sandbox key works like the live key, but the SDK also shows <span className="font-semibold">draft</span> guides and
        surveys, works from <span className="font-mono">localhost</span>, and stores its events, views and survey responses
        separately. Sandbox traffic never counts toward live analytics or MTU.
      </p>

      {error && (
        <div role="alert" className="mb-3 rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{notice}</div>
      )}

      {!sandbox.enabled ? (
        <button
          onClick={handleCreate}
          disabled={busy !== null}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          {busy === 'create' ? 'Creating…' : 'Create sandbox'}
        </button>
      ) : (
        <>
          {revealedKey ? (
            <div className="mb-4 rounded bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                <AlertTriangle className="h-4 w-4" />
                Copy your sandbox key
              </div>
              <p className="text-xs text-amber-700 mb-3">This key is only shown once.</p>
              <div className="flex items-center gap-2 rounded bg-white p-2.5 shadow-inner">
                <code className="flex-1 font-mono text-xs text-slate-800 break-all select-all">{revealedKey}</code>
                <button
                  onClick={() => handleCopy(revealedKey)}
                  className="rounded p-1 text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Copy sandbox key"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{`Engagement.init({
  apiKey: '${revealedKey.slice(0, 14)}…', // sandbox key
  userId: 'qa_user_1',
});`}
              </pre>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded bg-slate-50 p-2.5 shadow-inner">
              <code className="flex-1 font-mono text-xs text-slate-600 break-all select-none">{sandbox.keyMasked}</code>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-slate-400">Created</span>
              <span className="text-slate-700">
                {sandbox.createdAt ? new Date(sandbox.createdAt).toLocaleString() : '—'}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-slate-400">Last sandbox request</span>
              <span className="text-slate-700">
                {sandbox.lastRequestAt ? new Date(sandbox.lastRequestAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRegenerate}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy === 'regenerate' ? 'Regenerating…' : 'Regenerate key'}
            </button>
            <button
              onClick={handleReset}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {busy === 'reset' ? 'Resetting…' : 'Reset sandbox data'}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {busy === 'delete' ? 'Deleting…' : 'Delete sandbox'}
            </button>
            {revealedKey && (
              <button
                onClick={() => setRevealedKey(null)}
                className="rounded bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Done viewing
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SandboxPanel;
