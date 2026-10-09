import React, { useState } from "react";
import centralizedAiService, { AIDailyScheduleResponse } from "../services/centralizedAi";
import { Sparkles, Calendar, X } from "lucide-react";

interface AiDailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiDailyPlannerModal: React.FC<AiDailyPlannerModalProps> = ({ isOpen, onClose }) => {
  const [workloadContext, setWorkloadContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<AIDailyScheduleResponse | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handlePlanDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await centralizedAiService.planDailyWork(workloadContext);
      setSchedule(res);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to generate daily schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-base">✨ AI Daily & Sprint Planner</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">{error}</div>}

        {!schedule ? (
          <form onSubmit={handlePlanDay} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Workload Constraints or Focus for Today (Optional)
              </label>
              <textarea
                rows={3}
                value={workloadContext}
                onChange={(e) => setWorkloadContext(e.target.value)}
                placeholder="e.g. Focus 3 hours on critical authentication bugs, 1 hour on PR reviews, leave afternoon open for client demo."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? "Planning Schedule..." : "Plan My Work for Today"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 mb-1">Today's Focus Summary</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{schedule.summary}</p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {schedule.timeBlocks?.map((tb, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-blue-400 px-2 py-1 bg-blue-950/60 rounded border border-blue-800/40 text-[11px]">
                      {tb.time}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200">{tb.taskTitle}</div>
                      {tb.notes && <div className="text-slate-400 text-[11px] mt-0.5">{tb.notes}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSchedule(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ← Re-plan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
