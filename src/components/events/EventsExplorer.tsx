import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  ChevronRight,
  Columns3,
  Copy,
  Download,
  EyeOff,
  Filter,
  Loader2,
  Radio,
  Search,
  Smartphone,
  Upload,
  User,
  X,
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import Menu from '@/components/Menu';
import { useToast } from '@/context/ToastContext';
import type { DataEnvironment } from '@/lib/sdk-integrations/api';
import {
  exportEventsCsv,
  getEventPropertyKeys,
  getEventStream,
  getLexiconEvents,
  getUserProfile,
  updateLexiconEvent,
  type EventPropertyKeys,
  type EventStreamFilters,
  type LexiconEvent,
  type StreamEvent,
  type UserProfileSummary,
} from '@/lib/events/api';

/* ------------------------------------------------------------------ helpers */

const LIVE_INTERVAL_MS = 5000;
const PAGE_SIZE = 50;

const relativeTime = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const fullTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const formatValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const loadColumns = (key: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
};

const propertyOf = (event: StreamEvent, key: string): unknown =>
  key in event.properties ? event.properties[key] : event.defaultProperties[key];

/* ------------------------------------------------------------------ shared UI */

function PropertyTable({ properties, empty }: { properties: Record<string, unknown>; empty: string }): JSX.Element {
  const entries = Object.entries(properties).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="m-0 py-3 text-[13px] text-olive-500">{empty}</p>;
  return (
    <dl className="m-0 grid grid-cols-[minmax(140px,220px)_1fr] text-[13px] rounded-lg border border-olive-200 divide-y divide-olive-100 overflow-hidden">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="px-3 py-2 font-mono text-xs text-olive-500 bg-olive-50/60 break-all">{key}</dt>
          <dd className="m-0 px-3 py-2 text-olive-900 break-all font-mono text-xs">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-sm btn-ghost !h-7"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      type="button"
    >
      {copied ? <Check size={13} className="text-brand-600" /> : <Copy size={13} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

type DetailTab = 'yours' | 'default' | 'json';

/** Expanded event: Your Properties / Default Properties / JSON, like Mixpanel's Events page. */
function EventDetail({ event, onOpenUser }: { event: StreamEvent; onOpenUser?: (distinctId: string) => void }): JSX.Element {
  const [tab, setTab] = useState<DetailTab>('yours');
  const processing = event.defaultProperties.mp_processing_time_ms;
  return (
    <div className="px-4 sm:px-6 pb-5 pt-1 animate-fadeIn">
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3 text-xs text-olive-500">
        <span>Distinct ID{' '}
          {event.distinctId ? (
            <button className="font-mono text-brand-700 hover:underline" onClick={() => onOpenUser?.(event.distinctId!)} type="button">{event.distinctId}</button>
          ) : <span className="font-mono">—</span>}
        </span>
        {event.userId && <span>User ID <span className="font-mono text-olive-800">{event.userId}</span></span>}
        {event.deviceId && <span>Device ID <span className="font-mono text-olive-800">{event.deviceId}</span></span>}
        <span>Insert ID <span className="font-mono text-olive-800">{event.insertId}</span></span>
        <span>Received {fullTime(event.receivedAt)}{typeof processing === 'number' ? ` (${processing.toLocaleString()} ms after the event)` : ''}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-olive-200 mb-3" role="tablist">
        <div className="flex gap-5">
          {([
            ['yours', `Your properties (${Object.keys(event.properties).length})`],
            ['default', `Default properties (${Object.keys(event.defaultProperties).length})`],
            ['json', 'JSON'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`relative pb-2 text-[13px] transition-colors ${tab === key ? 'text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
              type="button"
            >
              {label}
              {tab === key && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
        {tab === 'json' && <CopyButton text={JSON.stringify(event.raw, null, 2)} label="Copy JSON" />}
      </div>
      {tab === 'yours' && <PropertyTable properties={event.properties} empty="This event was sent without custom properties." />}
      {tab === 'default' && <PropertyTable properties={event.defaultProperties} empty="No default properties were collected." />}
      {tab === 'json' && (
        <pre className="m-0 max-h-[420px] overflow-auto rounded-lg bg-olive-950 p-4 font-mono text-xs leading-relaxed text-olive-100">
          {JSON.stringify(event.raw, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ filters */

interface FilterPanelProps {
  draft: EventStreamFilters;
  setDraft: (next: EventStreamFilters) => void;
  lexicon: LexiconEvent[];
  propertyKeys: EventPropertyKeys;
  onApply: () => void;
  onReset: () => void;
}

function FilterPanel({ draft, setDraft, lexicon, propertyKeys, onApply, onReset }: FilterPanelProps): JSX.Element {
  const selectable = lexicon.filter((e) => !e.hidden);
  const selected = new Set(draft.eventNames ?? []);
  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setDraft({ ...draft, eventNames: [...next] });
  };
  return (
    <div className="card p-4 grid gap-4 animate-fadeIn">
      <div className="grid md:grid-cols-[1.3fr_1fr_1fr] gap-4">
        <div>
          <div className="field-label">Events</div>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-olive-200 divide-y divide-olive-100">
            {selectable.length === 0 && <p className="m-0 px-3 py-3 text-xs text-olive-500">No events tracked yet.</p>}
            {selectable.map((e) => (
              <label key={e.id} className="flex items-center gap-2.5 px-3 h-9 text-[13px] cursor-pointer hover:bg-olive-50">
                <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={selected.has(e.eventName)} onChange={() => toggle(e.eventName)} />
                <span className="flex-1 truncate text-olive-800">{e.displayName || e.eventName}</span>
                <span className="text-[11px] text-olive-400 tabular-nums">{e.volume30d.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 content-start">
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>User ID</span>
            <input className="input-base !h-9 font-mono !text-xs" placeholder="$user_id" value={draft.userId ?? ''} onChange={(e) => setDraft({ ...draft, userId: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Device ID</span>
            <input className="input-base !h-9 font-mono !text-xs" placeholder="$device_id" value={draft.deviceId ?? ''} onChange={(e) => setDraft({ ...draft, deviceId: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Distinct ID</span>
            <input className="input-base !h-9 font-mono !text-xs" placeholder="distinct_id" value={draft.distinctId ?? ''} onChange={(e) => setDraft({ ...draft, distinctId: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-3 content-start">
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-olive-700">Property equals</span>
            <select
              aria-label="Property"
              className="input-base !h-9 !text-[13px]"
              value={draft.propertyKey ?? ''}
              onChange={(e) => setDraft({ ...draft, propertyKey: e.target.value || undefined })}
            >
              <option value="">Any property</option>
              {propertyKeys.eventProperties.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input
              aria-label="Property value"
              className="input-base !h-9 !text-[13px]"
              disabled={!draft.propertyKey}
              placeholder={draft.propertyKey ? 'Value (empty = property is set)' : 'Choose a property first'}
              value={draft.propertyValue ?? ''}
              onChange={(e) => setDraft({ ...draft, propertyValue: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>From</span>
              <input type="date" className="input-base !h-9 !text-[13px]" value={draft.startDate ?? ''} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
              <span>To</span>
              <input type="date" className="input-base !h-9 !text-[13px]" value={draft.endDate ?? ''} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-olive-100 -mx-4 px-4 -mb-1">
        <button className="btn btn-sm btn-ghost mt-3" onClick={onReset} type="button">Reset</button>
        <button className="btn btn-sm btn-primary mt-3" onClick={onApply} type="button">Apply filters</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ user activity */

function UserActivityDrawer({
  integrationId,
  environment,
  distinctId,
  lexiconNames,
  onClose,
}: {
  integrationId: string;
  environment: DataEnvironment;
  distinctId: string;
  lexiconNames: Map<string, string>;
  onClose: () => void;
}): JSX.Element {
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getUserProfile(integrationId, environment, distinctId),
      getEventStream(integrationId, environment, { distinctId }, { limit: 30 }),
    ])
      .then(([p, page]) => {
        if (!active) return;
        setProfile(p);
        setEvents(page.events);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch(() => active && setError('Could not load this user’s activity.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [integrationId, environment, distinctId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadMore = async () => {
    if (!cursor) return;
    const page = await getEventStream(integrationId, environment, { distinctId }, { limit: 30, before: cursor });
    setEvents((prev) => [...prev, ...page.events]);
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
  };

  return (
    <>
      <div className="fixed inset-0 z-[2000] bg-olive-950/30 animate-fadeIn" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-[2001] h-full w-full sm:w-[560px] bg-white shadow-2xl border-l border-olive-200 flex flex-col animate-slideInRight" role="dialog" aria-label="User activity">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-olive-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-[15px] font-semibold text-olive-950 font-mono truncate">{distinctId}</h3>
              <p className="m-0 text-xs text-olive-500">
                {profile ? (profile.identified ? 'Identified user' : 'Anonymous visitor') : 'User activity'}
              </p>
            </div>
          </div>
          <button aria-label="Close" className="icon-btn -mr-2" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-5 grid gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
          ) : error ? (
            <p className="m-5 text-[13px] text-red-700">{error}</p>
          ) : profile ? (
            <>
              <div className="grid grid-cols-3 border-b border-olive-100 divide-x divide-olive-100">
                {[
                  ['Events', profile.eventCount.toLocaleString()],
                  ['First seen', relativeTime(profile.firstSeen)],
                  ['Last seen', relativeTime(profile.lastSeen)],
                ].map(([label, value]) => (
                  <div key={label} className="px-5 py-3">
                    <div className="text-[15px] font-semibold text-olive-950">{value}</div>
                    <div className="text-xs text-olive-500">{label}</div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 grid gap-4 border-b border-olive-100">
                <div>
                  <h4 className="section-label m-0 mb-2">Profile properties</h4>
                  <PropertyTable properties={profile.traits} empty="No profile properties — this user hasn’t been identified with traits." />
                </div>
                {profile.deviceIds.length > 0 && (
                  <div>
                    <h4 className="section-label m-0 mb-2">Devices</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.deviceIds.map((d) => (
                        <span key={d} className="badge badge-slate font-mono !text-[11px]"><Smartphone size={11} />{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.topEvents.length > 0 && (
                  <div>
                    <h4 className="section-label m-0 mb-2">Most frequent events</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.topEvents.map((t) => (
                        <span key={t.eventName} className="badge badge-green">{lexiconNames.get(t.eventName) || t.eventName} · {t.count}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 pt-4 pb-6">
                <h4 className="section-label m-0 mb-2">Activity feed · newest first</h4>
                <ol className="m-0 p-0 list-none rounded-lg border border-olive-200 divide-y divide-olive-100">
                  {events.map((ev) => (
                    <li key={ev.id}>
                      <button
                        aria-expanded={expanded === ev.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-olive-50"
                        onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                        type="button"
                      >
                        <ChevronRight size={14} className={`text-olive-400 transition-transform ${expanded === ev.id ? 'rotate-90' : ''}`} />
                        <span className="flex-1 text-[13px] font-medium text-olive-900 truncate">{lexiconNames.get(ev.eventName) || ev.eventName}</span>
                        <span className="text-xs text-olive-500 tabular-nums" title={fullTime(ev.time)}>{relativeTime(ev.time)}</span>
                      </button>
                      {expanded === ev.id && <EventDetail event={ev} />}
                    </li>
                  ))}
                </ol>
                {hasMore && (
                  <button className="btn btn-sm btn-secondary w-full mt-3" onClick={() => void loadMore()} type="button">Load more</button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ events stream */

function EventsStream({
  integrationId,
  environment,
  lexicon,
  presetEventName,
  onOpenUser,
}: {
  integrationId: string;
  environment: DataEnvironment;
  lexicon: LexiconEvent[];
  presetEventName: string | null;
  onOpenUser: (distinctId: string) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const columnsKey = `events-columns:${integrationId}`;
  const [filters, setFilters] = useState<EventStreamFilters>({});
  const [draft, setDraft] = useState<EventStreamFilters>({});
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>(() => loadColumns(columnsKey));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [propertyKeys, setPropertyKeys] = useState<EventPropertyKeys>({ eventProperties: [], defaultProperties: [] });
  const [exporting, setExporting] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  const lexiconNames = useMemo(() => new Map(lexicon.map((e) => [e.eventName, e.displayName])), [lexicon]);
  const effectiveFilters = useMemo(() => ({ ...filters, q: search.trim() || undefined }), [filters, search]);

  // Jump from the Lexicon: show only one event.
  useEffect(() => {
    if (presetEventName) {
      setFilters({ eventNames: [presetEventName] });
      setDraft({ eventNames: [presetEventName] });
    }
  }, [presetEventName]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getEventStream(integrationId, environment, effectiveFilters, { limit: PAGE_SIZE });
      setEvents(page.events);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setExpanded(null);
    } catch {
      setError('Could not load events. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [integrationId, environment, effectiveFilters]);

  // Debounce typing in the search box.
  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    getEventPropertyKeys(integrationId, environment).then(setPropertyKeys).catch(() => undefined);
  }, [integrationId, environment]);

  // Live mode: poll for events received after the newest one shown.
  useEffect(() => {
    if (!live) return;
    const tick = async () => {
      const newest = events[0]?.receivedAt;
      if (!newest) {
        void load();
        return;
      }
      try {
        const page = await getEventStream(integrationId, environment, effectiveFilters, { since: newest, limit: 100 });
        if (page.events.length > 0) {
          setEvents((prev) => {
            const known = new Set(prev.map((e) => e.id));
            const incoming = page.events.filter((e) => !known.has(e.id));
            return [...incoming, ...prev];
          });
          setFreshIds(new Set(page.events.map((e) => e.id)));
        }
      } catch {
        // keep polling quietly
      }
    };
    const timer = setInterval(() => void tick(), LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live, events, integrationId, environment, effectiveFilters, load]);

  useEffect(() => {
    if (!columnsOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [columnsOpen]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await getEventStream(integrationId, environment, effectiveFilters, { limit: PAGE_SIZE, before: cursor });
      setEvents((prev) => [...prev, ...page.events]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      try {
        localStorage.setItem(columnsKey, JSON.stringify(next));
      } catch {
        // per-viewer convenience only
      }
      return next;
    });
  };

  const runExport = async (allProperties: boolean) => {
    setExporting(true);
    try {
      const rows = await exportEventsCsv(integrationId, environment, effectiveFilters, { columns, allProperties });
      showToast({ variant: 'success', message: `Exported ${rows.toLocaleString()} events${rows >= 10000 ? ' (limit reached — narrow your filters for the rest)' : ''}.` });
    } catch {
      showToast({ variant: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  (filters.eventNames ?? []).forEach((name) =>
    activeChips.push({
      label: `Event: ${lexiconNames.get(name) || name}`,
      clear: () => setFilters((f) => ({ ...f, eventNames: (f.eventNames ?? []).filter((n) => n !== name) })),
    }),
  );
  (['userId', 'deviceId', 'distinctId'] as const).forEach((key) => {
    if (filters[key]) {
      const label = key === 'userId' ? 'User ID' : key === 'deviceId' ? 'Device ID' : 'Distinct ID';
      activeChips.push({ label: `${label}: ${filters[key]}`, clear: () => setFilters((f) => ({ ...f, [key]: undefined })) });
    }
  });
  if (filters.propertyKey) {
    activeChips.push({
      label: filters.propertyValue ? `${filters.propertyKey} = ${filters.propertyValue}` : `${filters.propertyKey} is set`,
      clear: () => setFilters((f) => ({ ...f, propertyKey: undefined, propertyValue: undefined })),
    });
  }
  if (filters.startDate || filters.endDate) {
    activeChips.push({
      label: `Date: ${filters.startDate || '…'} → ${filters.endDate || '…'}`,
      clear: () => setFilters((f) => ({ ...f, startDate: undefined, endDate: undefined })),
    });
  }

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" size={15} />
          <input
            aria-label="Search events"
            className="input-base !h-9 !pl-9 !pr-8"
            placeholder="Search users, devices or any property value"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn !w-6 !h-6" onClick={() => setSearch('')} type="button">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          aria-expanded={filtersOpen}
          className={`btn btn-sm ${filtersOpen || activeChips.length ? 'bg-brand-50 text-brand-800 border-brand-200' : 'btn-secondary'} !h-9`}
          onClick={() => {
            setDraft(filters);
            setFiltersOpen((o) => !o);
          }}
          type="button"
        >
          <Filter size={14} />
          Filters{activeChips.length ? ` · ${activeChips.length}` : ''}
        </button>

        <div className="relative" ref={columnsRef}>
          <button aria-expanded={columnsOpen} className="btn btn-sm btn-secondary !h-9" onClick={() => setColumnsOpen((o) => !o)} type="button">
            <Columns3 size={14} />
            Edit columns{columns.length ? ` · ${columns.length}` : ''}
          </button>
          {columnsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 z-30 rounded-xl bg-white shadow-lg ring-1 ring-olive-950/[0.07] p-2 animate-modalIn max-h-[360px] overflow-y-auto">
              {[
                ['Your properties', propertyKeys.eventProperties],
                ['Default properties', propertyKeys.defaultProperties],
              ].map(([title, keys]) => (
                <div key={title as string} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 section-label">{title as string}</div>
                  {(keys as string[]).length === 0 && <p className="m-0 px-2 py-1 text-xs text-olive-400">None seen yet.</p>}
                  {(keys as string[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 px-2 h-8 rounded-md text-[13px] hover:bg-olive-50 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={columns.includes(key)} onChange={() => toggleColumn(key)} />
                      <span className="font-mono text-xs text-olive-800 truncate">{key}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <Menu
          trigger={({ toggle }) => (
            <button className="btn btn-sm btn-secondary !h-9" disabled={exporting} onClick={toggle} type="button">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export CSV
            </button>
          )}
          items={[
            { label: 'Visible columns', icon: Columns3, onSelect: () => void runExport(false) },
            { label: 'All event properties', icon: Download, onSelect: () => void runExport(true) },
          ]}
        />

        <div className="flex-1" />
        <button
          aria-pressed={live}
          className={`btn btn-sm !h-9 ${live ? 'bg-brand-700 text-white border-brand-800 hover:bg-brand-800' : 'btn-secondary'}`}
          onClick={() => setLive((l) => !l)}
          title="Stream new events as they arrive"
          type="button"
        >
          {live ? (
            <span className="relative flex w-2 h-2"><span className="absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-brand-200" /></span>
          ) : (
            <Radio size={14} />
          )}
          {live ? 'Live' : 'Go live'}
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-1">
          {activeChips.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-brand-50 border border-brand-200 text-xs text-brand-900">
              {chip.label}
              <button aria-label={`Remove ${chip.label}`} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-brand-100" onClick={chip.clear} type="button"><X size={11} /></button>
            </span>
          ))}
          <button className="text-xs text-olive-500 hover:text-olive-900 ml-1" onClick={() => setFilters({})} type="button">Clear all</button>
        </div>
      )}

      {filtersOpen && (
        <FilterPanel
          draft={draft}
          setDraft={setDraft}
          lexicon={lexicon}
          propertyKeys={propertyKeys}
          onApply={() => {
            setFilters(draft);
            setFiltersOpen(false);
          }}
          onReset={() => {
            setDraft({});
            setFilters({});
          }}
        />
      )}

      {/* Stream */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-olive-50/80 border-b border-olive-200">
                <th className="w-8" />
                <th className="h-10 px-3 text-left text-xs font-medium text-olive-500 whitespace-nowrap">Time</th>
                <th className="h-10 px-3 text-left text-xs font-medium text-olive-500">Event</th>
                <th className="h-10 px-3 text-left text-xs font-medium text-olive-500 whitespace-nowrap">Distinct ID</th>
                {columns.map((c) => (
                  <th key={c} className="h-10 px-3 text-left text-xs font-medium text-olive-500 font-mono whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-olive-100">
                    <td />
                    <td className="px-3 py-3"><div className="skeleton h-3.5 w-20" /></td>
                    <td className="px-3 py-3"><div className="skeleton h-3.5 w-36" /></td>
                    <td className="px-3 py-3"><div className="skeleton h-3.5 w-28" /></td>
                    {columns.map((c) => <td key={c} className="px-3 py-3"><div className="skeleton h-3.5 w-16" /></td>)}
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={4 + columns.length} className="px-4 py-10 text-center text-red-700">{error}</td></tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4 + columns.length}>
                    <EmptyState
                      icon={Radio}
                      title={activeChips.length || search ? 'No events match these filters' : 'No events yet'}
                      description={
                        activeChips.length || search
                          ? 'Try a broader search or clear some filters.'
                          : 'Install the SDK and call Engagement.track() — events appear here within seconds. Turn on Live to watch them arrive.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const open = expanded === ev.id;
                  const display = lexiconNames.get(ev.eventName);
                  return (
                    <FragmentRow key={ev.id}>
                      <tr
                        aria-expanded={open}
                        className={`border-b border-olive-100 cursor-pointer transition-colors ${open ? 'bg-olive-50/70' : 'hover:bg-olive-50/60'} ${freshIds.has(ev.id) ? 'animate-[fresh-row_2.5s_ease-out]' : ''}`}
                        onClick={() => setExpanded(open ? null : ev.id)}
                      >
                        <td className="pl-3"><ChevronRight size={14} className={`text-olive-400 transition-transform ${open ? 'rotate-90' : ''}`} /></td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-olive-600 tabular-nums" title={fullTime(ev.time)}>{relativeTime(ev.time)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-olive-950 truncate">{display || ev.eventName}</span>
                            {display && <span className="font-mono text-[11px] text-olive-400 truncate">{ev.eventName}</span>}
                            {ev.imported && <span className="badge badge-slate !h-5 !text-[10px]" title="Imported historical event"><Upload size={10} />Imported</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[220px]">
                          {ev.distinctId ? (
                            <button
                              className="inline-flex items-center gap-1.5 max-w-full font-mono text-xs text-brand-700 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenUser(ev.distinctId!);
                              }}
                              title="View this user's activity"
                              type="button"
                            >
                              {ev.userId ? <User size={12} className="shrink-0" /> : <Smartphone size={12} className="shrink-0 text-olive-400" />}
                              <span className="truncate">{ev.distinctId}</span>
                            </button>
                          ) : <span className="text-olive-400">—</span>}
                        </td>
                        {columns.map((c) => (
                          <td key={c} className="px-3 py-2.5 font-mono text-xs text-olive-700 max-w-[200px] truncate">{formatValue(propertyOf(ev, c))}</td>
                        ))}
                      </tr>
                      {open && (
                        <tr className="bg-olive-50/40 border-b border-olive-100">
                          <td colSpan={4 + columns.length}><EventDetail event={ev} onOpenUser={onOpenUser} /></td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && events.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 h-12 border-t border-olive-200">
            <span className="text-xs text-olive-500">
              Showing {events.length.toLocaleString()} event{events.length === 1 ? '' : 's'}, newest first
              {live ? ' · streaming' : ''}
            </span>
            {hasMore && (
              <button className="btn btn-sm btn-secondary" disabled={loadingMore} onClick={() => void loadMore()} type="button">
                {loadingMore && <Loader2 size={13} className="animate-spin" />}
                Load more
              </button>
            )}
          </div>
        )}
      </div>
      <style>{'@keyframes fresh-row{from{background-color:var(--b-50)}to{background-color:transparent}}'}</style>
    </div>
  );
}

function FragmentRow({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

/* ------------------------------------------------------------------ lexicon */

function LexiconPanel({
  integrationId,
  events,
  loading,
  onUpdated,
  onViewEvents,
}: {
  integrationId: string;
  events: LexiconEvent[];
  loading: boolean;
  onUpdated: (next: LexiconEvent) => void;
  onViewEvents: (eventName: string) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<LexiconEvent | null>(null);
  const [form, setForm] = useState({ displayName: '', description: '', tags: '', hidden: false });
  const [saving, setSaving] = useState(false);

  const maxVolume = Math.max(1, ...events.map((e) => e.volume30d));
  const visible = events.filter((e) => {
    if (!showHidden && e.hidden) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [e.eventName, e.displayName, e.description, ...e.tags].some((v) => v.toLowerCase().includes(term));
  });
  const hiddenCount = events.filter((e) => e.hidden).length;

  const openEditor = (event: LexiconEvent) => {
    setEditing(event);
    setForm({ displayName: event.displayName, description: event.description, tags: event.tags.join(', '), hidden: event.hidden });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await updateLexiconEvent(integrationId, editing.id, {
        displayName: form.displayName,
        description: form.description,
        hidden: form.hidden,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onUpdated({ ...editing, ...updated });
      showToast({ variant: 'success', message: `Saved “${updated.displayName || updated.eventName}”.` });
      setEditing(null);
    } catch {
      showToast({ variant: 'error', message: 'Could not save this event. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" size={15} />
          <input aria-label="Search the lexicon" className="input-base !h-9 !pl-9" placeholder="Search events, descriptions or tags" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="inline-flex items-center gap-2 text-[13px] text-olive-600 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Show hidden{hiddenCount ? ` (${hiddenCount})` : ''}
        </label>
        <span className="ml-auto text-xs text-olive-500">{events.length} event{events.length === 1 ? '' : 's'} tracked</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-olive-50/80 border-b border-olive-200 text-xs text-olive-500">
                <th className="h-10 px-4 text-left font-medium">Event</th>
                <th className="h-10 px-3 text-left font-medium">Description</th>
                <th className="h-10 px-3 text-left font-medium">Tags</th>
                <th className="h-10 px-3 text-left font-medium whitespace-nowrap">30-day volume</th>
                <th className="h-10 px-3 text-left font-medium whitespace-nowrap">First seen</th>
                <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Last seen</th>
                <th className="h-10 px-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-olive-100">
                    {Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-3 py-3"><div className="skeleton h-3.5 w-20" /></td>)}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={BookOpen} title={events.length ? 'No events match' : 'Your lexicon is empty'} description={events.length ? 'Try another search, or show hidden events.' : 'Every event name you track is added here automatically, ready for a display name and description.'} />
                  </td>
                </tr>
              ) : (
                visible.map((e) => (
                  <tr key={e.id} className="border-b border-olive-100 last:border-0 hover:bg-olive-50/60 cursor-pointer" onClick={() => openEditor(e)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-olive-950">{e.displayName || e.eventName}</div>
                      {e.displayName && <div className="font-mono text-[11px] text-olive-400">{e.eventName}</div>}
                    </td>
                    <td className="px-3 py-3 max-w-[280px]">
                      {e.description ? <span className="text-olive-700 line-clamp-2">{e.description}</span> : <span className="text-olive-400">Add a description…</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.autoTracked && <span className="badge badge-slate !h-5 !text-[10px]">Auto</span>}
                        {e.tags.map((t) => <span key={t} className="badge badge-green !h-5 !text-[10px]">{t}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-olive-900 w-12">{e.volume30d.toLocaleString()}</span>
                        <span className="w-20 h-1.5 rounded-full bg-olive-100 overflow-hidden"><span className="block h-full bg-brand-500 rounded-full" style={{ width: `${(e.volume30d / maxVolume) * 100}%` }} /></span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-olive-600 whitespace-nowrap" title={fullTime(e.firstSeen)}>{relativeTime(e.firstSeen)}</td>
                    <td className="px-3 py-3 text-olive-600 whitespace-nowrap" title={fullTime(e.lastSeen)}>{relativeTime(e.lastSeen)}</td>
                    <td className="px-3 py-3">
                      {e.hidden ? <span className="badge badge-slate"><EyeOff size={11} />Hidden</span> : <span className="badge badge-green">Visible</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title="Edit event" description={editing.eventName} onClose={() => setEditing(null)}>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Display name</span>
            <input autoFocus className="input-base" maxLength={120} placeholder={editing.eventName} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Description</span>
            <textarea className="input-base min-h-[90px]" maxLength={2000} placeholder="When is this event sent, and what does it mean?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-olive-700">
            <span>Tags <span className="font-normal text-olive-400">(comma separated)</span></span>
            <input className="input-base" placeholder="onboarding, revenue" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </label>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-olive-200 bg-olive-50 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 mt-0.5 accent-brand-600" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} />
            <span>
              <span className="block text-[13px] font-medium text-olive-900">Hide this event</span>
              <span className="block text-xs text-olive-500">Hidden events are still collected and shown in the stream, but left out of event pickers and filters.</span>
            </span>
          </label>
          <dl className="m-0 grid grid-cols-3 gap-2 text-xs">
            {[
              ['30-day volume', editing.volume30d.toLocaleString()],
              ['All-time volume', editing.totalVolume.toLocaleString()],
              ['First seen', fullTime(editing.firstSeen)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-olive-200 px-3 py-2">
                <dt className="text-olive-500">{k}</dt>
                <dd className="m-0 mt-0.5 font-medium text-olive-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button className="btn btn-ghost -ml-2" onClick={() => { onViewEvents(editing.eventName); setEditing(null); }} type="button">
              View events
            </button>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => setEditing(null)} type="button">Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={() => void save()} type="button">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

interface EventsExplorerProps {
  integrationId: string;
  environment: DataEnvironment;
}

/**
 * Events page for an SDK integration: a live, searchable event stream with
 * property inspection, per-user activity and CSV export, plus the Lexicon
 * (event dictionary) — modelled on Mixpanel's Data → Events and Lexicon.
 */
function EventsExplorer({ integrationId, environment }: EventsExplorerProps): JSX.Element {
  const [view, setView] = useState<'events' | 'lexicon'>('events');
  const [lexicon, setLexicon] = useState<LexiconEvent[]>([]);
  const [lexiconLoading, setLexiconLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [presetEvent, setPresetEvent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLexiconLoading(true);
    getLexiconEvents(integrationId, environment)
      .then((events) => active && setLexicon(events))
      .catch(() => active && setLexicon([]))
      .finally(() => active && setLexiconLoading(false));
    return () => {
      active = false;
    };
  }, [integrationId, environment]);

  const lexiconNames = useMemo(() => new Map(lexicon.map((e) => [e.eventName, e.displayName])), [lexicon]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-semibold tracking-tight text-olive-950">Events</h2>
          <p className="m-0 mt-0.5 text-[13px] text-olive-500">
            {environment === 'sandbox' ? 'Sandbox traffic only. ' : ''}Inspect every event as it arrives, drill into users, and keep your event dictionary tidy.
          </p>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="tablist" aria-label="Events view">
          {([['events', 'Event stream'], ['lexicon', `Lexicon${lexicon.length ? ` · ${lexicon.length}` : ''}`]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`h-8 px-3 rounded-md text-[13px] transition-colors ${view === key ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'events' ? (
        <EventsStream
          integrationId={integrationId}
          environment={environment}
          lexicon={lexicon}
          presetEventName={presetEvent}
          onOpenUser={setUserId}
        />
      ) : (
        <LexiconPanel
          integrationId={integrationId}
          events={lexicon}
          loading={lexiconLoading}
          onUpdated={(next) => setLexicon((prev) => prev.map((e) => (e.id === next.id ? next : e)))}
          onViewEvents={(name) => {
            setPresetEvent(name);
            setView('events');
          }}
        />
      )}

      {userId && (
        <UserActivityDrawer
          integrationId={integrationId}
          environment={environment}
          distinctId={userId}
          lexiconNames={lexiconNames}
          onClose={() => setUserId(null)}
        />
      )}
    </div>
  );
}

export default EventsExplorer;
