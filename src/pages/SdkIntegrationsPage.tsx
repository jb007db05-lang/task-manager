import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useConfirm } from '@/context/ConfirmationContext';
import { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Copy, Eye, EyeOff, Globe,
  KeyRound, Loader2, Plus, RefreshCw, Server,
  Trash2, WifiOff, Zap, ChevronDown, ChevronRight, Code2,
  Settings, BookOpen, Target, Activity, FlaskConical, Rocket, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SdkIntegration, SdkEnvironment, SdkIntegrationMode } from '@/lib/sdk-integrations/api';
import {
  listIntegrations, createIntegration, regenerateKey,
  disableIntegration, enableIntegration, deleteIntegration
} from '@/lib/sdk-integrations/api';
import { normalizeApiError } from '@/utils/apiError';

// ---------- helpers ----------
const ENV_LABELS: Record<SdkEnvironment, string> = { development: 'Development', staging: 'Staging', production: 'Production' };
const ENV_COLORS: Record<SdkEnvironment, string> = {
  development: 'bg-emerald-50 text-emerald-700',
  staging: 'bg-amber-50 text-amber-700',
  production: 'bg-indigo-50 text-indigo-700',
};
const ENV_BORDER: Record<SdkEnvironment, string> = {
  development: 'border-t-emerald-400',
  staging: 'border-t-amber-400',
  production: 'border-t-indigo-500',
};
const STATUS_META: Record<SdkIntegration['status'], { label: string; icon: JSX.Element; cls: string }> = {
  pending: { label: 'Pending', icon: <Clock size={13} />, cls: 'bg-zinc-50 text-zinc-600 shadow-xs' },
  connected: { label: 'Connected', icon: <CheckCircle2 size={13} />, cls: 'bg-emerald-50 text-emerald-700 shadow-xs' },
  disabled: { label: 'Disabled', icon: <WifiOff size={13} />, cls: 'bg-orange-50 text-orange-700 shadow-xs' },
  revoked: { label: 'Revoked', icon: <AlertCircle size={13} />, cls: 'bg-red-50 text-red-700 shadow-xs' },
};

const SANDBOX_BADGE = 'bg-amber-100 text-amber-800';
const SANDBOX_BORDER = 'border-t-amber-500';

const LOCAL_HOST_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
const isLocalUrl = (url: string) => LOCAL_HOST_RE.test(url.trim());

