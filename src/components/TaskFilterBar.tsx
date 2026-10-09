import React from 'react';
import { Search, X, UserCheck } from 'lucide-react';
import { TaskStatus, TASK_WORKFLOW_STATUS_OPTIONS } from '../types/task';
import { ProjectMember } from '../types/project';
import { useAuth } from '../context/AuthContext';

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  assigneeId: string | 'all';
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  members: ProjectMember[];
  onClear: () => void;
}

const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  onFilterChange,
  members,
  onClear
}) => {
  const { user } = useAuth();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFilter = (key: keyof TaskFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFilterCount = [
    filters.status !== 'all',
    filters.assigneeId !== 'all'
  ].filter(Boolean).length;

  const selectCls = 'h-8 rounded-md border bg-white pl-2.5 pr-7 text-[13px] text-olive-700 shadow-xs hover:border-olive-400 focus:outline-none focus:border-brand-500 focus:shadow-[var(--focus-ring)] appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:12px] transition-colors';
  const chevron = { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236d7769' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 pointer-events-none" />
        <input
          aria-label="Search tasks"
          type="text"
          placeholder="Search tasks"
          value={filters.search}
          onChange={handleSearchChange}
          className="input-base !h-8 !pl-8 !pr-7 !text-[13px]"
        />
        {filters.search && (
          <button
            aria-label="Clear search"
            onClick={() => updateFilter('search', '')}
            className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn !w-6 !h-6"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {user && (
        <button
          aria-pressed={filters.assigneeId === user.id}
          onClick={() => updateFilter('assigneeId', filters.assigneeId === user.id ? 'all' : user.id)}
          className={`btn btn-sm ${filters.assigneeId === user.id ? 'bg-brand-50 text-brand-800 border-brand-200' : 'btn-secondary'}`}
          type="button"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Assigned to me
        </button>
      )}

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
        className={`${selectCls} ${filters.status !== 'all' ? 'border-brand-300 bg-brand-50/50 text-brand-800' : 'border-olive-300'}`}
        style={chevron}
      >
        <option value="all">Any status</option>
        {[...TASK_WORKFLOW_STATUS_OPTIONS, { value: 'rolled_over', label: 'Rolled Over' }].map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        aria-label="Filter by assignee"
        value={filters.assigneeId}
        onChange={(e) => updateFilter('assigneeId', e.target.value)}
        className={`${selectCls} max-w-[180px] ${filters.assigneeId !== 'all' ? 'border-brand-300 bg-brand-50/50 text-brand-800' : 'border-olive-300'}`}
        style={chevron}
      >
        <option value="all">Anyone</option>
        {members.map(member => (
          <option key={member.id} value={member.userId}>{member.user.name || member.user.email}</option>
        ))}
      </select>

      {(activeFilterCount > 0 || filters.search) && (
        <button onClick={onClear} className="btn btn-sm btn-ghost" type="button">
          Reset
        </button>
      )}
    </div>
  );
};

export default TaskFilterBar;