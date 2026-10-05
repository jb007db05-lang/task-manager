import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  User, 
  Activity,
  ChevronDown,
  UserCheck
} from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <div className="px-6 py-3 border-b border-olive-200/60  bg-white/40  backdrop-blur-md sticky top-0 z-30 transition-all duration-300">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400 group-focus-within:text-olive-500 transition-colors" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-olive-100/50  border border-olive-200/50  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500/50 transition-all"
          />
          {filters.search && (
            <button 
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-olive-200  rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-olive-400" />
            </button>
          )}
        </div>
        
        {/* Assigned to Me Toggle */}
        {user && (
          <button
            onClick={() => updateFilter('assigneeId', filters.assigneeId === user.id ? 'all' : user.id)}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
              filters.assigneeId === user.id
                ? "bg-olive-100 text-olive-700   border border-olive-200 "
                : "bg-white  border border-olive-200  text-olive-600  hover:border-olive-400"
            ].join(' ')}
          >
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Assigned to Me</span>
          </button>
        )}

        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
            activeFilterCount > 0 || isExpanded
              ? "bg-olive-600 text-white shadow-lg shadow-olive-500/25"
              : "bg-white  border border-olive-200  text-olive-600  hover:border-olive-400"
          ].join(' ')}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 bg-white text-olive-600 rounded-full text-[11px] font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={["w-4 h-4 transition-transform duration-300", isExpanded ? "rotate-180" : ""].join(' ')} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-olive-400 hover:text-red-500 transition-colors uppercase tracking-tight"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-olive-200/50  animate-in fade-in slide-in-from-top-2">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-olive-400 uppercase tracking-widest ml-1">
              <Activity className="w-3 h-3" /> Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full p-2.5 bg-olive-100/50  border border-olive-200/50  rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-olive-500/20"
            >
              <option value="all">All Statuses</option>
              {[...TASK_WORKFLOW_STATUS_OPTIONS, { value: 'rolled_over', label: 'Rolled Over' }].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-olive-400 uppercase tracking-widest ml-1">
              <User className="w-3 h-3" /> Assigned to
            </label>
            <select
              value={filters.assigneeId}
              onChange={(e) => updateFilter('assigneeId', e.target.value)}
              className="w-full p-2.5 bg-olive-100/50  border border-olive-200/50  rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-olive-500/20"
            >
              <option value="all">All Members</option>
              {members.map(member => (
                <option key={member.id} value={member.userId}>{member.user.name || member.user.email}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilterBar;