import api from '@/services/api';
import type { DataEnvironment } from '@/lib/sdk-integrations/api';

type Envelope<T> = { data: T };

export interface StreamEvent {
  id: string;
  eventName: string;
  /** When the event happened on the client. */
  time: string;
  /** When the server received it. */
  receivedAt: string;
  distinctId: string | null;
  userId: string | null;
  deviceId: string | null;
  sessionId: string | null;
  insertId: string;
  imported: boolean;
  /** "Your Properties" — sent by the caller. */
  properties: Record<string, unknown>;
  /** Properties collected automatically (browser, OS, URL, library…). */
  defaultProperties: Record<string, unknown>;
  /** Exact payload as received. */
  raw: Record<string, unknown>;
}

export interface EventStreamFilters {
  eventNames?: string[];
  q?: string;
  distinctId?: string;
  userId?: string;
  deviceId?: string;
  propertyKey?: string;
  propertyValue?: string;
  startDate?: string;
  endDate?: string;
}

export interface EventStreamPage {
  events: StreamEvent[];
  hasMore: boolean;
  nextCursor: string | null;
  serverTime: string;
}

const toParams = (
  environment: DataEnvironment,
  filters: EventStreamFilters,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => {
  const params: Record<string, unknown> = { environment, ...extra };
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (value.length) params[key] = value.join(',');
    } else if (value !== undefined && value !== '') {
      params[key] = value;
    }
  }
  return params;
};

export const getEventStream = async (
  integrationId: string,
  environment: DataEnvironment,
  filters: EventStreamFilters,
  options: { before?: string | null; since?: string; limit?: number } = {},
): Promise<EventStreamPage> => {
  const res = await api.get<Envelope<EventStreamPage>>(`/sdk-integrations/${integrationId}/event-stream`, {
    params: toParams(environment, filters, {
      limit: options.limit ?? 50,
      before: options.before ?? undefined,
      since: options.since,
    }),
  });
  return res.data.data;
};

/** Downloads the filtered stream as CSV (max 10,000 rows, newest first). */
export const exportEventsCsv = async (
  integrationId: string,
  environment: DataEnvironment,
  filters: EventStreamFilters,
  options: { columns: string[]; allProperties: boolean },
): Promise<number> => {
  const res = await api.get<Blob>(`/sdk-integrations/${integrationId}/event-stream/export`, {
    params: toParams(environment, filters, {
      columns: options.allProperties ? undefined : options.columns.join(',') || undefined,
      allProperties: options.allProperties ? 'true' : undefined,
    }),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `events-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const header = Number(res.headers['x-row-count']);
  if (Number.isFinite(header) && res.headers['x-row-count'] !== undefined) return header;
  // Header not exposed (e.g. by a proxy): count CSV records minus the header row.
  const text = await res.data.text();
  return Math.max(0, text.split('\r\n').filter(Boolean).length - 1);
};

export interface EventPropertyKeys {
  eventProperties: string[];
  defaultProperties: string[];
}

export const getEventPropertyKeys = async (
  integrationId: string,
  environment: DataEnvironment,
): Promise<EventPropertyKeys> => {
  const res = await api.get<Envelope<EventPropertyKeys>>(`/sdk-integrations/${integrationId}/event-properties`, {
    params: { environment },
  });
  return res.data.data;
};

export interface UserProfileSummary {
  distinctId: string;
  identified: boolean;
  traits: Record<string, unknown>;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  deviceIds: string[];
  topEvents: Array<{ eventName: string; count: number }>;
}

export const getUserProfile = async (
  integrationId: string,
  environment: DataEnvironment,
  distinctId: string,
): Promise<UserProfileSummary> => {
  const res = await api.get<Envelope<UserProfileSummary>>(
    `/sdk-integrations/${integrationId}/user-profiles/${encodeURIComponent(distinctId)}`,
    { params: { environment } },
  );
  return res.data.data;
};

export interface LexiconEvent {
  id: string;
  eventName: string;
  displayName: string;
  description: string;
  hidden: boolean;
  tags: string[];
  volume30d: number;
  totalVolume: number;
  firstSeen: string;
  lastSeen: string;
  autoTracked: boolean;
}

export const getLexiconEvents = async (
  integrationId: string,
  environment: DataEnvironment,
): Promise<LexiconEvent[]> => {
  const res = await api.get<Envelope<{ events: LexiconEvent[] }>>(`/sdk-integrations/${integrationId}/lexicon/events`, {
    params: { environment },
  });
  return res.data.data.events;
};

export const updateLexiconEvent = async (
  integrationId: string,
  eventId: string,
  patch: Partial<Pick<LexiconEvent, 'displayName' | 'description' | 'hidden' | 'tags'>>,
): Promise<Pick<LexiconEvent, 'id' | 'eventName' | 'displayName' | 'description' | 'hidden' | 'tags'>> => {
  const res = await api.patch<Envelope<LexiconEvent>>(`/sdk-integrations/${integrationId}/lexicon/events/${eventId}`, patch);
  return res.data.data;
};