const MODE_OPTIONS: { value: SdkIntegrationMode; label: string; icon: JSX.Element; blurb: string }[] = [
  {
    value: 'sandbox',
    label: 'Sandbox',
    icon: <FlaskConical size={16} />,
    blurb: 'For testing. Works on localhost, shows draft guides & surveys, and keeps its events and responses separate from live data.',
  },
  {
    value: 'production',
    label: 'Production',
    icon: <Rocket size={16} />,
    blurb: 'For your live site. Only works from your real domain and shows published content only.',
  },
];

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d?: string | null) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <button onClick={copy} type="button" className="flex items-center gap-1 text-xs font-semibold text-slate-650 hover:text-slate-900 transition-colors">
      {done ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

// ---------- Create modal ----------
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string, name: string) => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<SdkIntegrationMode>('production');
  const [env, setEnv] = useState<SdkEnvironment>('production');
  const [domain, setDomain] = useState('');
  const [origins, setOrigins] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isSandbox = mode === 'sandbox';

  const submit = async () => {
    if (!name.trim() || !domain.trim()) { setErr('Name and application URL are required.'); return; }
    const allowedOrigins = origins
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    const localUrl = !isSandbox && [domain, ...allowedOrigins].find(isLocalUrl);
    if (localUrl) {
      setErr(`${localUrl} is a localhost URL. Choose Sandbox to test on localhost.`);
      return;
    }
    setLoading(true); setErr(null);
    try {
      const { sdkKey, integration } = await createIntegration({
        name,
        mode,
        environment: isSandbox ? 'development' : env,
        domain,
        allowedOrigins,
        description: desc,
      });
      onCreated(sdkKey, integration.name);
    } catch (e) {
      setErr(normalizeApiError(e).message || 'Failed to create integration.');
    } finally { setLoading(false); }
  };

  const inputCls = 'input-base';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-olive-950/40 backdrop-blur-[2px] px-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-olive-950/5 overflow-hidden animate-modalIn">
        <div className="px-6 pt-5 pb-4 border-b border-olive-100">
          <h2 className="text-base font-semibold text-olive-950 m-0">New integration</h2>
          <p className="text-[13px] text-olive-500 mt-0.5 mb-0">Connect an external website to the engagement platform.</p>
        </div>
        <div className="p-6 grid gap-4 overflow-y-auto max-h-[70vh]">
          {err && <div className="flex items-center gap-2 rounded bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm"><AlertCircle size={15} className="shrink-0" />{err}</div>}
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Mode *</span>
            <div role="radiogroup" aria-label="Integration mode" className="grid grid-cols-2 gap-2">
              {MODE_OPTIONS.map(opt => {
                const active = mode === opt.value;
                const accent = opt.value === 'sandbox' ? 'ring-amber-400 bg-amber-50/60' : 'ring-brand-500 bg-brand-50/60';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setMode(opt.value); setErr(null); }}
                    className={`text-left rounded-lg p-3 border transition-colors ${active ? `border-transparent ring-2 ${accent}` : 'border-olive-200 bg-white hover:bg-olive-50'}`}
                  >
                    <span className={`flex items-center gap-1.5 text-sm font-bold ${opt.value === 'sandbox' ? 'text-amber-700' : 'text-indigo-700'}`}>
                      {opt.icon}{opt.label}
                    </span>
                    <span className="block mt-1 text-[11px] leading-snug text-slate-500">{opt.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Integration Name *</span>
            <input className={inputCls} placeholder={isSandbox ? 'e.g. Local Dev' : 'e.g. Production Website'} value={name} onChange={e => setName(e.target.value)} />
          </label>
          {!isSandbox && (
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium text-olive-700">Environment *</span>
              <select className={inputCls} value={env} onChange={e => setEnv(e.target.value as SdkEnvironment)}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </label>
          )}
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Application URL *</span>
            <input className={inputCls} placeholder={isSandbox ? 'http://localhost:5173' : 'https://app.company.com'} value={domain} onChange={e => setDomain(e.target.value)} />
            <span className="text-[11px] text-slate-400">
              {isSandbox ? 'localhost URLs are allowed. Any localhost port can use the sandbox key.' : 'localhost is not allowed for production. Use a sandbox integration to test locally.'}
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Additional Allowed Origins (optional, comma-separated)</span>
            <input className={inputCls} placeholder={isSandbox ? 'https://preview.company.dev' : 'https://origin2.com, https://*.company.com'} value={origins} onChange={e => setOrigins(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Description (optional)</span>
            <textarea className={`${inputCls} resize-none h-20`} placeholder="Brief description of this integration" value={desc} onChange={e => setDesc(e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-olive-100 bg-olive-50/60">
          <button onClick={onClose} type="button" className="btn btn-secondary">Cancel</button>
          <button onClick={() => void submit()} type="button" disabled={loading} className="btn btn-primary">
            {loading && <Loader2 size={14} className="animate-spin" />} Create {isSandbox ? 'sandbox' : 'integration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Key reveal modal ----------
function KeyRevealModal({ sdkKey, name, onClose }: { sdkKey: string; name: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-olive-950/40 backdrop-blur-[2px] px-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-olive-950/5 animate-modalIn">
        <div className="px-6 pt-5 pb-4 border-b border-olive-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center"><KeyRound size={17} /></div>
          <div>
            <h2 className="text-base font-semibold text-olive-950 m-0">Your SDK key is ready</h2>
            <p className="text-[13px] text-olive-500 m-0">For <span className="font-medium text-olive-800">{name}</span></p>
          </div>
        </div>
        <div className="p-6 grid gap-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>This key will not be shown again. Copy it now and store it securely.</span>
          </div>
          <div className="rounded-lg border border-olive-200 bg-olive-50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-olive-700">{sdkKey.startsWith('sdk_test_') ? 'Sandbox SDK Key' : 'Public SDK Key'}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setVisible(!visible)} type="button" title={visible ? 'Hide key' : 'Show key'} className="text-slate-400 hover:text-slate-600">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <CopyBtn text={sdkKey} />
              </div>
            </div>
            <code className="text-xs font-mono text-slate-800 break-all">{visible ? sdkKey : `${sdkKey.slice(0, sdkKey.startsWith('sdk_test_') ? 9 : 4)}${'•'.repeat(32)}`}</code>
          </div>
        </div>
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onClose} type="button" className="btn btn-primary">I’ve saved my key</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Install guide ----------
function InstallGuide({ integration }: { integration: SdkIntegration }) {
  const [open, setOpen] = useState(false);
  const masked = integration.sdkKeyMasked;
  return (
    <div className="rounded-lg border border-olive-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-olive-50 transition-colors text-[13px] font-medium text-olive-800"
        onClick={() => setOpen(!open)} type="button"
      >
        <span className="flex items-center gap-2"><Code2 size={15} />SDK Installation Guide</span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="p-4 grid gap-4 bg-white border-t border-olive-100">
          <div>
            <p className="text-[13px] font-medium text-olive-700">1. Install the SDK</p>
            <pre className="bg-slate-900 text-emerald-300 rounded px-4 py-3 text-xs overflow-auto shadow-inner">{`npm install @jamesbond007db05/events-sdk`}</pre>
          </div>
          <div>
            <p className="text-[13px] font-medium text-olive-700">2. Initialize</p>
            <pre className="bg-slate-900 text-emerald-300 rounded px-4 py-3 text-xs overflow-auto shadow-inner">{`import { Engagement } from '@jamesbond007db05/events-sdk';

Engagement.init({
  apiKey: '${masked}', // the full key shown when it was generated
  userId: 'user-123',
});`}</pre>
          </div>
          <div>
            <p className="text-[13px] font-medium text-olive-700">3. Track an event</p>
            <pre className="bg-slate-900 text-emerald-300 rounded px-4 py-3 text-xs overflow-auto shadow-inner">{`await Engagement.track('signup_completed');`}</pre>
          </div>
          <div className="rounded bg-sky-50 px-4 py-3 text-xs text-sky-700 shadow-xs">
            <strong>Domain:</strong> {integration.domain} &nbsp;·&nbsp; <strong>Mode:</strong> {integration.mode === 'sandbox' ? 'Sandbox (localhost allowed, drafts visible)' : `Production · ${integration.environment}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Details modal ----------
function DetailsModal({ integration, onClose, onRefresh }: { integration: SdkIntegration; onClose: () => void; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await onRefresh(); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-olive-950/40 backdrop-blur-[2px] px-4 animate-fadeIn" onClick={onClose}>
      {newKey && <KeyRevealModal sdkKey={newKey} name={integration.name} onClose={() => setNewKey(null)} />}
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-olive-950/5 overflow-hidden animate-modalIn" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-olive-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-olive-950 m-0">{integration.name}</h2>
            <p className="text-[13px] text-olive-500 mt-0.5 mb-0">{integration.domain}</p>
          </div>
          <button aria-label="Close" onClick={onClose} type="button" className="icon-btn -mr-2 -mt-1"><X size={18} /></button>
        </div>
        <div className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'First Connected', value: fmtTime(integration.firstConnectedAt) },
              { label: 'Last Runtime', value: fmtTime(integration.lastRuntimeRequestAt) },
              { label: 'Last Event', value: fmtTime(integration.lastEventRequestAt) },
              { label: 'Last Heartbeat', value: fmtTime(integration.lastHeartbeatAt) },
              { label: 'Created', value: fmtDate(integration.createdAt) },
              { label: 'Latest Origin', value: integration.latestOrigin ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded bg-slate-50 p-3">
                <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
                <p className="text-xs text-slate-700 truncate">{value}</p>
              </div>
            ))}
          </div>
          {integration.allowedOrigins?.length > 0 && (
            <div className="rounded bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">Allowed Origins</p>
              <p className="text-xs text-slate-700 break-all">{integration.allowedOrigins.join(', ')}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Overview', icon: <Settings size={13} />, tab: 'overview' },
              { label: 'Guides', icon: <BookOpen size={13} />, tab: 'guides' },
              { label: 'Surveys', icon: <Target size={13} />, tab: 'surveys' },
              { label: 'Events', icon: <Activity size={13} />, tab: 'events' },
            ].map(lnk => (
              <button key={lnk.label} onClick={() => { onClose(); navigate(`/sdk-integrations/${integration.id}/${lnk.tab}`); }} type="button"
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 rounded text-sm text-slate-700 transition-colors">
                <span className="text-slate-400">{lnk.icon}</span>{lnk.label}
              </button>
            ))}
          </div>
          <InstallGuide integration={integration} />
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => act(async () => { const { sdkKey } = await regenerateKey(integration.id); setNewKey(sdkKey); })} disabled={busy} type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              <RefreshCw size={12} />Regenerate Key
            </button>
            {integration.status === 'disabled'
              ? <button onClick={() => act(() => enableIntegration(integration.id))} disabled={busy} type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><Zap size={12} />Enable</button>
              : <button onClick={() => act(() => disableIntegration(integration.id))} disabled={busy || integration.status === 'revoked'} type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-50 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50"><WifiOff size={12} />Disable</button>
            }
            <button onClick={async () => { if (await confirm({ title: 'Delete integration', message: `Delete "${integration.name}"? Sites using its key will stop sending data.`, confirmText: 'Delete', type: 'danger' })) void act(() => deleteIntegration(integration.id)); }} disabled={busy} type="button"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50">
              <Trash2 size={12} />Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Integration card ----------
function IntegrationCard({ integration, onRefresh }: { integration: SdkIntegration; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const sm = STATUS_META[integration.status];

  return (
    <>
      {showDetails && <DetailsModal integration={integration} onClose={() => setShowDetails(false)} onRefresh={onRefresh} />}
      <div
        className={`card hover:border-olive-300 hover:shadow-md transition-[border-color,box-shadow] duration-200 flex flex-col overflow-hidden cursor-pointer group border-t-[3px] ${integration.mode === 'sandbox' ? SANDBOX_BORDER : ENV_BORDER[integration.environment]} ${integration.status === 'disabled' || integration.status === 'revoked' ? 'opacity-70' : ''}`}
        onClick={() => navigate(`/sdk-integrations/${integration.id}/overview`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && navigate(`/sdk-integrations/${integration.id}/overview`)}
      >
        <div className="p-5 flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {integration.mode === 'sandbox'
              ? <Badge cls={SANDBOX_BADGE}><FlaskConical size={11} />Sandbox</Badge>
              : <Badge cls={ENV_COLORS[integration.environment]}>{ENV_LABELS[integration.environment]}</Badge>}
            <Badge cls={sm.cls}>{sm.icon}{sm.label}</Badge>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-olive-950 truncate m-0" title={integration.name}>{integration.name}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate"><Globe size={11} className="shrink-0" />{integration.domain}</p>
          </div>
          {integration.description && <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{integration.description}</p>}

          <div className="flex items-center gap-2 mt-auto pt-1" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)} type="button"
                className="btn btn-sm btn-secondary !h-7">
                Configure <ChevronDown size={12} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 mt-1 w-40 rounded-xl bg-white shadow-lg ring-1 ring-olive-950/[0.07] p-1 z-20 animate-modalIn">
                    {[{label:'Overview',icon:<Settings size={12}/>,tab:'overview'},{label:'Guides',icon:<BookOpen size={12}/>,tab:'guides'},{label:'Surveys',icon:<Target size={12}/>,tab:'surveys'},{label:'Events',icon:<Activity size={12}/>,tab:'events'}].map(item => (
                      <button key={item.label} onClick={() => { setShowDropdown(false); navigate(`/sdk-integrations/${integration.id}/${item.tab}`); }} type="button"
                        className="w-full flex items-center gap-2 px-2.5 h-8 rounded-md text-left text-[13px] text-olive-700 hover:bg-olive-100 hover:text-olive-950">
                        <span className="text-slate-400">{item.icon}</span>{item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowDetails(true)} type="button"
              className="btn btn-sm btn-ghost !h-7 ml-auto">
              Details <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-100 py-2.5">
          {[
            { label: 'Connections', value: integration.connectionCount },
            { label: 'Last Active', value: integration.lastConnectedAt ? fmtDate(integration.lastConnectedAt) : 'Never' },
            { label: 'SDK Version', value: integration.sdkVersion ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="px-2 text-center">
              <p className="text-[11px] text-slate-400">{label}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
          <KeyRound size={11} className="text-slate-300 shrink-0" />
          <code className="text-[11px] font-mono text-slate-400 flex-1 truncate">{integration.sdkKeyMasked}</code>
        </div>
      </div>
    </>
  );
}

// ---------- Main page ----------
export default function SdkIntegrationsPage() {
  const [integrations, setIntegrations] = useState<SdkIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterEnv, setFilterEnv] = useState<SdkEnvironment | 'sandbox' | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SdkIntegration['status'] | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try { setIntegrations(await listIntegrations()); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = integrations.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.domain.toLowerCase().includes(search.toLowerCase());
    const matchEnv = filterEnv === 'all'
      || (filterEnv === 'sandbox' ? i.mode === 'sandbox' : i.mode !== 'sandbox' && i.environment === filterEnv);
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchEnv && matchStatus;
  });

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    pending: integrations.filter(i => i.status === 'pending').length,
    disabled: integrations.filter(i => i.status === 'disabled' || i.status === 'revoked').length,
  };

  return (
    <div className=" px-8 pt-8 pb-16">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(key, name) => {
            setShowCreate(false);
            setNewKey({ key, name });
            void load();
          }}
        />
      )}
      {newKey && <KeyRevealModal sdkKey={newKey.key} name={newKey.name} onClose={() => setNewKey(null)} />}

      <PageHeader
        title="SDK integrations"
        description="Connect your websites, issue SDK keys and monitor their health."
        actions={
          <button onClick={() => setShowCreate(true)} type="button" className="btn btn-primary">
            <Plus size={16} />New integration
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 rounded-xl border border-olive-200 bg-white overflow-hidden divide-x divide-olive-100">
        {[
          { label: 'Total', value: stats.total, icon: <Globe size={15} />, iconCls: 'text-olive-400' },
          { label: 'Connected', value: stats.connected, icon: <CheckCircle2 size={15} />, iconCls: 'text-brand-600' },
          { label: 'Pending', value: stats.pending, icon: <Clock size={15} />, iconCls: 'text-amber-500' },
          { label: 'Inactive', value: stats.disabled, icon: <WifiOff size={15} />, iconCls: 'text-red-500' },
        ].map(({ label, value, icon, iconCls }) => (
          <div key={label} className="px-4 py-3.5 flex items-center gap-3">
            <span className={iconCls}>{icon}</span>
            <div>
              <p className="m-0 text-[17px] font-semibold text-olive-950 leading-tight tabular-nums">{value}</p>
              <p className="m-0 text-xs text-olive-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        <input
          aria-label="Search integrations"
          className="input-base !h-8 !w-60 !text-[13px]"
          placeholder="Search integrations" value={search} onChange={e => setSearch(e.target.value)}
        />
        <select aria-label="Environment" className="input-base !h-8 !w-auto !text-[13px]" value={filterEnv} onChange={e => setFilterEnv(e.target.value as typeof filterEnv)}>
          <option value="all">Any environment</option>
          <option value="sandbox">Sandbox</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
        <select aria-label="Status" className="input-base !h-8 !w-auto !text-[13px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">Any status</option>
          <option value="pending">Pending</option>
          <option value="connected">Connected</option>
          <option value="disabled">Disabled</option>
          <option value="revoked">Revoked</option>
        </select>
        <span className="text-xs text-olive-500 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Server}
              title={integrations.length === 0 ? 'No integrations yet' : 'No matching integrations'}
              description={integrations.length === 0
                ? 'Create an integration to connect an external website and start sending events, guides and surveys.'
                : 'Try a different search or clear the filters.'}
              action={integrations.length === 0 ? (
                <button onClick={() => setShowCreate(true)} type="button" className="btn btn-primary">
                  <Plus size={15} />Create integration
                </button>
              ) : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(i => (
              <IntegrationCard key={i.id} integration={i} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
