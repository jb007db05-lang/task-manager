import React from "react";
import { GitCommitHorizontal, Clock } from "lucide-react";

interface TimelineTask {
  id: string;
  title: string;
  date?: string;
  status: string;
  priority: string;
  epicName?: string;
}

interface TimelineViewProps {
  tasks: TimelineTask[];
  onTaskClick?: (task: TimelineTask) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskClick }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <GitCommitHorizontal className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-slate-100">Project Timeline & Milestones</h3>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          No tasks found on timeline.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="relative group cursor-pointer"
            >
              {/* Dot */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 group-hover:bg-blue-500 transition" />

              <div className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-blue-400 mb-0.5">
                    {task.epicName || "Milestone Task"}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition">
                    {task.title}
                  </h4>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.date || "Scheduled"}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
