import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Zap,
  NotebookPen,
  MessageSquare,
  Clock,
  Siren,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
} from 'lucide-react';
import type {
  Task,
  Subtask,
  TaskWorkflowStatus,
  TaskPriority,
  UpdateTaskInput,
} from '@/types/task';
import type { ProjectMember } from '@/types/project';
import AssigneeSelector from './AssigneeSelector';
import UserAvatar from './UserAvatar';
import SlaIndicator from './SlaIndicator';
import SourceBadge from './SourceBadge';
import ApprovalSection from './ApprovalSection';
import CommentSection from './CommentSection';
import SubtaskInlineEdit from './SubtaskInlineEdit';

interface TaskInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: ProjectMember[];
  actionTaskId: string | null;
  sidePanelTab: 'subtasks' | 'comments';
  setSidePanelTab: (tab: 'subtasks' | 'comments') => void;
  editingSubtask: { task: Task; subtask: Subtask } | null;
  setEditingSubtask: (state: { task: Task; subtask: Subtask } | null) => void;
  setSubtaskModalTask: (task: Task | null) => void;
  handleUpdateSubtaskStatus: (
    task: Task,
    subtask: Subtask,
    status: TaskWorkflowStatus,
  ) => Promise<void> | void;
  handleUpdateSubtask: (
    task: Task,
    subtask: Subtask,
    patch: { title: string; description?: string; note?: string; assignedToUserId?: string | null },
  ) => Promise<void> | void;
  handleDeleteSubtask: (task: Task, subtaskId: string) => Promise<void> | void;
  handleOpenSubtaskNote: (task: Task, subtask: Subtask) => void;
  handleToggleBlocked: (task: Task) => void;
  handleEvaluatePriority: (taskId: string) => Promise<void> | void;
  isEvaluatingPriority: boolean;
  handleOpenTaskNote: (task: Task) => void;
  handleUpdateTaskField: (taskId: string, updates: UpdateTaskInput) => Promise<void> | void;
}

const statusPillCls: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 shadow-xs',
  active: 'bg-amber-50 text-amber-800 shadow-xs',
  completed: 'bg-emerald-50 text-emerald-800 shadow-xs',
  archived: 'bg-slate-100/50 text-slate-650 shadow-xs',
};

const priorityBadge: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  CRITICAL: {
    icon: <Siren size={12} className="text-red-600 animate-pulse" />,
    label: 'Critical',
    color: 'bg-red-50 text-red-700 shadow-xs',
  },
  HIGH: {
    icon: <ArrowUpCircle size={12} className="text-orange-500" />,
    label: 'High',
    color: 'bg-orange-50 text-orange-700 shadow-xs',
  },
  MEDIUM: {
    icon: <MinusCircle size={12} className="text-amber-500" />,
    label: 'Medium',
    color: 'bg-amber-50 text-amber-700 shadow-xs',
  },
  LOW: {
    icon: <ArrowDownCircle size={12} className="text-slate-500" />,
    label: 'Low',
    color: 'bg-slate-50 text-slate-700 shadow-xs',
  },
};

