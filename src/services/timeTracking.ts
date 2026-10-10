import api from './api';

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  name: string;
  email: string;
  hours: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface TimeFilters {
  from?: string;
  to?: string;
  userId?: string;
  taskId?: string;
}

export interface TimeSummary {
  totalHours: number;
  entryCount: number;
  byTask: Array<{ taskId: string; title: string; hours: number; entries: number }>;
  byMember: Array<{ userId: string; name: string; email: string; hours: number; entries: number }>;
  byMemberTask: Array<{ userId: string; taskId: string; name: string; taskTitle: string; hours: number }>;
  daily: Array<{ date: string; hours: number }>;
  weekly: Array<{ week: string; hours: number }>;
}

export interface TimeEntryInput {
  taskId: string;
  hours: number;
  date: string;
  note?: string;
}

const clean = (filters: TimeFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

export const timeTrackingService = {
  async list(projectId: string, filters: TimeFilters = {}, page = 1): Promise<{ entries: TimeEntry[]; totalPages: number }> {
    const res = await api.get<{ data: { entries: TimeEntry[]; totalPages: number } }>(
      `/projects/${projectId}/time-entries`,
      { params: { ...clean(filters), page, limit: 50 } }
    );
    return res.data.data;
  },

  async summary(projectId: string, filters: TimeFilters = {}): Promise<TimeSummary> {
    const res = await api.get<{ data: TimeSummary }>(`/projects/${projectId}/time-summary`, { params: clean(filters) });
    return res.data.data;
  },

  async create(projectId: string, input: TimeEntryInput): Promise<TimeEntry> {
    return (await api.post<{ data: { entry: TimeEntry } }>(`/projects/${projectId}/time-entries`, input)).data.data.entry;
  },

  async update(entryId: string, input: Partial<TimeEntryInput>): Promise<TimeEntry> {
    return (await api.patch<{ data: { entry: TimeEntry } }>(`/time-entries/${entryId}`, input)).data.data.entry;
  },

  async remove(entryId: string): Promise<void> {
    await api.delete(`/time-entries/${entryId}`);
  }
};

export default timeTrackingService;
