import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIntegration,
  updateIntegration,
  regenerateKey,
  disableIntegration,
  enableIntegration,
  deleteIntegration,
  type SdkIntegration,
  type SdkEnvironment,
  type DataEnvironment
} from '@/lib/sdk-integrations/api';
import EngagementPage from './EngagementPage';
import EventTrackingPage from './EventTrackingPage';
import SandboxPanel from '@/components/SandboxPanel';
import {
  Activity,
  Check,
  Code,
  Copy,
  RefreshCw,
  Settings,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { useConfirm } from '@/context/ConfirmationContext';
import { normalizeApiError } from '@/utils/apiError';

const SdkIntegrationDetailPage: React.FC = () => {
  const { integrationId, tab } = useParams<{ integrationId: string; tab?: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [integration, setIntegration] = useState<SdkIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editEnvironment, setEditEnvironment] = useState<SdkEnvironment>('development');
  const [editAllowedOrigins, setEditAllowedOrigins] = useState<string>('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTab = tab || 'overview';
  // Which data the Guides/Surveys/Events tabs show. Sandbox integrations only
  // have sandbox data; production ones can switch when a sandbox key exists.
  const [dataEnvironment, setDataEnvironment] = useState<DataEnvironment>('live');
  const isSandboxMode = integration?.mode === 'sandbox';
  const effectiveEnvironment: DataEnvironment = isSandboxMode
    ? 'sandbox'
    : integration?.sandbox?.enabled ? dataEnvironment : 'live';

  const loadData = async () => {
    if (!integrationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegration(integrationId);
      setIntegration(data);
      // Initialize edit fields
      setEditName(data.name);
      setEditDomain(data.domain);
      setEditEnvironment(data.environment);
      setEditAllowedOrigins(data.allowedOrigins.join(', '));
      setEditDescription(data.description || '');
    } catch (err) {
      console.error('Failed to load integration details', err);
      setError('Failed to load integration details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (integrationId) {
      localStorage.setItem('active_sdk_integration_id', integrationId);
      window.dispatchEvent(new CustomEvent('sync:active-integration-changed', { detail: { id: integrationId } }));
    }
    loadData();
  }, [integrationId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!integrationId) return;
    const isConfirmed = await confirm({
      title: 'Regenerate SDK Key',
      message: 'Are you sure you want to regenerate the SDK Key? Any existing applications using the old key will lose access immediately.',
      confirmText: 'Regenerate',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await regenerateKey(integrationId);
      setNewKey(res.sdkKey);
      if (integration) {
        setIntegration({ ...integration, sdkKeyMasked: res.integration.sdkKeyMasked });
      }
    } catch (err) {
      console.error('Failed to regenerate key', err);
      alert('Failed to regenerate SDK key.');
    }
  };

  const handleToggleStatus = async () => {
    if (!integration || !integrationId) return;
    try {
      let updated: SdkIntegration;
      if (integration.status === 'disabled') {
        updated = await enableIntegration(integrationId);
      } else {
        const isConfirmed = await confirm({
          title: 'Disable SDK Integration',
          message: 'Disabling this SDK Integration will block all requests from it. Users will not see guides or surveys. Are you sure?',
          confirmText: 'Disable',
          type: 'danger'
        });
        if (!isConfirmed) return;
        updated = await disableIntegration(integrationId);
      }
      setIntegration(updated);
    } catch (err) {
      console.error('Failed to toggle integration status', err);
      alert('Failed to update integration status.');
    }
  };

  const handleDelete = async () => {
    if (!integrationId) return;
    const isConfirmed = await confirm({
      title: 'Delete SDK Integration',
      message: 'This action is permanent. All guides, surveys, and logs associated with this integration will be permanently deleted. Are you sure?',
      confirmText: 'Delete Permanently',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await deleteIntegration(integrationId);
      navigate('/sdk-integrations');
    } catch (err) {
      console.error('Failed to delete integration', err);
      alert('Failed to delete SDK integration.');
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationId) return;
    setSaving(true);
    try {
      const origins = editAllowedOrigins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await updateIntegration(integrationId, {
        name: editName,
        domain: editDomain,
        environment: editEnvironment,
        allowedOrigins: origins,
        description: editDescription
      });
      setIntegration(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save integration details', err);
      alert(normalizeApiError(err).message || 'Failed to update SDK integration details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="p-8 text-center bg-white shadow-sm rounded-md max-w-md mx-auto mt-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Integration Not Found</h3>
        <p className="mt-2 text-sm text-slate-500">{error || 'The requested SDK integration could not be loaded.'}</p>
        <button
          onClick={() => navigate('/sdk-integrations')}
          className="mt-5 rounded bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
        >
          Back to List
        </button>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-amber-50 text-amber-705 shadow-xs',
    connected: 'bg-emerald-50 text-emerald-705 shadow-xs',
    disabled: 'bg-rose-50 text-rose-705 shadow-xs',
    revoked: 'bg-zinc-50 text-zinc-705 shadow-xs'
  };

  const envGradient: Record<string, string> = {
    production: 'from-indigo-600 to-violet-600',
    staging: 'from-amber-500 to-orange-500',
    development: 'from-emerald-500 to-teal-600',
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Detail Header */}
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${envGradient[integration.environment] ?? 'from-slate-100 to-slate-200'} opacity-[0.05]`} />
        <div className="relative bg-white px-8 py-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${envGradient[integration.environment] ?? 'from-slate-400 to-slate-600'} shrink-0`} />
                <h2 className="m-0 text-xl font-semibold text-slate-900">{integration.name}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${statusColors[integration.status]}`}>
                  {integration.status}
                </span>
                {isSandboxMode ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white uppercase bg-gradient-to-r from-amber-500 to-orange-500">
                    Sandbox
                  </span>
                ) : (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white uppercase bg-gradient-to-r ${envGradient[integration.environment] ?? 'from-slate-600 to-slate-800'}`}>
                    {integration.environment}
                  </span>
                )}
              </div>
              <p className="m-0 mt-1.5 text-sm text-slate-500">
                Target: <span className="font-mono text-slate-600 text-xs">{integration.domain}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {activeTab !== 'overview' && !isSandboxMode && integration.sandbox?.enabled && (
                <div
                  role="radiogroup"
                  aria-label="Data environment"
                  className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold"
                >
                  {(['live', 'sandbox'] as const).map((env) => (
                    <button
                      key={env}
                      role="radio"
                      aria-checked={effectiveEnvironment === env}
                      onClick={() => setDataEnvironment(env)}
                      className={`rounded-full px-3 py-1 capitalize transition-colors ${
                        effectiveEnvironment === env
                          ? env === 'sandbox'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/sdk-integrations')}
                className="rounded bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ← Back to Integrations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Columns: Config & Keys */}
            <div className="lg:col-span-2 space-y-8">
              {/* SDK Key Panel */}
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-indigo-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center">
                    <Code className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="m-0 text-base font-semibold text-slate-800">{isSandboxMode ? 'Sandbox SDK Key' : 'Integration SDK Key'}</h3>
                </div>

                {newKey ? (
                  <div className="mb-4 rounded bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Copy your new SDK Key
                    </div>
                    <p className="text-xs text-amber-700 mb-3">
                      This key will only be shown once. Copy it now and store it securely.
                    </p>
                    <div className="flex items-center gap-2 rounded bg-white  p-2.5 shadow-inner">
                      <code className="flex-1 font-mono text-xs text-slate-800 break-all select-all">{newKey}</code>
                      <button
                        onClick={() => handleCopy(newKey)}
                        className="rounded p-1 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Copy Key"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-2 rounded bg-slate-50  p-2.5 shadow-inner">
                    <code className="flex-1 font-mono text-xs text-slate-600 break-all select-none">{integration.sdkKeyMasked}</code>
                    <button
                      onClick={() => handleCopy(integration.sdkKeyMasked)}
                      disabled={true}
                      className="rounded p-1 text-slate-400 cursor-not-allowed opacity-50"
                      title="Masked Key cannot be copied"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateKey}
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors"
                  >
                    Regenerate Key
                  </button>
                  {newKey && (
                    <button
                      onClick={() => setNewKey(null)}
                      className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                    >
                      Done Viewing
                    </button>
                  )}
                </div>
              </div>

              <SandboxPanel integration={integration} onChange={setIntegration} />

              {/* Edit Details Form */}
              <div className="rounded bg-white p-5 shadow-sm border-l-4 border-violet-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-violet-600" />
                    </div>
                    <h3 className="m-0 text-base font-semibold text-slate-800">Configuration Details</h3>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Edit Configuration
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveChanges} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Integration Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/10 shadow-xs focus:shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Primary Domain
                        </label>
                        <input
                          type="text"
                          required
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          placeholder={isSandboxMode ? 'http://localhost:5173' : 'https://example.com'}
                          className="w-full rounded bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/10 shadow-xs"
                        />
                      </div>
                      {!isSandboxMode && <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Environment
                        </label>
                        <select
                          value={editEnvironment}
                          onChange={(e) => setEditEnvironment(e.target.value as SdkEnvironment)}
                          className="w-full rounded bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/10 shadow-xs"
                        >
                          <option value="development">Development</option>
                          <option value="staging">Staging</option>
                          <option value="production">Production</option>
                        </select>
                      </div>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Allowed CORS Origins (comma-separated URLs)
                      </label>
                      <input
                        type="text"
                        value={editAllowedOrigins}
                        onChange={(e) => setEditAllowedOrigins(e.target.value)}
                        placeholder={isSandboxMode ? 'http://localhost:3000, https://preview.example.dev' : 'https://staging.example.com'}
                        className="w-full rounded bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/10 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/10 shadow-xs resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2 pb-1">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          loadData();
                        }}
                        className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Primary Domain</span>
                        <span className="text-sm font-semibold text-slate-800">{integration.domain}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Mode</span>
                        <span className="text-sm font-semibold text-slate-800 capitalize">
                          {isSandboxMode ? 'Sandbox' : `Production · ${integration.environment}`}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Allowed Origins</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {integration.allowedOrigins.length > 0 ? (
                          integration.allowedOrigins.map((origin) => (
                            <span key={origin} className="rounded bg-slate-105 px-2 py-0.5 text-xs text-slate-700 font-mono shadow-xs">
                              {origin}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm italic text-slate-400">Only matching primary domain requests allowed</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Description</span>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{integration.description || 'No description provided.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Connection Diagnostics & Control */}
            <div className="space-y-8">
              {/* Health Diagnostics Panel */}
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-emerald-500">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="m-0 text-base font-semibold text-slate-800">Diagnostics &amp; Health</h3>
                </div>

                {/* Connection count highlight */}
                <div className="mb-4 rounded bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-700">Connections (All-time)</span>
                  <span className="text-2xl font-semibold text-emerald-700">{integration.connectionCount}</span>
                </div>

                <div className="space-y-0 divide-y divide-slate-100">
                  {[
                    { label: 'SDK Client Version', value: integration.sdkVersion || 'Not connected', accent: 'text-indigo-600' },
                    { label: 'Latest Active Origin', value: integration.latestOrigin || '—', mono: true },
                    { label: 'First Registered', value: integration.firstConnectedAt ? new Date(integration.firstConnectedAt).toLocaleString() : 'Never', accent: 'text-violet-600' },
                    { label: 'Last Live Connect', value: integration.lastConnectedAt ? new Date(integration.lastConnectedAt).toLocaleString() : 'Never' },
                    { label: 'Last Heartbeat', value: integration.lastHeartbeatAt ? new Date(integration.lastHeartbeatAt).toLocaleString() : 'Never' },
                    { label: 'Last Setup Fetch', value: integration.lastRuntimeRequestAt ? new Date(integration.lastRuntimeRequestAt).toLocaleString() : 'Never' },
                    { label: 'Last Logged Event', value: integration.lastEventRequestAt ? new Date(integration.lastEventRequestAt).toLocaleString() : 'Never', accent: 'text-amber-600' },
                  ].map(({ label, value, mono, accent }) => (
                    <div key={label} className="flex justify-between items-center py-2.5">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-xs truncate max-w-[160px] text-right ${mono ? 'font-mono text-slate-600' : accent ?? 'text-slate-700'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-md bg-rose-50/50 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  <h3 className="m-0 text-lg font-bold text-rose-900">Danger Zone</h3>
                </div>

                <p className="text-xs text-rose-705 mb-4 leading-relaxed font-medium">
                  Temporarily disable administrative operations or permanently delete this entire integration context.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleToggleStatus}
                    className={`w-full rounded px-4 py-2.5 text-sm font-bold shadow transition-colors flex items-center justify-center gap-2 ${
                      integration.status === 'disabled'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-amber-600 text-white hover:bg-amber-500'
                    }`}
                  >
                    {integration.status === 'disabled' ? (
                      <>
                        <Play className="h-4 w-4" />
                        Enable Integration
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" />
                        Disable Integration
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="w-full rounded bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Integration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guides' && (
          <div className="rounded-md bg-white  shadow-sm overflow-hidden">
            <EngagementPage sdkIntegrationId={integrationId} defaultTab="guides" hideHeader={true} environment={effectiveEnvironment} />
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className="rounded-md bg-white  shadow-sm overflow-hidden">
            <EngagementPage sdkIntegrationId={integrationId} defaultTab="surveys" hideHeader={true} environment={effectiveEnvironment} />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="rounded-md bg-white  shadow-sm overflow-hidden">
            <EventTrackingPage sdkIntegrationId={integrationId} hideHeader={true} environment={effectiveEnvironment} onOpenDocs={() => navigate('/sdk-docs')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SdkIntegrationDetailPage;
