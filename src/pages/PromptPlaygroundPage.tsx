import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Play,
  Copy,
  Check,
  Sparkles,
  GitCompare,
  Sliders,
  Code2,
  Save,
  Clock,
  Layers,
  Cpu,
  Zap,
  Eye,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Folder as FolderIcon,
  FolderOpen,
  X,
  RotateCcw,
  SlidersHorizontal,
  FolderPlus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  promptService,
  PromptItem,
  PromptVersion,
  PromptFolder,
  IPromptMessage,
  IPromptVariable,
  PlaygroundRunResult,
} from "@/services/prompts";

export interface PlaygroundRunItem {
  id: string;
  timestamp: string;
  promptName: string;
  versionNumber?: number;
  variableValues: Record<string, any>;
  provider: string;
  modelName: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  resolvedPrompt: string | IPromptMessage[];
  output: string;
  latencyMs: number;
  tokens?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

interface PromptPlaygroundPageProps {
  workspaceId: string;
}

export const PromptPlaygroundPage: React.FC<PromptPlaygroundPageProps> = ({
  workspaceId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPromptId = searchParams.get("promptId");
  const urlVersionNum = searchParams.get("version");

  // Folders & Prompts Data State
  const [folders, setFolders] = useState<PromptFolder[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(true);

  // Active Selection State
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<PromptItem | null>(null);
  const [versionsList, setVersionsList] = useState<PromptVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [activeVersionDoc, setActiveVersionDoc] = useState<PromptVersion | null>(null);

  // Inline Prompt Editor Mode vs View Mode State
  const [isEditingPromptContent, setIsEditingPromptContent] = useState<boolean>(false);
  const [isCreatingNewPrompt, setIsCreatingNewPrompt] = useState<boolean>(false);

  // Editable Form State (New or Edit)
  const [newPromptName, setNewPromptName] = useState<string>("");
  const [newPromptDesc, setNewPromptDesc] = useState<string>("");
  const [newPromptCategory, setNewPromptCategory] = useState<string>("general");
  const [newPromptFolderId, setNewPromptFolderId] = useState<string>("");
  const [newPromptTags, setNewPromptTags] = useState<string>("");

  // Template Body & Multi-role Messages State
  const [editorMode, setEditorMode] = useState<"blocks" | "raw">("blocks");
  const [body, setBody] = useState<string>("");
  const [messages, setMessages] = useState<IPromptMessage[]>([
    { role: "system", content: "You are a senior developer assistant." },
    { role: "user", content: "Analyze the following module: {{module_name}}" },
  ]);

  // Variables Schema & Runtime Test Values
  const [variablesSchema, setVariablesSchema] = useState<IPromptVariable[]>([]);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, any>>({});
  const [previewMode, setPreviewMode] = useState<"template" | "resolved">("resolved");

  // Right Parameters Drawer State
  const [isParametersDrawerOpen, setIsParametersDrawerOpen] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>("gemini");
  const [modelName, setModelName] = useState<string>("gemini-3.6-flash");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [topP, setTopP] = useState<number>(0.95);

  // Execution & Output State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<PlaygroundRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Side-by-Side Comparison State
  const [isComparingRuns, setIsComparingRuns] = useState<boolean>(false);
  const [compareRunIdA, setCompareRunIdA] = useState<string>("");
  const [compareRunIdB, setCompareRunIdB] = useState<string>("");

  // Save Modal States
  const [showSaveVersionModal, setShowSaveVersionModal] = useState<boolean>(false);
  const [saveVersionNote, setSaveVersionNote] = useState<string>("");
  const [showSaveNewPromptModal, setShowSaveNewPromptModal] = useState<boolean>(false);
  const [saveNewPromptTitle, setSaveNewPromptTitle] = useState<string>("");
  const [saveNewPromptDesc, setSaveNewPromptDesc] = useState<string>("");
  const [saveNewPromptCategory, setSaveNewPromptCategory] = useState<string>("general");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Mobile layout state
  const [mobileTab, setMobileTab] = useState<"sidebar" | "main" | "params">("main");

  // Auto-dismiss notification toasts
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // Load Folders & Prompts on Workspace Mount
  useEffect(() => {
    if (workspaceId) {
      loadLibraryData();
    }
  }, [workspaceId]);

  const loadLibraryData = async () => {
    try {
      setIsLoadingLibrary(true);
      const [foldersList, promptsList] = await Promise.all([
        promptService.listFolders(workspaceId),
        promptService.listPrompts(workspaceId),
      ]);
      setFolders(foldersList);
      setPrompts(promptsList);

      // Expand all folders by default
      const expMap: Record<string, boolean> = { uncategorized: true };
      foldersList.forEach((f) => {
        expMap[f._id] = true;
      });
      setExpandedFolders(expMap);

      // Check URL parameters for prompt selection
      if (urlPromptId) {
        setSelectedPromptId(urlPromptId);
      } else if (promptsList.length > 0 && !selectedPromptId) {
        setSelectedPromptId(promptsList[0]._id);
      }
    } catch (err) {
      console.error("Failed to load prompt library", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Synchronize when selectedPromptId or URL changes
  useEffect(() => {
    if (!workspaceId || !selectedPromptId) return;

    const fetchPromptDetails = async () => {
      try {
        const promptDoc = await promptService.getPromptDetails(workspaceId, selectedPromptId);
        setActivePrompt(promptDoc);

        const versions = await promptService.getPromptVersions(workspaceId, selectedPromptId);
        setVersionsList(versions);

        const targetVerNum = urlVersionNum ? Number(urlVersionNum) : promptDoc.version;
        setSelectedVersionNum(targetVerNum);

        const matchVer = versions.find((v) => v.version === targetVerNum);
        applyPromptVersionDoc(promptDoc, matchVer || null);

        setIsCreatingNewPrompt(false);
        setIsEditingPromptContent(false);
      } catch (err) {
        console.error("Failed to fetch prompt details", err);
      }
    };

    fetchPromptDetails();
  }, [selectedPromptId, urlVersionNum, workspaceId]);

  // Apply template & variable schema when active version or prompt changes
  const applyPromptVersionDoc = (prompt: PromptItem, verDoc: PromptVersion | null) => {
    setActiveVersionDoc(verDoc);
    const contentBody = verDoc ? verDoc.body : prompt.body || "";
    const contentMsgs = verDoc
      ? verDoc.messages || []
      : prompt.messages && prompt.messages.length > 0
        ? prompt.messages
        : [];
    const schema = verDoc ? verDoc.variables || [] : prompt.variables || [];

    setBody(contentBody);
    setMessages(contentMsgs);
    setVariablesSchema(schema);
    setEditorMode(contentMsgs.length > 0 ? "blocks" : "raw");

    // Reconcile runtime test values with detected placeholders
    const detectedNames = extractHandlebarsVariables(contentBody, contentMsgs);
    const schemaMap = new Map(schema.map((v) => [v.name, v]));

    setRuntimeValues((prevValues) => {
      const nextValues: Record<string, any> = {};
      detectedNames.forEach((varName) => {
        if (prevValues[varName] !== undefined && prevValues[varName] !== "") {
          nextValues[varName] = prevValues[varName];
        } else {
          const varSchema = schemaMap.get(varName);
          nextValues[varName] = varSchema?.defaultValue ?? "";
        }
      });
      return nextValues;
    });
  };

  // Switch Version
  const handleVersionChange = (verNum: number) => {
    setSelectedVersionNum(verNum);
    setSearchParams({ promptId: selectedPromptId || "", version: String(verNum) });
    if (!activePrompt) return;
    const matchVer = versionsList.find((v) => v.version === verNum);
    applyPromptVersionDoc(activePrompt, matchVer || null);
  };

  // Handlebars regex variable detector
  const extractHandlebarsVariables = (b: string, msgs: IPromptMessage[]): string[] => {
    const combined = msgs.length > 0 ? msgs.map((m) => m.content).join("\n") : b;
    const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const set = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(combined)) !== null) {
      if (match[1]) {
        set.add(match[1].trim());
      }
    }
    return Array.from(set);
  };

  // Detected active variable list
  const activeDetectedVariables = useMemo(() => {
    return extractHandlebarsVariables(body, messages);
  }, [body, messages]);

  // Sync variables schema with auto-detected Handlebars placeholders
  useEffect(() => {
    setVariablesSchema((prev) => {
      const prevMap = new Map(prev.map((v) => [v.name, v]));
      const updated: IPromptVariable[] = [];

      // Retain existing schemas that are still in content
      prev.forEach((v) => {
        if (activeDetectedVariables.includes(v.name)) {
          updated.push(v);
        }
      });

      // Add newly detected placeholders
      activeDetectedVariables.forEach((name) => {
        if (!prevMap.has(name)) {
          updated.push({
            name,
            type: "string",
            description: `Auto-detected from {{${name}}}`,
            defaultValue: "",
            required: true,
          });
        }
      });

      return updated;
    });
  }, [activeDetectedVariables]);

  // Compute local resolved prompt preview (substituting runtime test values)
  const resolvedPreview = useMemo(() => {
    if (messages.length > 0) {
      return messages.map((m) => {
        let content = m.content;
        activeDetectedVariables.forEach((vKey) => {
          const val = runtimeValues[vKey] ?? "";
          const regex = new RegExp(`\\{\\{\\s*${vKey}\\s*\\}\\}`, "g");
          content = content.replace(regex, String(val));
        });
        return { ...m, content };
      });
    } else {
      let content = body;
      activeDetectedVariables.forEach((vKey) => {
        const val = runtimeValues[vKey] ?? "";
        const regex = new RegExp(`\\{\\{\\s*${vKey}\\s*\\}\\}`, "g");
        content = content.replace(regex, String(val));
      });
      return content;
    }
  }, [body, messages, activeDetectedVariables, runtimeValues]);

  // Filter prompts by search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return prompts;
    const q = searchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [prompts, searchQuery]);

  // Group prompts by folder
  const promptsByFolder = useMemo(() => {
    const map: Record<string, PromptItem[]> = { uncategorized: [] };
    folders.forEach((f) => {
      map[f._id] = [];
    });
    filteredPrompts.forEach((p) => {
      if (p.folderId && map[p.folderId]) {
        map[p.folderId].push(p);
      } else {
        map.uncategorized.push(p);
      }
    });
    return map;
  }, [folders, filteredPrompts]);

  // Handle prompt select from sidebar
  const handleSelectPrompt = (promptId: string) => {
    setSelectedPromptId(promptId);
    setSearchParams({ promptId });
    setMobileTab("main");
  };

  // Start New Prompt Workspace Editor
  const handleStartNewPrompt = () => {
    setSelectedPromptId(null);
    setActivePrompt(null);
    setIsCreatingNewPrompt(true);
    setIsEditingPromptContent(true);
    setNewPromptName("");
    setNewPromptDesc("");
    setNewPromptCategory("general");
    setNewPromptFolderId("");
    setNewPromptTags("");
    setBody("Write your prompt with {{variable}} placeholders...");
    setMessages([
      { role: "system", content: "You are an expert AI assistant." },
      { role: "user", content: "Process the following input: {{user_input}}" },
    ]);
    setVariablesSchema([]);
    setRuntimeValues({ user_input: "Sample test value" });
    setMobileTab("main");
  };

  // Create Prompt from Workspace Editor
  const handleCreatePromptSubmit = async () => {
    if (!newPromptName.trim()) {
      setErrorMsg("Prompt name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const tags = newPromptTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const contentBody =
        editorMode === "blocks"
          ? messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n")
          : body;

      const created = await promptService.createPrompt(workspaceId, {
        name: newPromptName.trim(),
        description: newPromptDesc.trim(),
        category: newPromptCategory,
        folderId: newPromptFolderId || null,
        tags,
        body: contentBody,
        messages: editorMode === "blocks" ? messages : [],
        variables: variablesSchema,
      });

      setSuccessMsg(`Prompt "${created.name}" created successfully.`);
      setIsCreatingNewPrompt(false);
      setIsEditingPromptContent(false);

      // Refresh sidebar library and select created prompt
      await loadLibraryData();
      setSelectedPromptId(created._id);
      setSearchParams({ promptId: created._id });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(errorObj.response?.data?.message || errorObj.message || "Failed to create prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes to Existing Prompt in Workspace Editor
  const handleSaveExistingPromptChanges = async () => {
    if (!selectedPromptId || !activePrompt) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const contentBody =
        editorMode === "blocks"
          ? messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n")
          : body;

      const updated = await promptService.updatePrompt(workspaceId, selectedPromptId, {
        body: contentBody,
        messages: editorMode === "blocks" ? messages : [],
        variables: variablesSchema,
        changeNote: `Updated in Playground Editor (${new Date().toLocaleTimeString()})`,
      });

      setSuccessMsg(`Prompt "${updated.name}" updated to v${updated.version}.`);
      setIsEditingPromptContent(false);

      // Refresh version list & prompt details
      const versions = await promptService.getPromptVersions(workspaceId, selectedPromptId);
      setVersionsList(versions);
      const promptDoc = await promptService.getPromptDetails(workspaceId, selectedPromptId);
      setActivePrompt(promptDoc);
      setSelectedVersionNum(promptDoc.version);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(errorObj.response?.data?.message || errorObj.message || "Failed to save prompt changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Run Prompt Execution via Backend AI Integration
  const handleRunPlayground = async () => {
    setErrorMsg(null);

    // Validate missing required variables
    const missingReq: string[] = [];
    activeDetectedVariables.forEach((varName) => {
      const schemaDef = variablesSchema.find((s) => s.name === varName);
      if (
        schemaDef?.required &&
        (!runtimeValues[varName] || String(runtimeValues[varName]).trim() === "")
      ) {
        missingReq.push(varName);
      }
    });

    if (missingReq.length > 0) {
      setErrorMsg(`Missing required runtime test variable(s): ${missingReq.join(", ")}`);
      return;
    }

    setIsExecuting(true);

    try {
      const res: PlaygroundRunResult = await promptService.runPlayground(workspaceId, {
        promptId: selectedPromptId || undefined,
        versionNumber: selectedVersionNum,
        body,
        messages: messages.length > 0 ? messages : undefined,
        variables: runtimeValues,
        provider,
        modelName,
        parameters: {
          temperature,
          maxTokens,
          topP,
        },
      });

      const newRunItem: PlaygroundRunItem = {
        id: `run-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        promptName: activePrompt ? activePrompt.name : newPromptName || "Playground Session",
        versionNumber: selectedVersionNum,
        variableValues: { ...runtimeValues },
        provider: res.metadata.provider,
        modelName: res.metadata.modelName,
        parameters: { temperature, maxTokens, topP },
        resolvedPrompt: res.resolvedPrompt,
        output: res.output,
        latencyMs: res.metadata.latencyMs,
        tokens: {
          inputTokens: res.metadata.inputTokens,
          outputTokens: res.metadata.outputTokens,
          totalTokens: res.metadata.totalTokens,
        },
      };

      setRunHistory((prev) => [newRunItem, ...prev]);
      setSelectedRunId(newRunItem.id);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(
        errorObj.response?.data?.message ||
        errorObj.message ||
        "Failed to execute prompt through AI service provider.",
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Selected active run document from history
  const currentActiveRun = useMemo(() => {
    if (!selectedRunId && runHistory.length > 0) return runHistory[0];
    return runHistory.find((r) => r.id === selectedRunId) || runHistory[0] || null;
  }, [runHistory, selectedRunId]);

  // Copy output text
  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save Experiment as New Version
  const handleSaveAsVersionSubmit = async () => {
    if (!selectedPromptId || !activePrompt) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const contentBody =
        editorMode === "blocks"
          ? messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n")
          : body;

      await promptService.updatePrompt(workspaceId, selectedPromptId, {
        body: contentBody,
        messages: messages.length > 0 ? messages : undefined,
        variables: variablesSchema,
        changeNote:
          saveVersionNote.trim() ||
          `Playground experiment version (${new Date().toLocaleDateString()})`,
      });

      setShowSaveVersionModal(false);
      setSaveVersionNote("");
      setSuccessMsg("Experiment saved as a new version.");

      // Refresh version list
      const versions = await promptService.getPromptVersions(workspaceId, selectedPromptId);
      setVersionsList(versions);
      const promptDoc = await promptService.getPromptDetails(workspaceId, selectedPromptId);
      setActivePrompt(promptDoc);
      setSelectedVersionNum(promptDoc.version);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(errorObj.response?.data?.message || errorObj.message || "Failed to save version.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Experiment as New Prompt
  const handleSaveAsNewPromptSubmit = async () => {
    if (!saveNewPromptTitle.trim()) {
      setErrorMsg("New prompt name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const contentBody =
        editorMode === "blocks"
          ? messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n")
          : body;

      const created = await promptService.createPrompt(workspaceId, {
        name: saveNewPromptTitle.trim(),
        description: saveNewPromptDesc.trim() || "Created from Playground experiment",
        category: saveNewPromptCategory,
        body: contentBody,
        messages: messages.length > 0 ? messages : undefined,
        variables: variablesSchema,
      });

      setShowSaveNewPromptModal(false);
      setSaveNewPromptTitle("");
      setSaveNewPromptDesc("");
      setSuccessMsg(`New prompt "${created.name}" created.`);

      // Switch to new prompt
      await loadLibraryData();
      setSelectedPromptId(created._id);
      setSearchParams({ promptId: created._id });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(errorObj.response?.data?.message || errorObj.message || "Failed to create new prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if non-default parameters are set
  const isCustomParametersActive =
    provider !== "gemini" ||
    modelName !== "gemini-3.6-flash" ||
    temperature !== 0.7 ||
    maxTokens !== 2048 ||
    topP !== 0.95;

  const runA = runHistory.find((r) => r.id === compareRunIdA) || runHistory[0];
  const runB = runHistory.find((r) => r.id === compareRunIdB) || runHistory[1] || runHistory[0];

  return (
    <div className="h-full flex flex-col bg-olive-50 text-olive-950 overflow-hidden">
      {/* Top Workspace Header Bar */}
      <header className="px-6 h-16 bg-white border-b border-olive-200 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-tight text-olive-950 m-0">Playground</h1>
          <p className="text-[13px] text-olive-500 m-0">Test prompts, fill in variables and compare model outputs side by side.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartNewPrompt}
            className="btn btn-sm btn-secondary"
          >
            <Plus className="w-4 h-4" /> New prompt
          </button>

          <button
            type="button"
            onClick={() => setIsParametersDrawerOpen(!isParametersDrawerOpen)}
            aria-pressed={isParametersDrawerOpen}
            className={`btn btn-sm relative ${isParametersDrawerOpen ? "btn-dark" : "btn-secondary"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Parameters</span>
            {isCustomParametersActive && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Notification Toast Messages */}
      {errorMsg && (
        <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-900 font-bold">
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-900 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Main Full-Page Grid Workspace */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* LEFT SIDEBAR: Folders & Prompts Browser (Col 1) */}
        <aside className="w-72 border-r border-olive-200 bg-white flex flex-col shrink-0 overflow-hidden">
          {/* Search Box */}
          <div className="p-3.5 border-b border-olive-200 bg-olive-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-olive-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts or tags..."
                className="w-full bg-white border border-olive-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
              />
            </div>
          </div>

          {/* Folders & Prompts List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-olive-500 px-2">
              <span>Folders & Templates</span>
              <span className="font-mono">{filteredPrompts.length} prompts</span>
            </div>

            {isLoadingLibrary ? (
              <div className="text-center py-10 text-olive-500 text-xs">
                Loading workspace library...
              </div>
            ) : (
              <div className="space-y-3">
                {/* Folders List */}
                {folders.map((folder) => {
                  const folderPrompts = promptsByFolder[folder._id] || [];
                  const isExpanded = expandedFolders[folder._id] ?? true;

                  return (
                    <div key={folder._id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFolders((prev) => ({
                            ...prev,
                            [folder._id]: !prev[folder._id],
                          }))
                        }
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-olive-50 hover:bg-olive-100 text-olive-900 font-bold flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-olive-700 shrink-0" />
                          ) : (
                            <FolderIcon className="w-3.5 h-3.5 text-olive-600 shrink-0" />
                          )}
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-olive-600 bg-olive-200 px-1.5 py-0.2 rounded-full">
                            {folderPrompts.length}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-olive-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-olive-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pl-3 space-y-1 border-l-2 border-olive-200/80 ml-2">
                          {folderPrompts.length === 0 ? (
                            <div className="px-2 py-1 text-[11px] text-olive-400 italic">
                              No prompts in folder
                            </div>
                          ) : (
                            folderPrompts.map((p) => {
                              const isSelected = selectedPromptId === p._id;
                              return (
                                <button
                                  key={p._id}
                                  type="button"
                                  onClick={() => handleSelectPrompt(p._id)}
                                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition group ${isSelected
                                      ? "bg-olive-900 text-white shadow-sm font-bold"
                                      : "text-olive-800 hover:bg-olive-100/70"
                                    }`}
                                >
                                  <div className="truncate pr-2">
                                    <div className="truncate text-xs">{p.name}</div>
                                    <div className="text-[11px] opacity-75 font-mono">
                                      v{p.version} • {p.category}
                                    </div>
                                  </div>
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected
                                        ? "text-emerald-400"
                                        : "text-olive-400 opacity-0 group-hover:opacity-100"
                                      }`}
                                  />
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized Section */}
                <div className="space-y-1 pt-2 border-t border-olive-200">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFolders((prev) => ({
                        ...prev,
                        uncategorized: !prev.uncategorized,
                      }))
                    }
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-olive-50 hover:bg-olive-100 text-olive-900 font-bold flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 text-olive-600 shrink-0" />
                      <span>Uncategorized Prompts</span>
                    </div>
                    <span className="text-[11px] font-mono text-olive-600 bg-olive-200 px-1.5 py-0.2 rounded-full">
                      {(promptsByFolder.uncategorized || []).length}
                    </span>
                  </button>

                  {(expandedFolders.uncategorized ?? true) && (
                    <div className="pl-3 space-y-1 border-l-2 border-olive-200/80 ml-2">
                      {(promptsByFolder.uncategorized || []).map((p) => {
                        const isSelected = selectedPromptId === p._id;
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => handleSelectPrompt(p._id)}
                            className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition group ${isSelected
                                ? "bg-olive-900 text-white shadow-sm font-bold"
                                : "text-olive-800 hover:bg-olive-100/70"
                              }`}
                          >
                            <div className="truncate pr-2">
                              <div className="truncate text-xs">{p.name}</div>
                              <div className="text-[11px] opacity-75 font-mono">
                                v{p.version} • {p.category}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected
                                  ? "text-emerald-400"
                                  : "text-olive-400 opacity-0 group-hover:opacity-100"
                                }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER WORKSPACE: Main Content Workspace Area (Col 2) */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6 bg-white">
          {!selectedPromptId && !isCreatingNewPrompt ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-2xl bg-olive-100 text-olive-900 border border-olive-200 shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-olive-950">Prompt Playground</h2>
              <p className="text-xs text-olive-600 leading-relaxed">
                Select a prompt from the left panel to test Handlebars variable resolution, experiment with AI model parameters, or create a brand new prompt template.
              </p>
              <button
                type="button"
                onClick={handleStartNewPrompt}
                className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create New Prompt Template
              </button>
            </div>
          ) : isCreatingNewPrompt ? (
            /* Inline Prompt Creator Workspace */
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between pb-4 border-b border-olive-200">
                <div>
                  <h2 className="text-base font-bold text-olive-950 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-olive-800" />
                    Create New Prompt Template
                  </h2>
                  <p className="text-xs text-olive-600">
                    DefineHandlebars placeholders ({`{{variable_name}}`}) and schema directly in the Playground workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPrompt(false)}
                  className="px-3 py-1.5 text-xs text-olive-600 hover:text-olive-950 hover:bg-olive-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              {/* Creator Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">
                    Prompt Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g. Code Review Assistant"
                    className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">Category</label>
                  <select
                    value={newPromptCategory}
                    onChange={(e) => setNewPromptCategory(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  >
                    <option value="general">General</option>
                    <option value="development">Development</option>
                    <option value="backend">Backend</option>
                    <option value="frontend">Frontend</option>
                    <option value="database">Database</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">Folder</label>
                  <select
                    value={newPromptFolderId}
                    onChange={(e) => setNewPromptFolderId(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  >
                    <option value="">No Folder (Root)</option>
                    {folders.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">
                    Tags <span className="text-olive-500 font-normal">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={newPromptTags}
                    onChange={(e) => setNewPromptTags(e.target.value)}
                    placeholder="code-review, typescript, ai"
                    className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">Description</label>
                <textarea
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  placeholder="Describe the purpose and expected outputs..."
                  rows={2}
                  className="w-full bg-white border border-olive-200 rounded-xl p-3 text-xs text-olive-950 focus:outline-none focus:border-olive-400 resize-none"
                />
              </div>

              {/* Creator Mode Switcher & Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-olive-200 pb-2">
                  <span className="text-xs font-medium text-olive-950">
                    Prompt Structure
                  </span>
                  <div className="flex items-center gap-1 bg-olive-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditorMode("blocks")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${editorMode === "blocks"
                          ? "bg-white text-olive-950 shadow-xs"
                          : "text-olive-600 hover:text-olive-950"
                        }`}
                    >
                      Multi-Role Blocks Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("raw")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${editorMode === "raw"
                          ? "bg-white text-olive-950 shadow-xs"
                          : "text-olive-600 hover:text-olive-950"
                        }`}
                    >
                      Raw Text Mode
                    </button>
                  </div>
                </div>

                {editorMode === "blocks" ? (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-olive-50/60 border border-olive-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <select
                            value={msg.role}
                            onChange={(e) => {
                              const updated = [...messages];
                              updated[idx].role = e.target.value as IPromptMessage["role"];
                              setMessages(updated);
                            }}
                            className="bg-white border border-olive-200 text-olive-900 font-medium text-xs rounded-lg px-2.5 py-1"
                          >
                            <option value="system">SYSTEM</option>
                            <option value="user">USER</option>
                            <option value="assistant">ASSISTANT</option>
                          </select>
                          {messages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setMessages(messages.filter((_, i) => i !== idx))}
                              className="text-olive-400 hover:text-rose-600 p-1 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={msg.content}
                          onChange={(e) => {
                            const updated = [...messages];
                            updated[idx].content = e.target.value;
                            setMessages(updated);
                          }}
                          placeholder={`Enter ${msg.role} message with {{variable}} placeholders...`}
                          rows={3}
                          className="w-full bg-white border border-olive-200 rounded-lg p-3 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMessages([...messages, { role: "user", content: "" }])}
                        className="px-3 py-1.5 rounded-lg bg-olive-100 hover:bg-olive-200 text-olive-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add User Block
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessages([...messages, { role: "assistant", content: "" }])}
                        className="px-3 py-1.5 rounded-lg bg-olive-100 hover:bg-olive-200 text-olive-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Assistant Block
                      </button>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write system and user content with {{variable}} placeholders..."
                    rows={8}
                    className="w-full bg-white border border-olive-200 rounded-xl p-4 font-mono text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPrompt(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-olive-600 hover:bg-olive-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePromptSubmit}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
                >
                  {isSaving ? "Saving..." : "Create Prompt"}
                </button>
              </div>
            </div>
          ) : (
            /* Selected Prompt Workspace View & Execution Panel */
            <div className="space-y-6">
              {/* Header Title & Version Selector Tabs */}
              <div className="p-5 rounded-2xl bg-olive-50/70 border border-olive-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-olive-950">
                        {activePrompt?.name}
                      </h2>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-olive-900 text-white">
                        v{selectedVersionNum}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-olive-200 text-olive-800">
                        {activePrompt?.category}
                      </span>
                    </div>
                    <p className="text-xs text-olive-600 mt-1">
                      {activePrompt?.description || "No description provided."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingPromptContent(!isEditingPromptContent)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-olive-100 border border-olive-200 text-olive-900 font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Code2 className="w-3.5 h-3.5 text-olive-700" />
                    {isEditingPromptContent ? "Close Editor" : "Edit Prompt Structure"}
                  </button>
                </div>

                {/* Canonical Version Tabs */}
                <div className="flex items-center gap-2 pt-2 border-t border-olive-200/80 overflow-x-auto custom-scrollbar">
                  <span className="text-xs font-semibold text-olive-600 shrink-0">
                    Versions:
                  </span>
                  {versionsList.map((v) => {
                    const isVerActive = v.version === selectedVersionNum;
                    return (
                      <button
                        key={v.version}
                        type="button"
                        onClick={() => handleVersionChange(v.version)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 ${isVerActive
                            ? "bg-olive-900 text-white shadow-xs"
                            : "bg-white text-olive-700 hover:bg-olive-200 border border-olive-200"
                          }`}
                      >
                        v{v.version}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inline Editor Workspace (if toggled on) */}
              {isEditingPromptContent && (
                <div className="p-5 rounded-2xl bg-white border border-olive-300 shadow-md space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-olive-200 pb-3">
                    <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-olive-700" />
                      Workspace Prompt Content Editor (v{selectedVersionNum})
                    </h3>
                    <div className="flex items-center gap-1 bg-olive-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setEditorMode("blocks")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${editorMode === "blocks"
                            ? "bg-white text-olive-950 shadow-xs"
                            : "text-olive-600 hover:text-olive-950"
                          }`}
                      >
                        Multi-Role Blocks
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode("raw")}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${editorMode === "raw"
                            ? "bg-white text-olive-950 shadow-xs"
                            : "text-olive-600 hover:text-olive-950"
                          }`}
                      >
                        Raw Text
                      </button>
                    </div>
                  </div>

                  {editorMode === "blocks" ? (
                    <div className="space-y-3">
                      {messages.map((msg, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-olive-50/70 border border-olive-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <select
                              value={msg.role}
                              onChange={(e) => {
                                const updated = [...messages];
                                updated[idx].role = e.target.value as IPromptMessage["role"];
                                setMessages(updated);
                              }}
                              className="bg-white border border-olive-200 text-olive-900 font-medium text-xs rounded-lg px-2.5 py-1"
                            >
                              <option value="system">SYSTEM</option>
                              <option value="user">USER</option>
                              <option value="assistant">ASSISTANT</option>
                            </select>
                            {messages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setMessages(messages.filter((_, i) => i !== idx))}
                                className="text-olive-400 hover:text-rose-600 p-1 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <textarea
                            value={msg.content}
                            onChange={(e) => {
                              const updated = [...messages];
                              updated[idx].content = e.target.value;
                              setMessages(updated);
                            }}
                            placeholder={`Enter ${msg.role} message content...`}
                            rows={3}
                            className="w-full bg-white border border-olive-200 rounded-lg p-3 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write system and user content with {{variable}} placeholders..."
                      rows={6}
                      className="w-full bg-white border border-olive-200 rounded-xl p-4 font-mono text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                    />
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-olive-200">
                    <button
                      type="button"
                      onClick={() => setIsEditingPromptContent(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-olive-600 hover:bg-olive-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveExistingPromptChanges}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
                    >
                      {isSaving ? "Saving..." : "Save & Bump Version"}
                    </button>
                  </div>
                </div>
              )}

              {/* Prompt Content Preview & Resolved View Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-olive-700" />
                    Prompt Content & Substitution Preview
                  </h3>

                  <div className="flex items-center gap-1 bg-olive-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("template")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${previewMode === "template"
                          ? "bg-white text-olive-950 shadow-xs font-bold"
                          : "text-olive-600 hover:text-olive-950"
                        }`}
                    >
                      Template View
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("resolved")}
                      className={`px-3 py-1 rounded text-xs font-semibold transition ${previewMode === "resolved"
                          ? "bg-white text-olive-950 shadow-xs font-bold"
                          : "text-olive-600 hover:text-olive-950"
                        }`}
                    >
                      Resolved View
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-olive-950 text-olive-100 font-mono text-xs max-h-56 overflow-y-auto space-y-3 shadow-inner custom-scrollbar">
                  {previewMode === "template" ? (
                    messages.length > 0 ? (
                      messages.map((m, idx) => (
                        <div key={idx} className="border-b border-olive-800/60 pb-2 last:border-0 last:pb-0">
                          <span className="text-emerald-400 font-bold text-[11px] block mb-1">
                            [{m.role}]
                          </span>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className="whitespace-pre-wrap">{body}</div>
                    )
                  ) : Array.isArray(resolvedPreview) ? (
                    resolvedPreview.map((m, idx) => (
                      <div key={idx} className="border-b border-olive-800/60 pb-2 last:border-0 last:pb-0">
                        <span className="text-amber-300 font-bold text-[11px] block mb-1">
                          [{m.role}]
                        </span>
                        <div className="whitespace-pre-wrap text-white">{m.content}</div>
                      </div>
                    ))
                  ) : (
                    <div className="whitespace-pre-wrap text-white">{resolvedPreview}</div>
                  )}
                </div>
              </div>

              {/* Dynamic Handlebars Variables (Definition vs Runtime Test Values) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-olive-700" />
                    Handlebars Variables ({activeDetectedVariables.length})
                  </h3>
                  <span className="text-[11px] text-olive-500">
                    Runtime test values remain isolated and will NOT overwrite canonical prompt templates.
                  </span>
                </div>

                {activeDetectedVariables.length === 0 ? (
                  <div className="p-4 rounded-xl bg-olive-50 border border-olive-200 text-center text-xs text-olive-600">
                    No Handlebars variables detected. Insert <code className="text-olive-950 font-bold font-mono">{`{{var_name}}`}</code> in prompt content to define test inputs.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeDetectedVariables.map((varName) => {
                      const schemaDef = variablesSchema.find((s) => s.name === varName);
                      const varType = schemaDef?.type || "string";
                      const isRequired = schemaDef?.required ?? true;
                      const testVal = runtimeValues[varName] ?? "";

                      return (
                        <div
                          key={varName}
                          className="p-4 rounded-2xl bg-olive-50/70 border border-olive-200 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between border-b border-olive-200 pb-2">
                            <label className="font-mono font-bold text-xs text-olive-950 flex items-center gap-1.5">
                              {`{{${varName}}}`}
                              {isRequired && <span className="text-rose-500 font-bold">*</span>}
                            </label>
                            <span className="text-[11px] text-olive-700 font-mono px-2 py-0.5 rounded bg-olive-200 font-bold">
                              {varType}
                            </span>
                          </div>

                          {/* Runtime Test Value Input */}
                          <div>
                            <span className="text-[11px] font-bold text-olive-600 block mb-1">
                              Runtime Test Value
                            </span>

                            {varType === "boolean" ? (
                              <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 text-xs font-medium text-olive-900 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`var-${varName}`}
                                    checked={testVal === true || testVal === "true"}
                                    onChange={() => setRuntimeValues({ ...runtimeValues, [varName]: true })}
                                    className="text-olive-900 focus:ring-0"
                                  />
                                  true
                                </label>
                                <label className="flex items-center gap-2 text-xs font-medium text-olive-900 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`var-${varName}`}
                                    checked={testVal === false || testVal === "false"}
                                    onChange={() => setRuntimeValues({ ...runtimeValues, [varName]: false })}
                                    className="text-olive-900 focus:ring-0"
                                  />
                                  false
                                </label>
                              </div>
                            ) : varType === "enum" && schemaDef?.options ? (
                              <select
                                value={testVal}
                                onChange={(e) => setRuntimeValues({ ...runtimeValues, [varName]: e.target.value })}
                                className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950"
                              >
                                <option value="">Select enum option...</option>
                                {schemaDef.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : String(testVal).length > 50 || varType === "json" ? (
                              <textarea
                                value={testVal}
                                onChange={(e) => setRuntimeValues({ ...runtimeValues, [varName]: e.target.value })}
                                placeholder={`Enter test value for ${varName}...`}
                                rows={3}
                                className="w-full bg-white border border-olive-200 rounded-lg p-2.5 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
                              />
                            ) : (
                              <input
                                type={varType === "number" ? "number" : "text"}
                                value={testVal}
                                onChange={(e) => setRuntimeValues({ ...runtimeValues, [varName]: e.target.value })}
                                placeholder={`Enter test value for ${varName}...`}
                                className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950 font-mono focus:outline-none focus:border-olive-400"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Primary Run Button & Actions Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-olive-200">
                <button
                  type="button"
                  onClick={handleRunPlayground}
                  disabled={isExecuting}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <Zap className="w-4 h-4 animate-spin text-amber-300" />
                      Executing Prompt via AI Service...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-emerald-400" />
                      Run Prompt in Playground
                    </>
                  )}
                </button>

                {runHistory.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsComparingRuns(!isComparingRuns);
                      if (!compareRunIdA && runHistory.length >= 2) {
                        setCompareRunIdA(runHistory[0].id);
                        setCompareRunIdB(runHistory[1].id);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${isComparingRuns
                        ? "bg-olive-900 text-white border-olive-900"
                        : "bg-white text-olive-800 border-olive-200 hover:bg-olive-100"
                      }`}
                  >
                    <GitCompare className="w-4 h-4" />
                    {isComparingRuns ? "Exit Comparison" : `Compare Runs (${runHistory.length})`}
                  </button>
                )}
              </div>

              {/* EXECUTION RESULT & HISTORY SECTION */}
              {isComparingRuns ? (
                /* Run Comparison Mode */
                <div className="p-5 rounded-2xl bg-white border border-olive-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-olive-200">
                    <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-olive-700" />
                      Side-by-Side Playground Run Comparison
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsComparingRuns(false)}
                      className="text-xs text-olive-600 hover:text-olive-950 underline"
                    >
                      Back to Single Output View
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-olive-600 block mb-1">
                        Run A
                      </span>
                      <select
                        value={compareRunIdA}
                        onChange={(e) => setCompareRunIdA(e.target.value)}
                        className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950"
                      >
                        {runHistory.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            Run #{runHistory.length - i} ({r.timestamp}) — {r.modelName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-olive-600 block mb-1">
                        Run B
                      </span>
                      <select
                        value={compareRunIdB}
                        onChange={(e) => setCompareRunIdB(e.target.value)}
                        className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950"
                      >
                        {runHistory.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            Run #{runHistory.length - i} ({r.timestamp}) — {r.modelName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {runA && runB && (
                    <div className="space-y-4">
                      {/* Differences Table */}
                      <div className="p-3.5 rounded-xl bg-olive-50/70 border border-olive-200 space-y-2 text-xs">
                        <div className="font-bold text-olive-900 border-b border-olive-200 pb-1">
                          Parameter & Variable Differences
                        </div>
                        <div className="grid grid-cols-3 font-mono text-[11px] gap-2">
                          <div className="text-olive-600 font-sans">Model / Temp</div>
                          <div className="text-olive-950">{runA.modelName} (t={runA.parameters.temperature})</div>
                          <div className="text-olive-950">{runB.modelName} (t={runB.parameters.temperature})</div>
                        </div>
                        <div className="grid grid-cols-3 font-mono text-[11px] gap-2">
                          <div className="text-olive-600 font-sans">Latency</div>
                          <div className="text-olive-950">{runA.latencyMs} ms</div>
                          <div className="text-olive-950">{runB.latencyMs} ms</div>
                        </div>
                        {Object.keys({ ...runA.variableValues, ...runB.variableValues }).map((vKey) => (
                          <div key={vKey} className="grid grid-cols-3 font-mono text-[11px] gap-2">
                            <div className="text-olive-700 font-sans font-bold">{`{{${vKey}}}`}</div>
                            <div className="truncate text-olive-950">{String(runA.variableValues[vKey] ?? "—")}</div>
                            <div className="truncate text-olive-950">{String(runB.variableValues[vKey] ?? "—")}</div>
                          </div>
                        ))}
                      </div>

                      {/* Outputs Side-by-Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-olive-200 space-y-2">
                          <div className="text-xs font-bold text-olive-900 border-b border-olive-200 pb-1">
                            Output Run A ({runA.timestamp})
                          </div>
                          <pre className="font-mono text-xs text-olive-950 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                            {runA.output}
                          </pre>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-olive-200 space-y-2">
                          <div className="text-xs font-bold text-olive-900 border-b border-olive-200 pb-1">
                            Output Run B ({runB.timestamp})
                          </div>
                          <pre className="font-mono text-xs text-olive-950 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                            {runB.output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Single Run Output View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-olive-700" />
                      Execution Result Output
                    </h3>

                    {currentActiveRun && (
                      <button
                        type="button"
                        onClick={() => handleCopyOutput(currentActiveRun.output)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-olive-200 text-olive-800 hover:bg-olive-100 transition flex items-center gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy Output"}
                      </button>
                    )}
                  </div>

                  {isExecuting ? (
                    <div className="p-12 rounded-2xl bg-white border border-olive-200 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                      <Zap className="w-8 h-8 animate-bounce text-olive-900" />
                      <div className="text-sm font-bold text-olive-950">Generating AI Output...</div>
                      <p className="text-xs text-olive-600 max-w-xs">
                        Sending substituted prompt payload to backend AI provider ({modelName}).
                      </p>
                    </div>
                  ) : currentActiveRun ? (
                    <div className="space-y-4">
                      {/* Execution Metadata Banner */}
                      <div className="p-4 rounded-2xl bg-olive-900 text-white space-y-2 text-xs shadow-md">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Cpu className="w-4 h-4" />
                            {currentActiveRun.modelName}
                          </span>
                          <span className="text-olive-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {currentActiveRun.latencyMs} ms
                          </span>
                        </div>

                        <div className="grid grid-cols-3 text-[11px] font-mono text-olive-200 pt-2 border-t border-olive-800">
                          <div>
                            Input Tokens:{" "}
                            <span className="text-white font-bold">
                              {currentActiveRun.tokens?.inputTokens ?? "Unavailable"}
                            </span>
                          </div>
                          <div>
                            Output Tokens:{" "}
                            <span className="text-white font-bold">
                              {currentActiveRun.tokens?.outputTokens ?? "Unavailable"}
                            </span>
                          </div>
                          <div>
                            Total Tokens:{" "}
                            <span className="text-white font-bold">
                              {currentActiveRun.tokens?.totalTokens ?? "Unavailable"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Output Text */}
                      <div className="p-5 rounded-2xl bg-white border border-olive-200 shadow-xs max-h-[450px] overflow-y-auto custom-scrollbar">
                        <pre className="font-mono text-xs text-olive-950 whitespace-pre-wrap leading-relaxed">
                          {currentActiveRun.output}
                        </pre>
                      </div>

                      {/* Experiment Save Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowSaveVersionModal(true)}
                          className="py-2.5 px-4 rounded-xl bg-white hover:bg-olive-100 border border-olive-200 text-olive-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Save className="w-4 h-4 text-olive-700" />
                          Save as New Version
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowSaveNewPromptModal(true)}
                          className="py-2.5 px-4 rounded-xl bg-white hover:bg-olive-100 border border-olive-200 text-olive-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-4 h-4 text-olive-700" />
                          Save as New Prompt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 rounded-2xl bg-white border border-olive-200 flex flex-col items-center justify-center text-center space-y-2 text-olive-500 shadow-xs">
                      <Play className="w-8 h-8 text-olive-300 mb-1" />
                      <div className="text-sm font-bold text-olive-800">No Execution Run Yet</div>
                      <p className="text-xs text-olive-600 max-w-xs">
                        Enter runtime test values above and click "Run Prompt in Playground" to generate AI outputs.
                      </p>
                    </div>
                  )}

                  {/* Session Run History Drawer */}
                  {runHistory.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-olive-200">
                      <h4 className="text-xs font-medium text-olive-800 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-olive-600" />
                        Session Run History ({runHistory.length})
                      </h4>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {runHistory.map((run, idx) => {
                          const isSelected = currentActiveRun?.id === run.id;
                          return (
                            <div
                              key={run.id}
                              onClick={() => setSelectedRunId(run.id)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${isSelected
                                  ? "bg-olive-900 text-white border-olive-900 shadow-sm"
                                  : "bg-white text-olive-900 border-olive-200 hover:bg-olive-100"
                                }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono font-bold text-[11px] opacity-75">
                                  #{runHistory.length - idx}
                                </span>
                                <span className="font-semibold">{run.modelName}</span>
                                <span className="text-[11px] opacity-75">({run.timestamp})</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                <span>{run.latencyMs}ms</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT PARAMETERS DRAWER (Sliding / Overlay from Right Side) */}
        {isParametersDrawerOpen && (
          <>
            {/* Dark Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
              onClick={() => setIsParametersDrawerOpen(false)}
            />
            {/* Drawer Panel Overlay */}
            <aside className="fixed top-0 right-0 bottom-0 w-80 border-l border-olive-200 bg-white shadow-2xl flex flex-col h-full z-50 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-olive-200 bg-olive-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-olive-900" />
                <h3 className="text-sm font-bold text-olive-950">AI Parameters Drawer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsParametersDrawerOpen(false)}
                className="p-1 rounded-lg text-olive-400 hover:text-olive-950 hover:bg-olive-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6 text-xs custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">
                    AI Provider Integration
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-xl px-3 py-2 text-xs font-medium text-olive-950 focus:outline-none focus:border-olive-400"
                  >
                    <option value="gemini">Google Gemini AI</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">
                    Model Architecture
                  </label>
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-xl px-3 py-2 text-xs font-medium text-olive-950 focus:outline-none focus:border-olive-400"
                  >
                    {provider === "gemini" && (
                      <>
                        <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommended)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      </>
                    )}
                    {provider === "openai" && (
                      <>
                        <option value="gpt-4o">GPT-4o (Omni)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {provider === "anthropic" && (
                      <>
                        <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Hyperparameters Sliders */}
                <div className="space-y-4 pt-2 border-t border-olive-200">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-olive-800 mb-1">
                      <span>Temperature</span>
                      <span className="font-mono text-olive-950">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-olive-900 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-olive-800 mb-1">
                      <span>Max Tokens</span>
                      <span className="font-mono text-olive-950">{maxTokens}</span>
                    </div>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-white border border-olive-200 rounded-xl px-3 py-1.5 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-olive-800 mb-1">
                      <span>Top P</span>
                      <span className="font-mono text-olive-950">{topP}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full accent-olive-900 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-olive-200 bg-olive-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setProvider("gemini");
                  setModelName("gemini-3.6-flash");
                  setTemperature(0.7);
                  setMaxTokens(2048);
                  setTopP(0.95);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-olive-600 hover:text-olive-950 hover:bg-olive-100 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </button>

              <button
                type="button"
                onClick={() => setIsParametersDrawerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </aside>
          </>
        )}
      </div>

      {/* Save as New Version Modal */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-olive-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-olive-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-olive-950">
            <h3 className="text-base font-bold text-olive-950 flex items-center gap-2">
              <Save className="w-5 h-5 text-olive-800" />
              Save Experiment as New Version
            </h3>
            <p className="text-xs text-olive-600">
              Creates a new immutable canonical version for{" "}
              <span className="font-bold text-olive-950">{activePrompt?.name}</span>. Handlebars placeholders ({`{{variables}}`}) are preserved intact without baking in test inputs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">
                Version Change Note
              </label>
              <input
                type="text"
                value={saveVersionNote}
                onChange={(e) => setSaveVersionNote(e.target.value)}
                placeholder="e.g. Optimized instructions after playground run"
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveVersionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-olive-600 hover:bg-olive-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsVersionSubmit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
              >
                {isSaving ? "Saving..." : "Confirm & Save Version"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as New Prompt Modal */}
      {showSaveNewPromptModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-olive-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-olive-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl text-olive-950">
            <h3 className="text-base font-bold text-olive-950 flex items-center gap-2">
              <Plus className="w-5 h-5 text-olive-800" />
              Save Experiment as New Prompt
            </h3>
            <p className="text-xs text-olive-600">
              Create a brand new standalone prompt template based on your playground changes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">
                  Prompt Name *
                </label>
                <input
                  type="text"
                  value={saveNewPromptTitle}
                  onChange={(e) => setSaveNewPromptTitle(e.target.value)}
                  placeholder="e.g. Refactored Code Reviewer"
                  className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">Category</label>
                <select
                  value={saveNewPromptCategory}
                  onChange={(e) => setSaveNewPromptCategory(e.target.value)}
                  className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                >
                  <option value="general">General</option>
                  <option value="development">Development</option>
                  <option value="backend">Backend</option>
                  <option value="frontend">Frontend</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">Description</label>
                <textarea
                  value={saveNewPromptDesc}
                  onChange={(e) => setSaveNewPromptDesc(e.target.value)}
                  placeholder="Short description..."
                  rows={2}
                  className="w-full bg-white border border-olive-200 rounded-xl p-3 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveNewPromptModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-olive-600 hover:bg-olive-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsNewPromptSubmit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
              >
                {isSaving ? "Creating..." : "Create Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptPlaygroundPage;
