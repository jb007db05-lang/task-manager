import React, { useState, useEffect } from "react";
import { workspaceService, Workspace } from "../services/workspaces";
import { Plus, UserPlus, Check, ChevronDown, Building } from "lucide-react";

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onSelectWorkspace: (workspace: Workspace) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  currentWorkspaceId,
  onSelectWorkspace,
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const list = await workspaceService.listWorkspaces();
      setWorkspaces(list);
      if (list.length > 0 && !currentWorkspaceId) {
        onSelectWorkspace(list[0]);
      }
    } catch (err: unknown) {
      console.error("Failed to load workspaces", err);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const created = await workspaceService.createWorkspace(newWorkspaceName);
      setWorkspaces((prev) => [...prev, created]);
      onSelectWorkspace(created);
      setNewWorkspaceName("");
      setShowCreateModal(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setLoading(true);
    setError("");
    try {
      await workspaceService.inviteMember(activeWorkspace.id, inviteEmail);
      setInviteEmail("");
      setShowInviteModal(false);
      alert(`Invitation sent to ${inviteEmail}`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
      >
        <div className="flex items-center space-x-2.5 truncate">
          <div className="w-6 h-6 rounded bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
            <Building className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{activeWorkspace ? activeWorkspace.name : "Select Workspace"}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 text-sm">
          <div className="px-2 py-1.5 text-xs font-medium text-slate-400">
            Workspaces
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition ${
                  ws.id === activeWorkspace?.id
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspace?.id && <Check className="w-4 h-4 text-blue-400 ml-2" />}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800 mt-1 pt-1 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Create New Workspace</span>
            </button>
            {activeWorkspace && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowInviteModal(true);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Invite Members</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Create New Workspace</h3>
            {error && <div className="mb-4 text-sm text-red-400 bg-red-950/50 p-2.5 rounded-lg">{error}</div>}
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp Product Team"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition"
                >
                  {loading ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Invite to {activeWorkspace?.name}</h3>
            {error && <div className="mb-4 text-sm text-red-400 bg-red-950/50 p-2.5 rounded-lg">{error}</div>}
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  User Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition"
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