export default function TaskInspector({
  isOpen,
  onClose,
  task,
  members,
  actionTaskId,
  sidePanelTab,
  setSidePanelTab,
  editingSubtask,
  setEditingSubtask,
  setSubtaskModalTask,
  handleUpdateSubtaskStatus,
  handleUpdateSubtask,
  handleDeleteSubtask,
  handleOpenSubtaskNote,
  handleToggleBlocked,
  handleEvaluatePriority,
  isEvaluatingPriority,
  handleOpenTaskNote,
  handleUpdateTaskField,
}: TaskInspectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!task) return null;

  const completedSubtasks = task.subtasks.filter(s => s.status === 'DONE').length;
  const isUpdating = actionTaskId === task.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/20 backdrop-blur-[2px] z-500"
          />

          {/* Drawer container */}
          <motion.div
            ref={containerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 w-full sm:w-[480px] h-full bg-white/95 shadow-2xl backdrop-blur-xl z-501 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 bg-gradient-to-b from-white to-slate-50/20 shadow-xs">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[0.62rem] uppercase tracking-[0.25em] font-bold text-slate-500">
                      TASK INSPECTOR
                    </span>
                    {task.dynamicPriority && priorityBadge[task.dynamicPriority] && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          priorityBadge[task.dynamicPriority].color
                        }`}
                      >
                        {priorityBadge[task.dynamicPriority].icon}
                        {priorityBadge[task.dynamicPriority].label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold font-sans text-slate-900 m-0 tracking-tight line-clamp-2 max-w-[300px]">
                    {task.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 shrink-0 ml-2"
                title="Close inspector"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subtask & Comments tab switcher */}
            <div className="flex gap-6 px-6 shadow-xs bg-white">
              <button
                onClick={() => setSidePanelTab('subtasks')}
                className={`pb-3 pt-3 text-xs font-bold uppercase tracking-widest transition-all relative ${
                  sidePanelTab === 'subtasks' ? 'text-slate-700' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Subtasks & Specs
                {sidePanelTab === 'subtasks' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setSidePanelTab('comments')}
                className={`pb-3 pt-3 text-xs font-bold uppercase tracking-widest transition-all relative ${
                  sidePanelTab === 'comments' ? 'text-slate-700' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Comments ({task.subtasks.length ? 'Live' : '0'})
                {sidePanelTab === 'comments' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            </div>

            {/* Main content drawer container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white flex flex-col gap-6">
              {sidePanelTab === 'subtasks' ? (
                <div className="flex flex-col gap-6">
                  {/* Action / Assignee / Priority quick properties grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50">
                    <div>
                      <span className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Assignee
                      </span>
                      <AssigneeSelector
                        projectId={task.projectId || null}
                        selectedUserId={task.assignedTo?.id || ''}
                        onSelect={(userId) => {
                          void handleUpdateTaskField(task.id, { assignedTo: userId });
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Priority
                      </span>
                      <div className="relative">
                        <select
                          value={task.priority || 'MEDIUM'}
                          onChange={(e) => {
                            void handleUpdateTaskField(task.id, {
                              priority: e.target.value as TaskPriority,
                            });
                          }}
                          className="w-full text-sm font-medium text-slate-700 bg-slate-100/50 shadow-sm rounded-xl px-3 py-2 cursor-pointer focus:ring-2 focus:ring-slate-500/10 focus:outline-none"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Subtask list */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        Checklist Subtasks ({completedSubtasks}/{task.subtasks.length})
                      </span>
                      <button
                        className="flex items-center justify-center w-7 h-7 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-md transition-all transform active:scale-95 disabled:opacity-40"
                        disabled={!task.permissions.canUpdate}
                        onClick={() => setSubtaskModalTask(task)}
                        title="New Subtask"
                        type="button"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {task.subtasks.length === 0 ? (
                      <div className="rounded-xl p-6 text-center text-xs text-slate-400 bg-slate-50/50 shadow-xs">
                        No subtasks added. Click "+" to create one.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {task.subtasks.map((subtask) => {
                          const isEditingThisSubtask =
                            editingSubtask?.task.id === task.id &&
                            editingSubtask?.subtask.id === subtask.id;
                          return (
                            <div
                              key={subtask.id}
                              className="group relative bg-white shadow-sm rounded-xl p-3.5 transition-all duration-200 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <input
                                    checked={subtask.status === 'DONE'}
                                    className="w-5 h-5 accent-slate-700 cursor-pointer rounded mt-0.5"
                                    disabled={!task.permissions.canUpdate}
                                    onChange={() =>
                                      void handleUpdateSubtaskStatus(
                                        task,
                                        subtask,
                                        subtask.status === 'DONE' ? 'TODO' : 'DONE',
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`text-sm transition-all ${
                                          subtask.status === 'DONE'
                                            ? 'text-slate-400 line-through'
                                            : 'text-slate-900 font-semibold'
                                        }`}
                                      >
                                        {subtask.title}
                                      </span>
                                      {subtask.assignedToUser && (
                                        <UserAvatar
                                          name={subtask.assignedToUser.name}
                                          email={subtask.assignedToUser.email}
                                          size="sm"
                                        />
                                      )}
                                    </div>
                                    {!isEditingThisSubtask && subtask.description && (
                                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                                        {subtask.description}
                                      </p>
                                    )}
                                    {!isEditingThisSubtask && subtask.note && (
                                      <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-slate-50 rounded-lg text-slate-500 text-[0.7rem] font-medium italic shadow-xs">
                                        <MessageSquare
                                          size={12}
                                          className="shrink-0 text-slate-400"
                                        />
                                        <span className="truncate">{subtask.note}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                                    disabled={!task.permissions.canUpdate}
                                    onClick={() =>
                                      setEditingSubtask(
                                        isEditingThisSubtask ? null : { task, subtask },
                                      )
                                    }
                                    title={isEditingThisSubtask ? 'Cancel' : 'Edit Subtask'}
                                    type="button"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                                    onClick={() => handleOpenSubtaskNote(task, subtask)}
                                    title="Subtask Note"
                                    type="button"
                                  >
                                    <FileText size={13} />
                                  </button>
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-650"
                                    disabled={!task.permissions.canUpdate}
                                    onClick={() => void handleDeleteSubtask(task, subtask.id)}
                                    title="Delete Subtask"
                                    type="button"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              {isEditingThisSubtask && (
                                <div className="mt-3 pt-3 shadow-xs">
                                  <SubtaskInlineEdit
                                    subtask={subtask}
                                    onSave={(patch) =>
                                      void handleUpdateSubtask(task, subtask, patch)
                                    }
                                    onCancel={() => setEditingSubtask(null)}
                                    isSaving={isUpdating}
                                    members={members}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SLA timers and details */}
                  <div className="shadow-sm rounded-xl p-5 bg-white relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 m-0 mb-4 flex items-center gap-2">
                      <Clock size={14} className="text-slate-650" /> Dual-Timers
                    </h4>
                    {task.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pl-3 italic mb-4">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2.5 mb-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[0.62rem] font-bold uppercase tracking-wider ${
                          statusPillCls[task.status] ?? 'bg-slate-50 text-slate-600 shadow-xs'
                        }`}
                      >
                        <CheckCircle size={10} /> {task.status.replace(/_/g, ' ')}
                      </span>
                      <SourceBadge source={task.source} />
                      <SlaIndicator task={task} compact />
                      <button
                        type="button"
                        onClick={() => handleToggleBlocked(task)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[0.62rem] font-bold uppercase tracking-wider transition-all shadow-sm ${
                          task.isBlocked
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-red-500 hover:bg-red-50'
                        }`}
                      >
                        <AlertCircle size={10} /> {task.isBlocked ? 'Unblock Task' : 'Block Task'}
                      </button>
                    </div>

                    <div className="grid gap-2.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">Response target due:</span>
                        <span className="font-mono text-[11px]">
                          {task.slaResponseDueAt
                            ? new Date(task.slaResponseDueAt).toLocaleString()
                            : 'Not configured'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">Resolution target due:</span>
                        <span className="font-mono text-[11px]">
                          {task.slaResolutionDueAt
                            ? new Date(task.slaResolutionDueAt).toLocaleString()
                            : 'Not configured'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">First Response registered:</span>
                        <span
                          className={`font-mono text-[11px] ${
                            task.firstResponseAt ? 'text-emerald-700' : 'text-neutral-400'
                          }`}
                        >
                          {task.firstResponseAt
                            ? new Date(task.firstResponseAt).toLocaleString()
                            : 'Awaiting action'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">Completed at:</span>
                        <span
                          className={`font-mono text-[11px] ${
                            task.completedAt ? 'text-emerald-700' : 'text-neutral-400'
                          }`}
                        >
                          {task.completedAt
                            ? new Date(task.completedAt).toLocaleString()
                            : 'In-progress'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">Timer Paused details:</span>
                        <span className="font-mono text-[11px] text-amber-600">
                          {task.slaPausedAt
                            ? `Paused on ${new Date(task.slaPausedAt).toLocaleDateString()}`
                            : 'Active SLA Running'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-semibold text-slate-500">Vector priority factor:</span>
                        <span className="font-bold font-mono text-emerald-800">
                          {task.dynamicPriority} (Score: {task.dynamicPriorityScore})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">Cascade impact weight:</span>
                        <span className="font-mono text-[11px]">
                          {task.impactScore} Org impact, {task.dependencyWeight} blocked items
                        </span>
                      </div>
                      {task.priorityEscalationReason && (
                        <div className="mt-2 p-3 bg-red-50/40 rounded-lg">
                          <span className="font-bold text-red-700 block mb-1">
                            Escalation Trigger:
                          </span>
                          <p className="m-0 text-red-650 leading-relaxed text-xs">
                            {task.priorityEscalationReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => void handleEvaluatePriority(task.id)}
                        disabled={isEvaluatingPriority}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100/80 shadow-md text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Zap size={13} className="text-amber-500" />
                        {isEvaluatingPriority
                          ? 'Calculating priorities...'
                          : 'Evaluate Dynamic Priority'}
                      </button>
                    </div>
                  </div>

                  {/* Work Notes */}
                  <button
                    className="w-full group/btn relative flex items-center justify-center gap-2.5 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all overflow-hidden"
                    onClick={() => handleOpenTaskNote(task)}
                    type="button"
                  >
                    <NotebookPen
                      size={18}
                      className="transition-transform group-hover/btn:rotate-12"
                    />
                    Manage Work Notes
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  </button>

                  {/* Approvals */}
                  <ApprovalSection
                    projectId={task.projectId || ''}
                    taskId={task.id}
                    members={members}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-[350px]">
                  <CommentSection taskId={task.id} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
