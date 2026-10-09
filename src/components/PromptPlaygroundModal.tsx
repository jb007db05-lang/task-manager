import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Play,
  Copy,
  Check,
  RotateCcw,
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
  Plus,
} from "lucide-react";
import {
  promptService,
  PromptItem,
  PromptVersion,
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

interface PromptPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  initialPrompt?: PromptItem | null;
  initialVersionNumber?: number;
  onPromptSaved?: () => void;
}

export const PromptPlaygroundModal: React.FC<PromptPlaygroundModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  initialPrompt = null,
  initialVersionNumber,
  onPromptSaved,
}) => {
  // Navigation / Selection State
  const [promptsList, setPromptsList] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [activePrompt, setActivePrompt] = useState<PromptItem | null>(null);
  const [versionsList, setVersionsList] = useState<PromptVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [activeVersionDoc, setActiveVersionDoc] = useState<PromptVersion | null>(null);

  // Template & Content State
  const [body, setBody] = useState<string>("");
  const [messages, setMessages] = useState<IPromptMessage[]>([]);
  const [variablesSchema, setVariablesSchema] = useState<IPromptVariable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [previewMode, setPreviewMode] = useState<"template" | "resolved">("resolved");

  // AI Execution Settings
  const [provider, setProvider] = useState<string>("gemini");
  const [modelName, setModelName] = useState<string>("gemini-3.6-flash");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [topP, setTopP] = useState<number>(0.95);

  // Execution & Output State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<PlaygroundRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Comparison State
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareRunIdA, setCompareRunIdA] = useState<string>("");
  const [compareRunIdB, setCompareRunIdB] = useState<string>("");

  // Save Modal States
  const [showSaveVersionModal, setShowSaveVersionModal] = useState<boolean>(false);
  const [saveVersionNote, setSaveVersionNote] = useState<string>("");
  const [showSaveNewPromptModal, setShowSaveNewPromptModal] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>("");
  const [newPromptDesc, setNewPromptDesc] = useState<string>("");
  const [newPromptCategory, setNewPromptCategory] = useState<string>("general");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Mobile layout state
  const [mobileTab, setMobileTab] = useState<"config" | "output">("config");

  // Load prompts list on mount
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadPrompts();
    }
  }, [isOpen, workspaceId]);

  const loadPrompts = async () => {
    try {
      const list = await promptService.listPrompts(workspaceId);
      setPromptsList(list);
      if (initialPrompt) {
        setSelectedPromptId(initialPrompt._id);
      } else if (list.length > 0 && !selectedPromptId) {
        setSelectedPromptId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load prompts list", err);
    }
  };

  // When selectedPromptId changes, load prompt details & versions
  useEffect(() => {
    if (!isOpen || !workspaceId || !selectedPromptId) return;

    const fetchDetails = async () => {
      try {
        const promptDoc = await promptService.getPromptDetails(workspaceId, selectedPromptId);
        setActivePrompt(promptDoc);

        const versions = await promptService.getPromptVersions(workspaceId, selectedPromptId);
        setVersionsList(versions);

        const targetVer = initialVersionNumber || promptDoc.version;
        setSelectedVersionNum(targetVer);

        const matchVer = versions.find((v) => v.version === targetVer);
        applyPromptVersionState(promptDoc, matchVer || null);
      } catch (err) {
        console.error("Failed to load prompt details or versions", err);
      }
    };

    fetchDetails();
  }, [selectedPromptId, isOpen]);

  // Apply template & variable state when version or prompt changes
  const applyPromptVersionState = (prompt: PromptItem, verDoc: PromptVersion | null) => {
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

    // Populate variable default values while preserving user inputs where variable names match
    const detectedNames = extractVariablesFromContent(contentBody, contentMsgs);
    const schemaMap = new Map(schema.map((v) => [v.name, v]));

    setVariableValues((prevValues) => {
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
    if (!activePrompt) return;
    const matchVer = versionsList.find((v) => v.version === verNum);
    applyPromptVersionState(activePrompt, matchVer || null);
  };

  // Handlebars regex variable detector
  const extractVariablesFromContent = (b: string, msgs: IPromptMessage[]): string[] => {
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
    return extractVariablesFromContent(body, messages);
  }, [body, messages]);

  // Compute local resolved prompt preview
  const resolvedPreview = useMemo(() => {
    if (messages.length > 0) {
      return messages.map((m) => {
        let content = m.content;
        activeDetectedVariables.forEach((vKey) => {
          const val = variableValues[vKey] ?? "";
          const regex = new RegExp(`\\{\\{\\s*${vKey}\\s*\\}\\}`, "g");
          content = content.replace(regex, String(val));
        });
        return { ...m, content };
      });
    } else {
      let content = body;
      activeDetectedVariables.forEach((vKey) => {
        const val = variableValues[vKey] ?? "";
        const regex = new RegExp(`\\{\\{\\s*${vKey}\\s*\\}\\}`, "g");
        content = content.replace(regex, String(val));
      });
      return content;
    }
  }, [body, messages, activeDetectedVariables, variableValues]);

  // Handle variable input changes
  const handleVariableValChange = (varName: string, val: any) => {
    setVariableValues((prev) => ({
      ...prev,
      [varName]: val,
    }));
  };

  // Execute Prompt via Backend AI integration
  const handleRunPlayground = async () => {
    setErrorMsg(null);

    // Validate missing required variables
    const missingReq: string[] = [];
    activeDetectedVariables.forEach((varName) => {
      const schemaDef = variablesSchema.find((s) => s.name === varName);
      if (schemaDef?.required && (!variableValues[varName] || variableValues[varName].toString().trim() === "")) {
        missingReq.push(varName);
      }
    });

    if (missingReq.length > 0) {
      setErrorMsg(`Required variable(s) missing: ${missingReq.join(", ")}`);
      return;
    }

    setIsExecuting(true);
    setMobileTab("output");

    try {
      const res: PlaygroundRunResult = await promptService.runPlayground(workspaceId, {
        promptId: selectedPromptId || undefined,
        versionNumber: selectedVersionNum,
        body,
        messages: messages.length > 0 ? messages : undefined,
        variables: variableValues,
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
        promptName: activePrompt ? activePrompt.name : "Custom Playground Session",
        versionNumber: selectedVersionNum,
        variableValues: { ...variableValues },
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
        errorObj.response?.data?.message || errorObj.message || "Failed to execute prompt with AI provider.",
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Selected active run document
  const currentActiveRun = useMemo(() => {
    if (!selectedRunId && runHistory.length > 0) return runHistory[0];
    return runHistory.find((r) => r.id === selectedRunId) || runHistory[0] || null;
  }, [runHistory, selectedRunId]);

  // Copy output to clipboard
  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save as New Version
  const handleSaveAsVersionSubmit = async () => {
    if (!selectedPromptId || !activePrompt) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await promptService.updatePrompt(workspaceId, selectedPromptId, {
        body,
        messages: messages.length > 0 ? messages : undefined,
        variables: variablesSchema,
        changeNote: saveVersionNote.trim() || `Updated via Playground experiment (${new Date().toLocaleDateString()})`,
      });

      setShowSaveVersionModal(false);
      setSaveVersionNote("");
      if (onPromptSaved) onPromptSaved();

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

  // Save as New Prompt
  const handleSaveAsNewPromptSubmit = async () => {
    if (!newPromptName.trim()) {
      setErrorMsg("Prompt name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const created = await promptService.createPrompt(workspaceId, {
        name: newPromptName.trim(),
        description: newPromptDesc.trim() || "Created from Playground experiment",
        category: newPromptCategory,
        body,
        messages: messages.length > 0 ? messages : undefined,
        variables: variablesSchema,
      });

      setShowSaveNewPromptModal(false);
      setNewPromptName("");
      setNewPromptDesc("");
      if (onPromptSaved) onPromptSaved();

      // Switch to new prompt
      loadPrompts();
      setSelectedPromptId(created._id);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(errorObj.response?.data?.message || errorObj.message || "Failed to create new prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const runA = runHistory.find((r) => r.id === compareRunIdA) || runHistory[0];
  const runB = runHistory.find((r) => r.id === compareRunIdB) || runHistory[1] || runHistory[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-olive-200 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-olive-950">
        {/* Playground Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-olive-200 bg-olive-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-olive-900 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-olive-950">Prompt Playground</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-olive-200 text-olive-800">
                  Isolated Environment
                </span>
              </div>
              <p className="text-xs text-olive-600">
                Experiment with variables, model options, and compare execution outputs safely.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {runHistory.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  setIsComparing(!isComparing);
                  if (!compareRunIdA && runHistory.length >= 2) {
                    setCompareRunIdA(runHistory[0].id);
                    setCompareRunIdB(runHistory[1].id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isComparing
                    ? "bg-olive-900 text-white border-olive-900"
                    : "bg-white text-olive-700 border-olive-200 hover:bg-olive-100"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                {isComparing ? "Exit Comparison" : `Compare Runs (${runHistory.length})`}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-olive-400 hover:text-olive-950 hover:bg-olive-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex sm:hidden border-b border-olive-200 bg-olive-100 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("config")}
            className={`flex-1 py-2.5 text-center transition ${
              mobileTab === "config" ? "bg-white text-olive-950 border-b-2 border-olive-900 font-bold" : "text-olive-600"
            }`}
          >
            Configuration & Inputs
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("output")}
            className={`flex-1 py-2.5 text-center transition ${
              mobileTab === "output" ? "bg-white text-olive-950 border-b-2 border-olive-900 font-bold" : "text-olive-600"
            }`}
          >
            Execution Result {runHistory.length > 0 && `(${runHistory.length})`}
          </button>
        </div>

        {/* Error Banner */}
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

        {/* Main 2-Column Playground Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-olive-200 bg-white">
          {/* LEFT COLUMN: Prompt Selection, Variables, Parameters (7 cols) */}
          <div
            className={`sm:col-span-7 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6 ${
              mobileTab === "config" ? "block" : "hidden sm:flex"
            }`}
          >
            {/* Top Prompt & Version Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-olive-50/70 border border-olive-200">
              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-olive-700" />
                  Select Prompt Template
                </label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="w-full bg-white border border-olive-200 rounded-lg px-3 py-2 text-xs font-medium text-olive-950 focus:outline-none focus:border-olive-400"
                >
                  {promptsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (v{p.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-olive-700" />
                  Prompt Version
                </label>
                <select
                  value={selectedVersionNum}
                  onChange={(e) => handleVersionChange(Number(e.target.value))}
                  className="w-full bg-white border border-olive-200 rounded-lg px-3 py-2 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
                >
                  {versionsList.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} — {v.changeNote || "Immutable Version"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt Template & Resolved Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-olive-700" />
                  Prompt Preview & Substitution
                </h3>

                <div className="flex items-center gap-1 bg-olive-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("template")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      previewMode === "template"
                        ? "bg-white text-olive-950 shadow-xs"
                        : "text-olive-600 hover:text-olive-950"
                    }`}
                  >
                    Template View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("resolved")}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      previewMode === "resolved"
                        ? "bg-white text-olive-950 shadow-xs"
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

            {/* Dynamic Handlebars Variables Inputs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-olive-700" />
                  Detected Variables ({activeDetectedVariables.length})
                </h3>

                {activeDetectedVariables.length > 0 && (
                  <span className="text-[11px] text-olive-500">
                    Edits here apply ONLY to this playground run.
                  </span>
                )}
              </div>

              {activeDetectedVariables.length === 0 ? (
                <div className="p-4 rounded-xl bg-olive-50 border border-olive-200 text-center text-xs text-olive-600">
                  No handlebars variables detected in this prompt template.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDetectedVariables.map((varName) => {
                    const schemaDef = variablesSchema.find((s) => s.name === varName);
                    const varType = schemaDef?.type || "string";
                    const isRequired = schemaDef?.required ?? true;
                    const val = variableValues[varName] ?? "";

                    return (
                      <div key={varName} className="p-3.5 rounded-xl bg-olive-50/60 border border-olive-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-mono font-bold text-olive-950 flex items-center gap-1.5">
                            {`{{${varName}}}`}
                            {isRequired && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          <span className="text-[11px] text-olive-500 font-mono px-1.5 py-0.5 rounded bg-olive-100">
                            {varType}
                          </span>
                        </div>

                        {schemaDef?.description && (
                          <p className="text-[11px] text-olive-600">{schemaDef.description}</p>
                        )}

                        {/* Input type selection logic */}
                        {varType === "boolean" ? (
                          <div className="flex items-center gap-4 pt-1">
                            <label className="flex items-center gap-2 text-xs font-medium text-olive-900 cursor-pointer">
                              <input
                                type="radio"
                                name={`var-${varName}`}
                                checked={val === true || val === "true"}
                                onChange={() => handleVariableValChange(varName, true)}
                                className="text-olive-900 focus:ring-0"
                              />
                              true
                            </label>
                            <label className="flex items-center gap-2 text-xs font-medium text-olive-900 cursor-pointer">
                              <input
                                type="radio"
                                name={`var-${varName}`}
                                checked={val === false || val === "false"}
                                onChange={() => handleVariableValChange(varName, false)}
                                className="text-olive-900 focus:ring-0"
                              />
                              false
                            </label>
                          </div>
                        ) : varType === "enum" && schemaDef?.options ? (
                          <select
                            value={val}
                            onChange={(e) => handleVariableValChange(varName, e.target.value)}
                            className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                          >
                            <option value="">Select option...</option>
                            {schemaDef.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : String(val).length > 60 || varType === "json" ? (
                          <textarea
                            value={val}
                            onChange={(e) => handleVariableValChange(varName, e.target.value)}
                            placeholder={`Enter ${varName}...`}
                            rows={3}
                            className="w-full bg-white border border-olive-200 rounded-lg p-2.5 text-xs font-mono text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 resize-y"
                          />
                        ) : (
                          <input
                            type={varType === "number" ? "number" : "text"}
                            value={val}
                            onChange={(e) => handleVariableValChange(varName, e.target.value)}
                            placeholder={`Enter ${varName}...`}
                            className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 font-mono"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Model & Hyperparameter Settings */}
            <div className="space-y-4 pt-2 border-t border-olive-200">
              <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-olive-700" />
                Model & Execution Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">AI Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs font-medium text-olive-950 focus:outline-none focus:border-olive-400"
                  >
                    <option value="gemini">Google Gemini AI</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-olive-800 mb-1">Model Architecture</label>
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-white border border-olive-200 rounded-lg px-3 py-1.5 text-xs font-medium text-olive-950 focus:outline-none focus:border-olive-400"
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
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                    className="w-full bg-white border border-olive-200 rounded-lg px-2.5 py-1 text-xs font-mono text-olive-950 focus:outline-none focus:border-olive-400"
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

            {/* Run Button */}
            <div className="pt-2 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={handleRunPlayground}
                disabled={isExecuting}
                className="w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-amber-300" />
                    Executing Prompt via AI...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-emerald-400" />
                    Run Prompt in Playground
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Execution Result & History (5 cols) */}
          <div
            className={`sm:col-span-5 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6 bg-olive-50/30 ${
              mobileTab === "output" ? "block" : "hidden sm:flex"
            }`}
          >
            {/* Run Comparison Mode View */}
            {isComparing ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-olive-200">
                  <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-olive-700" />
                    Side-by-Side Run Comparison
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsComparing(false)}
                    className="text-xs text-olive-600 hover:text-olive-950 underline"
                  >
                    Back to Single Output View
                  </button>
                </div>

                {/* Compare Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-olive-600 block mb-1">Run A</span>
                    <select
                      value={compareRunIdA}
                      onChange={(e) => setCompareRunIdA(e.target.value)}
                      className="w-full bg-white border border-olive-200 rounded-lg px-2.5 py-1 text-xs text-olive-950"
                    >
                      {runHistory.map((r, i) => (
                        <option key={r.id} value={r.id}>
                          Run #{runHistory.length - i} ({r.timestamp}) — {r.modelName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-olive-600 block mb-1">Run B</span>
                    <select
                      value={compareRunIdB}
                      onChange={(e) => setCompareRunIdB(e.target.value)}
                      className="w-full bg-white border border-olive-200 rounded-lg px-2.5 py-1 text-xs text-olive-950"
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
                  <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Differences Metadata Table */}
                    <div className="p-3 rounded-xl bg-white border border-olive-200 space-y-2 text-xs">
                      <div className="font-bold text-olive-900 border-b border-olive-100 pb-1">
                        Configuration Differences
                      </div>
                      <div className="grid grid-cols-3 font-mono text-[11px] gap-2">
                        <div className="text-olive-500 font-sans">Model / Temp</div>
                        <div className="text-olive-900">
                          {runA.modelName} (t={runA.parameters.temperature})
                        </div>
                        <div className="text-olive-900">
                          {runB.modelName} (t={runB.parameters.temperature})
                        </div>
                      </div>
                      <div className="grid grid-cols-3 font-mono text-[11px] gap-2">
                        <div className="text-olive-500 font-sans">Latency</div>
                        <div className="text-olive-900">{runA.latencyMs} ms</div>
                        <div className="text-olive-900">{runB.latencyMs} ms</div>
                      </div>
                      {Object.keys({ ...runA.variableValues, ...runB.variableValues }).map((vKey) => (
                        <div key={vKey} className="grid grid-cols-3 font-mono text-[11px] gap-2">
                          <div className="text-olive-600 font-sans font-bold">{`{{${vKey}}}`}</div>
                          <div className="truncate text-olive-900">{String(runA.variableValues[vKey] ?? "—")}</div>
                          <div className="truncate text-olive-900">{String(runB.variableValues[vKey] ?? "—")}</div>
                        </div>
                      ))}
                    </div>

                    {/* Outputs Side-by-Side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <div className="p-3 rounded-xl bg-white border border-olive-200 flex flex-col space-y-2">
                        <div className="text-xs font-bold text-olive-900 border-b border-olive-100 pb-1">
                          Output Run A ({runA.timestamp})
                        </div>
                        <pre className="font-mono text-xs text-olive-900 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-80">
                          {runA.output}
                        </pre>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-olive-200 flex flex-col space-y-2">
                        <div className="text-xs font-bold text-olive-900 border-b border-olive-100 pb-1">
                          Output Run B ({runB.timestamp})
                        </div>
                        <pre className="font-mono text-xs text-olive-900 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-80">
                          {runB.output}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Single Execution Result Output View */
              <div className="flex flex-col flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-olive-950 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-olive-700" />
                    Execution Result
                  </h3>

                  {currentActiveRun && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyOutput(currentActiveRun.output)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-olive-200 text-olive-800 hover:bg-olive-100 transition flex items-center gap-1.5"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                {isExecuting ? (
                  <div className="flex-1 min-h-[300px] rounded-xl bg-white border border-olive-200 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <Zap className="w-8 h-8 animate-bounce text-olive-900" />
                    <div className="text-sm font-bold text-olive-950">Generating AI Response...</div>
                    <p className="text-xs text-olive-600 max-w-xs">
                      Substitutions complete. Request sent to backend AI execution engine ({modelName}).
                    </p>
                  </div>
                ) : currentActiveRun ? (
                  <div className="flex flex-col flex-1 space-y-4">
                    {/* Execution Metadata Banner */}
                    <div className="p-3.5 rounded-xl bg-olive-900 text-white space-y-2 text-xs shadow-md">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5" />
                          {currentActiveRun.modelName}
                        </span>
                        <span className="text-olive-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {currentActiveRun.latencyMs} ms
                        </span>
                      </div>

                      <div className="grid grid-cols-3 text-[11px] font-mono text-olive-200 pt-1 border-t border-olive-800">
                        <div>
                          Input Tokens: <span className="text-white font-bold">{currentActiveRun.tokens?.inputTokens ?? "—"}</span>
                        </div>
                        <div>
                          Output Tokens: <span className="text-white font-bold">{currentActiveRun.tokens?.outputTokens ?? "—"}</span>
                        </div>
                        <div>
                          Total Tokens: <span className="text-white font-bold">{currentActiveRun.tokens?.totalTokens ?? "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Output Text Container */}
                    <div className="flex-1 p-4 rounded-xl bg-white border border-olive-200 overflow-y-auto max-h-[420px] custom-scrollbar shadow-xs">
                      <pre className="font-mono text-xs text-olive-950 whitespace-pre-wrap leading-relaxed">
                        {currentActiveRun.output}
                      </pre>
                    </div>

                    {/* Action Bar for Experiment Saving */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-olive-200">
                      <button
                        type="button"
                        onClick={() => setShowSaveVersionModal(true)}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-olive-100 border border-olive-200 text-olive-900 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5 text-olive-700" />
                        Save as Version
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSaveNewPromptModal(true)}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-olive-100 border border-olive-200 text-olive-900 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-olive-700" />
                        Save as New Prompt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[300px] rounded-xl bg-white border border-olive-200 flex flex-col items-center justify-center p-8 text-center space-y-2 text-olive-500">
                    <Play className="w-8 h-8 text-olive-300 mb-1" />
                    <div className="text-sm font-bold text-olive-800">No Execution Yet</div>
                    <p className="text-xs text-olive-600 max-w-xs">
                      Fill out your test variables on the left and click "Run Prompt in Playground" to see live results.
                    </p>
                  </div>
                )}

                {/* History Runs Drawer */}
                {runHistory.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-olive-200">
                    <h4 className="text-xs font-medium text-olive-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-olive-600" />
                      Session Run History ({runHistory.length})
                    </h4>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {runHistory.map((run, idx) => {
                        const isSelected = currentActiveRun?.id === run.id;
                        return (
                          <div
                            key={run.id}
                            onClick={() => setSelectedRunId(run.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                              isSelected
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
        </div>
      </div>

      {/* Save as New Version Dialog */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-olive-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-olive-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-olive-950 flex items-center gap-2">
              <Save className="w-5 h-5 text-olive-800" />
              Save Experiment as New Version
            </h3>
            <p className="text-xs text-olive-600">
              This will create a new immutable version for <span className="font-bold text-olive-900">{activePrompt?.name}</span>. The template placeholders ({`{{variables}}`}) will be preserved without hardcoding test values.
            </p>

            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">Version Change Note</label>
              <input
                type="text"
                value={saveVersionNote}
                onChange={(e) => setSaveVersionNote(e.target.value)}
                placeholder="e.g. Optimized instructions after playground run"
                className="w-full bg-white border border-olive-200 rounded-lg px-3 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveVersionModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-olive-600 hover:bg-olive-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsVersionSubmit}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
              >
                {isSaving ? "Saving..." : "Confirm & Save Version"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as New Prompt Dialog */}
      {showSaveNewPromptModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-olive-950/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-olive-200 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-olive-950 flex items-center gap-2">
              <Plus className="w-5 h-5 text-olive-800" />
              Save Experiment as New Prompt
            </h3>
            <p className="text-xs text-olive-600">
              Create a brand new standalone prompt template based on your playground changes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">Prompt Name *</label>
                <input
                  type="text"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  placeholder="e.g. Refactored Code Reviewer"
                  className="w-full bg-white border border-olive-200 rounded-lg px-3 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-olive-800 mb-1">Category</label>
                <select
                  value={newPromptCategory}
                  onChange={(e) => setNewPromptCategory(e.target.value)}
                  className="w-full bg-white border border-olive-200 rounded-lg px-3 py-2 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
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
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  placeholder="Short description of this prompt..."
                  rows={2}
                  className="w-full bg-white border border-olive-200 rounded-lg p-2.5 text-xs text-olive-950 focus:outline-none focus:border-olive-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveNewPromptModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-olive-600 hover:bg-olive-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsNewPromptSubmit}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition"
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
