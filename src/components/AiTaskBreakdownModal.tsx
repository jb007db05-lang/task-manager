import React, { useState } from "react";
import centralizedAiService, { AITaskBreakdownResponse } from "../services/centralizedAi";
import { Sparkles, Check, Clock, Layers, X } from "lucide-react";

interface AiTaskBreakdownModalProps {
  isOpen: boolean;
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
  onClose: () => void;
  onApplyBreakdown: (breakdown: AITaskBreakdownResponse) => void;
}

export const AiTaskBreakdownModal: React.FC<AiTaskBreakdownModalProps> = ({
  isOpen,
  taskId,
  taskTitle = "",
  taskDescription = "",
  onClose,
  onApplyBreakdown,
}) => {
  const [title, setTitle] = useState(taskTitle);
  const [description, setDescription] = useState(taskDescription);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<AITaskBreakdownResponse | null>(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDecompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await centralizedAiService.decomposeTask(taskId, title, description);
      setBreakdown(res);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorObj.response?.data?.error || errorObj.message || "Failed to breakdown task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-slate-100 text-base">Decompose Task with AI</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">{error}</div>}

        {!breakdown ? (
          <form onSubmit={handleDecompose} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement JWT authentication and session handling"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide initial context or requirements..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? "Decomposing..." : "Break Down Task"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-100 text-sm">{breakdown.title}</span>
                <span className="text-xs font-semibold text-purple-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Est: {breakdown.estimatedHours} hours</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">{breakdown.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Generated Subtasks ({breakdown.subtasks?.length || 0})</span>
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {breakdown.subtasks?.map((sub, i) => (
                  <div key={i} className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{sub.title}</span>
                    {sub.estimatedHours && <span className="text-slate-400 text-[11px]">{sub.estimatedHours}h</span>}
                  </div>
                ))}
              </div>
            </div>

            {breakdown.rationale && (
              <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl text-xs text-purple-300">
                <span className="font-bold">Rationale: </span>
                {breakdown.rationale}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBreakdown(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ← Edit Prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyBreakdown(breakdown);
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition"
              >
                <Check className="w-4 h-4" />
                <span>Apply Breakdown to Task</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
