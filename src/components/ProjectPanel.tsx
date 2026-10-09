import React, { useState, useMemo } from 'react';
import type { Project } from '@/types/project';
import {
  FolderKanban,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Sparkles,
  X
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import DataTable from './DataTable';
import { useConfirm } from '@/context/ConfirmationContext';

const columnHelper = createColumnHelper<Project>();

interface ProjectPanelProps {
  actionProjectId: string | null;
  loading: boolean;
  onOpenCreateProject: () => void;
  onOpenAiPlanner?: () => void;
  onOpenEpicManager: (project: Project) => void;
  onOpenProject: (projectId: string | null) => void;
  onOpenUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteProjects: (projectIds: string[]) => Promise<void>;
  projects: Project[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
}

function ProjectPanel({
  actionProjectId,
  loading,
  onOpenCreateProject,
  onOpenAiPlanner,
  onOpenEpicManager,
  onOpenProject,
  onOpenUpdateProject,
  onDeleteProject,
  onDeleteProjects,
  projects,
  currentPage,
  totalPages,
  onPageChange,
  onSearch,
  searchTerm,
}: ProjectPanelProps): JSX.Element {
  const confirm = useConfirm();
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          aria-label="Select all projects"
          type="checkbox"
          className="w-4 h-4 cursor-pointer accent-brand-600 align-middle"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) {
              el.indeterminate = table.getIsSomePageRowsSelected();
            }
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            aria-label={`Select ${row.original.name}`}
            type="checkbox"
            className="w-4 h-4 cursor-pointer accent-brand-600 align-middle disabled:opacity-30 disabled:cursor-not-allowed"
            checked={row.getIsSelected()}
            disabled={row.original.currentUserRole !== 'ADMIN'}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      enableSorting: false,
      size: 44,
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center shrink-0">
            <FolderKanban size={15} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-olive-950 truncate">{info.getValue()}</div>
            {info.row.original.description && (
              <div className="text-xs text-olive-500 truncate max-w-[420px]">{info.row.original.description}</div>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('currentUserRole', {
      header: 'Role',
      cell: info => (
        <span className={`badge ${info.getValue() === 'ADMIN' ? 'badge-green' : 'badge-slate'}`}>
          {info.getValue() === 'ADMIN' ? 'Admin' : 'Member'}
        </span>
      ),
      size: 100,
    }),
    columnHelper.accessor('creator', {
      header: 'Owner',
      cell: info => {
        const creator = info.getValue();
        return creator ? (
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar size="sm" name={creator.name} email={creator.email} />
            <span className="text-olive-700 truncate max-w-[160px]">{creator.name || creator.email}</span>
          </div>
        ) : (
          <span className="text-olive-400">—</span>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor('createdAt', {
      id: 'date',
      header: 'Created',
      cell: info => (
        <span className="text-olive-500 tabular-nums whitespace-nowrap" title={formatTime(info.getValue())}>
          {formatDate(info.getValue())}
        </span>
      ),
      size: 130,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        const isAdmin = project.currentUserRole === 'ADMIN';
        return (
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Open epics"
              className="icon-btn disabled:opacity-30"
              disabled={!isAdmin}
              onClick={() => onOpenEpicManager(project)}
              title="Epics"
              type="button"
            >
              <Layers3 size={15} />
            </button>
            <button
              aria-label="Edit project"
              className="icon-btn disabled:opacity-30"
              disabled={!isAdmin}
              onClick={() => onOpenUpdateProject(project)}
              title="Edit"
              type="button"
            >
              <Pencil size={15} />
            </button>
            <button
              aria-label="Delete project"
              className="icon-btn hover:!bg-red-50 hover:!text-red-600 disabled:opacity-30"
              disabled={actionProjectId === project.id || !isAdmin}
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: 'Delete project',
                  message: `Delete "${project.name}"? Its epics, tasks, and notes will be removed. This can't be undone.`,
                  confirmText: 'Delete project',
                  type: 'danger'
                });
                if (isConfirmed) {
                  await onDeleteProject(project.id);
                }
              }}
              title="Delete"
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
      enableSorting: false,
      size: 120,
    }),
  ], [onOpenEpicManager, onOpenUpdateProject, onDeleteProject, actionProjectId]);

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      rowSelection,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
  });

  const selectedProjects = useMemo(() => {
    return table.getSelectedRowModel().flatRows.map(row => row.original);
  }, [rowSelection, projects]);

  const handleDeleteSelected = async () => {
    if (selectedProjects.length === 0) return;

    const isConfirmed = await confirm({
      title: `Delete ${selectedProjects.length} projects`,
      message: `Delete the ${selectedProjects.length} selected projects and everything in them? This can't be undone.`,
      confirmText: 'Delete projects',
      type: 'danger'
    });

    if (!isConfirmed) return;

    await onDeleteProjects(selectedProjects.map(p => p.id));
    setRowSelection({});
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium'
    }).format(new Date(dateString));
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short'
    }).format(new Date(dateString));
  };

  const isEmpty = projects.length === 0 && !loading;

  return (
    <div className=" px-8 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title m-0">Projects</h1>
          <p className="page-subtitle mb-0">Everything your team is working on, in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAiPlanner && (
            <button className="btn btn-secondary" onClick={onOpenAiPlanner} type="button">
              <Sparkles size={15} className="text-brand-600" />
              Plan with AI
            </button>
          )}
          <button className="btn btn-primary" onClick={onOpenCreateProject} type="button">
            <Plus size={16} />
            New project
          </button>
        </div>
      </div>

      {isEmpty && !searchTerm ? (
        <div className="card mt-8 px-6 py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center mb-4">
            <FolderKanban size={22} strokeWidth={1.75} />
          </div>
          <h2 className="text-[17px] font-semibold text-olive-950 m-0">Start your first project</h2>
          <p className="text-[13px] text-olive-500 mt-1.5 mb-6 max-w-sm text-pretty">
            Projects hold your epics, tasks, notes and team. Create one from scratch, or describe your goal and let AI draft the plan.
          </p>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={onOpenCreateProject} type="button">
              <Plus size={16} />
              New project
            </button>
            {onOpenAiPlanner && (
              <button className="btn btn-secondary" onClick={onOpenAiPlanner} type="button">
                <Sparkles size={15} className="text-brand-600" />
                Plan with AI
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-olive-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-olive-400 pointer-events-none" size={15} />
              <input
                aria-label="Search projects"
                className="input-base !h-9 !pl-9 !pr-8"
                onChange={handleSearchChange}
                placeholder="Search projects"
                type="text"
                value={searchTerm}
              />
              {searchTerm && (
                <button
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn !w-6 !h-6"
                  onClick={() => onSearch('')}
                  type="button"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex-1" />
            {selectedProjects.length > 0 && (
              <button className="btn btn-sm btn-secondary !text-red-600 hover:!bg-red-50 hover:!border-red-200" onClick={handleDeleteSelected} type="button">
                <Trash2 size={14} />
                Delete {selectedProjects.length}
              </button>
            )}
          </div>

          {isEmpty ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-olive-900 m-0">No projects match "{searchTerm}"</p>
              <p className="text-[13px] text-olive-500 mt-1 mb-4">Try a different name or clear the search.</p>
              <button className="btn btn-sm btn-secondary" onClick={() => onSearch('')} type="button">
                Clear search
              </button>
            </div>
          ) : (
            <DataTable
              table={table}
              loading={loading}
              onRowClick={(project) => onOpenProject(project.id)}
              skeletonRows={5}
              pagination={{
                page: currentPage,
                totalPages,
                onPageChange
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectPanel;