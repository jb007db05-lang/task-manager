import React from "react";
import { Clock, AlertCircle, Sparkles, User } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  date?: string;
  assignedTo?: { name?: string | null; email?: string };
  isBlocked?: boolean;
}

interface ListViewProps {
  tasks: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onDecomposeAi?: (task: TaskItem) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onTaskClick,
  onDecomposeAi,
}) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-700/40 text-slate-400 border-slate-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "BLOCKED":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-center">
        <Clock className="w-10 h-10 text-slate-500 mb-3" />
        <h4 className="text-slate-300 font-semibold mb-1">No tasks in list</h4>
        <p className="text-slate-500 text-sm">Create a task or plan with AI to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-medium text-slate-400">
            <tr>
              <th className="py-3.5 px-4">Task Title</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Assignee</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="hover:bg-slate-800/50 transition cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-medium text-slate-200">
                  <div className="flex items-center space-x-2">
                    {task.isBlocked && (
                      <span title="Blocked">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      </span>
                    )}
                    <span className="group-hover:text-blue-400 transition">{task.title}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                      task.status,
                    )}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getPriorityBadge(
                      task.priority,
                    )}`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{task.assignedTo?.name || task.assignedTo?.email || "Unassigned"}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-xs">
                  {task.date || "No due date"}
                </td>
                <td className="py-3.5 px-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                  {onDecomposeAi && (
                    <button
                      onClick={() => onDecomposeAi(task)}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded text-xs border border-purple-500/30 transition"
                      title="Decompose with AI"
                    >
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Break Down</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
