import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  FolderPlus,
  Search,
  Folder as FolderIcon,
  Star,
  GitBranch,
  Layers,
  Trash2,
  Edit,
  Play,
  Rocket,
  FlaskConical,
} from "lucide-react";
import {
  promptService,
  PromptItem,
  PromptFolder,
  PromptFeature,
} from "@/services/prompts";
import { PromptEditorModal } from "@/components/PromptEditorModal";
import { PromptVersionCompareModal } from "@/components/PromptVersionCompareModal";
import { PromptDeploymentModal } from "@/components/PromptDeploymentModal";

interface PromptLibraryPageProps {
  workspaceId: string;
}

export const PromptLibraryPage: React.FC<PromptLibraryPageProps> = ({
  workspaceId,
}) => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [folders, setFolders] = useState<PromptFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [showTemplatesOnly, setShowTemplatesOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [comparePrompt, setComparePrompt] = useState<PromptItem | null>(null);

  const [deployPrompt, setDeployPrompt] = useState<PromptItem | null>(null);
  const [features, setFeatures] = useState<PromptFeature[]>([]);

  const [newFolderName, setNewFolderName] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId, selectedFolderId, selectedCategory, searchQuery, showFavoritesOnly, showTemplatesOnly]);

  useEffect(() => {
    if (workspaceId) {
      promptService
        .listFeatures(workspaceId)
        .then(setFeatures)
        .catch((err) => console.error("Failed to load AI features", err));
    }
  }, [workspaceId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [foldersList, promptsList] = await Promise.all([
        promptService.listFolders(workspaceId),
        promptService.listPrompts(workspaceId, {
          category: selectedCategory || undefined,
          folderId: selectedFolderId === null ? undefined : selectedFolderId,
          search: searchQuery || undefined,
          isFavorite: showFavoritesOnly || undefined,
          isTemplate: showTemplatesOnly || undefined,
        }),
      ]);
      setFolders(foldersList);
      setPrompts(promptsList);
    } catch (err) {
      console.error("Failed to load prompt library data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await promptService.createFolder(workspaceId, { name: newFolderName.trim() });
      setNewFolderName("");
      setIsCreatingFolder(false);
      const updatedFolders = await promptService.listFolders(workspaceId);
      setFolders(updatedFolders);
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder? Prompts inside will be moved to root.")) return;
    try {
      await promptService.deleteFolder(workspaceId, folderId);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      const updatedFolders = await promptService.listFolders(workspaceId);
      setFolders(updatedFolders);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await promptService.toggleFavorite(workspaceId, promptId);
      setPrompts((prev) =>
        prev.map((p) => (p._id === promptId ? { ...p, isFavorite: res.isFavorite } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePrompt = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to archive this prompt?")) return;
    try {
      await promptService.deletePrompt(workspaceId, promptId);
      setPrompts((prev) => prev.filter((p) => p._id !== promptId));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    { id: "", label: "All Categories" },
    { id: "general", label: "General" },
    { id: "development", label: "Development" },
    { id: "backend", label: "Backend" },
    { id: "frontend", label: "Frontend" },
    { id: "database", label: "Database" },
    { id: "ui-ux", label: "UI / UX" },
    { id: "documentation", label: "Documentation" },
    { id: "testing", label: "Testing" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="min-h-full bg-olive-50 text-olive-950 p-6 space-y-6 font-sans">
      {/* Header Panel */}
      <div className="bg-white border border-olive-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-olive-900 text-white shadow-md shadow-olive-900/10">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-olive-950 flex items-center gap-2.5">
              Prompt Library & Versioning
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-olive-100 text-olive-800 border border-olive-200 font-mono">
                PromptOps v1.0
              </span>
            </h1>
            <p className="text-xs text-olive-600 mt-0.5">
              Manage reusable prompt templates, Handlebars variables, SHA-256 canonical version hashes, and folders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/playground")}
            className="px-4 py-2 rounded-xl bg-olive-100 hover:bg-olive-200 border border-olive-300 text-olive-950 text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <Play className="w-4 h-4 text-emerald-600 fill-current" /> Open Playground
          </button>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-olive-50 border border-olive-200 text-olive-700 hover:text-olive-950 text-xs font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-olive-600" /> New Folder
          </button>
          <button
            onClick={() => {
              setEditingPrompt(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-olive-900 hover:bg-black text-white text-xs font-semibold shadow-md shadow-olive-900/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Create Prompt Template
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-5 bg-white border border-olive-200 rounded-2xl p-5 shadow-sm">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-olive-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts or tags..."
              className="w-full bg-olive-50/50 border border-olive-200 rounded-xl pl-9 pr-3 py-2 text-xs text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-olive-500 uppercase tracking-wider px-2 mb-2">
              Quick Views
            </div>
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setShowFavoritesOnly(false);
                setShowTemplatesOnly(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                selectedFolderId === null && !showFavoritesOnly && !showTemplatesOnly
                  ? "bg-olive-900 text-white font-semibold shadow-sm"
                  : "text-olive-600 hover:bg-olive-50 hover:text-olive-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> All Prompts
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                selectedFolderId === null && !showFavoritesOnly && !showTemplatesOnly
                  ? "bg-olive-800 text-olive-100"
                  : "bg-olive-100 text-olive-700"
              }`}>
                {prompts.length}
              </span>
            </button>

            <button
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly);
                setShowTemplatesOnly(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                showFavoritesOnly
                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                  : "text-olive-600 hover:bg-olive-50 hover:text-olive-950"
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-current" /> Favorites
              </span>
            </button>
          </div>

          {/* Folders List */}
          <div className="space-y-1.5 pt-3 border-t border-olive-200">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[11px] font-semibold text-olive-500 uppercase tracking-wider">
                Folders ({folders.length})
              </span>
            </div>

            {isCreatingFolder && (
              <div className="p-2.5 bg-olive-50 border border-olive-200 rounded-xl space-y-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="w-full bg-white border border-olive-200 rounded-lg px-2.5 py-1 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2 py-1 text-[11px] text-olive-600 hover:text-olive-950"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    className="px-2.5 py-1 text-[11px] bg-olive-900 text-white rounded-md font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {folders.map((f) => (
              <div
                key={f._id}
                onClick={() => setSelectedFolderId(f._id)}
                className={`group px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition ${
                  selectedFolderId === f._id
                    ? "bg-olive-900 text-white font-semibold shadow-sm"
                    : "text-olive-600 hover:bg-olive-50 hover:text-olive-950"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FolderIcon className={`w-4 h-4 shrink-0 ${selectedFolderId === f._id ? "text-olive-200" : "text-olive-500"}`} />
                  <span className="truncate">{f.name}</span>
                </span>
                <button
                  onClick={(e) => handleDeleteFolder(f._id, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition ${selectedFolderId === f._id ? "text-olive-300" : "text-olive-400"}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Categories Selector */}
          <div className="space-y-1.5 pt-3 border-t border-olive-200">
            <div className="text-[11px] font-semibold text-olive-500 uppercase tracking-wider px-2 mb-1">
              Categories
            </div>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === c.id
                    ? "bg-olive-100 text-olive-950 font-semibold"
                    : "text-olive-600 hover:bg-olive-50 hover:text-olive-950"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="text-center py-20 text-olive-500 text-xs">
              Loading prompt library...
            </div>
          ) : prompts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-olive-200 shadow-sm space-y-3">
              <div className="p-3.5 w-12 h-12 rounded-2xl bg-olive-100 text-olive-800 border border-olive-200 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-olive-950">No Prompts Found</h3>
              <p className="text-xs text-olive-600 max-w-sm mx-auto">
                No prompts match your filter parameters. Create a new prompt template to start managing versions.
              </p>
              <button
                onClick={() => {
                  setEditingPrompt(null);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-olive-900 text-white text-xs font-semibold shadow-md shadow-olive-900/20 hover:bg-black transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Prompt Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.map((p) => (
                <div
                  key={p._id}
                  className="p-5 rounded-2xl bg-white border border-olive-200 hover:border-olive-300 transition flex flex-col justify-between group space-y-4 shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2">
                    {/* Header bar */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-olive-950 group-hover:text-olive-700 transition">
                            {p.name}
                          </h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-olive-100 text-olive-800 border border-olive-200 font-bold">
                            v{p.version}
                          </span>
                        </div>
                        {p.deployment && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              prod v{p.deployment.productionVersion}
                            </span>
                            {p.deployment.stagingVersion && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                                staging v{p.deployment.stagingVersion}
                              </span>
                            )}
                            {p.deployment.canary && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1">
                                <FlaskConical className="w-3 h-3" />
                                canary v{p.deployment.canary.version} · {p.deployment.canary.percentage}%
                              </span>
                            )}
                            {p.deployment.featureKey && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-olive-900 text-white font-semibold">
                                {features.find((f) => f.key === p.deployment?.featureKey)?.label ||
                                  p.deployment.featureKey}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-olive-600 line-clamp-2 mt-1">
                          {p.description || "No description provided."}
                        </p>
                      </div>

                      <button
                        onClick={(e) => handleToggleFavorite(p._id, e)}
                        className={`p-1.5 rounded-lg transition ${
                          p.isFavorite
                            ? "text-amber-500 bg-amber-50"
                            : "text-olive-300 hover:text-olive-600"
                        }`}
                      >
                        <Star className={`w-4 h-4 ${p.isFavorite ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    {/* Metadata & Tag Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-olive-100 text-olive-800 border border-olive-200">
                        {p.category}
                      </span>
                      {p.hash && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {p.hash.slice(0, 8)}
                        </span>
                      )}
                      {(p.variables || []).length > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                          {p.variables.length} vars
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Snippet */}
                  <div className="p-3 rounded-xl bg-olive-50/70 border border-olive-200/80 font-mono text-xs text-olive-800 line-clamp-3">
                    {p.body}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-olive-200 pt-3 text-xs text-olive-500">
                    <span className="text-[11px] text-olive-600">
                      By {p.createdBy?.name || "System"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/playground?promptId=${p._id}&version=${p.version}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-olive-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Open in Playground"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" /> Open in Playground
                      </button>

                      <button
                        onClick={() => setDeployPrompt(p)}
                        className="p-1.5 rounded-lg bg-olive-50 hover:bg-olive-100 text-olive-800 border border-olive-200 transition"
                        title="Deploy: feature, production & canary"
                      >
                        <Rocket className="w-3.5 h-3.5 text-olive-700" />
                      </button>

                      <button
                        onClick={() => {
                          setComparePrompt(p);
                          setIsCompareOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-olive-50 hover:bg-olive-100 text-olive-800 border border-olive-200 transition"
                        title="Compare versions"
                      >
                        <GitBranch className="w-3.5 h-3.5 text-olive-700" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingPrompt(p);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-olive-50 hover:bg-olive-100 text-olive-700 hover:text-olive-950 border border-olive-200 transition"
                        title="Edit prompt"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDeletePrompt(p._id, e)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200 transition"
                        title="Archive prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <PromptEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        workspaceId={workspaceId}
        folders={folders}
        existingPrompt={editingPrompt}
        onSaved={() => {
          loadData();
        }}
        onOpenPlayground={(p) => {
          navigate(`/playground?promptId=${p._id}&version=${p.version}`);
        }}
      />

      {/* Deployment Modal */}
      {deployPrompt && (
        <PromptDeploymentModal
          isOpen={!!deployPrompt}
          onClose={() => setDeployPrompt(null)}
          workspaceId={workspaceId}
          prompt={deployPrompt}
          onChanged={() => {
            loadData();
            promptService.listFeatures(workspaceId).then(setFeatures).catch(() => {});
          }}
        />
      )}

      {/* Compare Modal */}
      {comparePrompt && (
        <PromptVersionCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          workspaceId={workspaceId}
          prompt={comparePrompt}
          onOpenPlayground={(p, ver) => {
            navigate(`/playground?promptId=${p._id}&version=${ver || p.version}`);
          }}
        />
      )}
    </div>
  );
};

export default PromptLibraryPage;
