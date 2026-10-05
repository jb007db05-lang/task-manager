import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Code,
  Sparkles,
  AlertCircle,
  Play,
} from "lucide-react";
import {
  promptService,
  PromptItem,
  PromptFolder,
  IPromptMessage,
  IPromptVariable,
} from "@/services/prompts";

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  folders: PromptFolder[];
  existingPrompt?: PromptItem | null;
  onSaved: (prompt: PromptItem) => void;
  onOpenPlayground?: (prompt: PromptItem) => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  folders,
  existingPrompt,
  onSaved,
  onOpenPlayground,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [folderId, setFolderId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [editorMode, setEditorMode] = useState<"blocks" | "raw">("blocks");
  const [rawBody, setRawBody] = useState("");
  const [messages, setMessages] = useState<IPromptMessage[]>([
    { role: "system", content: "You are a helpful AI assistant." },
    { role: "user", content: "Hello {{user_name}}, how can I help you today?" },
  ]);
  const [variables, setVariables] = useState<IPromptVariable[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingPrompt) {
      setName(existingPrompt.name);
      setDescription(existingPrompt.description || "");
      setCategory(existingPrompt.category || "general");
      setFolderId(existingPrompt.folderId || "");
      setTagsInput((existingPrompt.tags || []).join(", "));
      setRawBody(existingPrompt.body || "");
      setMessages(
        existingPrompt.messages && existingPrompt.messages.length > 0
          ? existingPrompt.messages
          : [{ role: "user", content: existingPrompt.body || "" }],
      );
      setVariables(existingPrompt.variables || []);
      setEditorMode(existingPrompt.messages && existingPrompt.messages.length > 0 ? "blocks" : "raw");
    } else {
      setName("");
      setDescription("");
      setCategory("general");
      setFolderId("");
      setTagsInput("");
      setRawBody("Write your prompt with {{variable}} placeholders...");
      setMessages([
        { role: "system", content: "You are an expert software engineering assistant." },
        { role: "user", content: "Analyze the following task: {{task_title}}\n\nDescription: {{task_description}}" },
      ]);
      setVariables([]);
      setEditorMode("blocks");
    }
    setError(null);
  }, [existingPrompt, isOpen]);

  // Handlebars variable auto-detection
  useEffect(() => {
    const combinedContent =
      editorMode === "blocks"
        ? messages.map((m) => m.content).join("\n")
        : rawBody;

    const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const detected = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(combinedContent)) !== null) {
      if (match[1]) {
        detected.add(match[1].trim());
      }
    }

    setVariables((prev) => {
      const prevMap = new Map(prev.map((v) => [v.name, v]));
      const updated: IPromptVariable[] = [];

      // Keep existing variables that are still present or manually added
      prev.forEach((v) => {
        if (detected.has(v.name)) {
          updated.push(v);
        }
      });

      // Add newly detected variables
      detected.forEach((name) => {
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
  }, [messages, rawBody, editorMode]);

  if (!isOpen) return null;

  const handleAddMessage = (role: "system" | "user" | "assistant") => {
    setMessages([...messages, { role, content: "" }]);
  };

  const handleRemoveMessage = (index: number) => {
    if (messages.length <= 1) return;
    setMessages(messages.filter((_, i) => i !== index));
  };

  const handleMessageChange = (index: number, content: string) => {
    const updated = [...messages];
    updated[index].content = content;
    setMessages(updated);
  };

  const handleVariableChange = (index: number, field: keyof IPromptVariable, val: string | boolean | string[]) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: val };
    setVariables(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Prompt name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const body =
        editorMode === "blocks"
          ? messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n")
          : rawBody;

      if (existingPrompt) {
        const updated = await promptService.updatePrompt(
          workspaceId,
          existingPrompt._id,
          {
            name,
            description,
            category,
            folderId: folderId || null,
            tags,
            body,
            messages: editorMode === "blocks" ? messages : [],
            variables,
            changeNote: changeNote.trim() || undefined,
          },
        );
        onSaved(updated);
      } else {
        const created = await promptService.createPrompt(workspaceId, {
          name,
          description,
          category,
          folderId: folderId || null,
          tags,
          body,
          messages: editorMode === "blocks" ? messages : [],
          variables,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj.response?.data?.message || errorObj.message || "Failed to save prompt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-olive-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-olive-950">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-olive-200 bg-olive-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-olive-100 text-olive-800 border border-olive-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-olive-950">
                {existingPrompt ? `Edit Prompt — ${existingPrompt.name}` : "Create New Prompt Template"}
              </h2>
              <p className="text-xs text-olive-600">
                Define Handlebars variables, multi-role block structures, and canonical versions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-olive-400 hover:text-olive-950 hover:bg-olive-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">
                Prompt Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Code Review Assistant"
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
              >
                <option value="general">General</option>
                <option value="development">Development</option>
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="database">Database</option>
                <option value="ui-ux">UI / UX</option>
                <option value="documentation">Documentation</option>
                <option value="testing">Testing</option>
                <option value="devops">DevOps</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
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
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="code-review, typescript, ai"
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-olive-800 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and expected outputs of this prompt..."
              rows={2}
              className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition resize-none"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-olive-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorMode("blocks")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  editorMode === "blocks"
                    ? "bg-olive-900 text-white shadow-sm"
                    : "text-olive-600 hover:bg-olive-100"
                }`}
              >
                Multi-Role Blocks Mode
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  editorMode === "raw"
                    ? "bg-olive-900 text-white shadow-sm"
                    : "text-olive-600 hover:bg-olive-100"
                }`}
              >
                Raw Text Mode
              </button>
            </div>
            <span className="text-xs text-olive-700 font-mono">
              Handlebars auto-detect active: {`{{variable}}`}
            </span>
          </div>

          {/* Prompt Body / Message Blocks Editor */}
          {editorMode === "blocks" ? (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-olive-50/50 border border-olive-200 space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <select
                      value={msg.role}
                      onChange={(e) => {
                        const updated = [...messages];
                        updated[index].role = e.target.value as IPromptMessage['role'];
                        setMessages(updated);
                      }}
                      className="bg-white border border-olive-200 text-olive-900 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none uppercase"
                    >
                      <option value="system">SYSTEM</option>
                      <option value="user">USER</option>
                      <option value="assistant">ASSISTANT</option>
                    </select>

                    {messages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMessage(index)}
                        className="text-olive-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <textarea
                    value={msg.content}
                    onChange={(e) => handleMessageChange(index, e.target.value)}
                    placeholder={`Enter ${msg.role} message content with {{variable}} placeholders...`}
                    rows={3}
                    className="w-full bg-white border border-olive-200 rounded-lg p-3 text-sm font-mono text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 transition resize-none"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddMessage("user")}
                  className="px-3 py-1.5 rounded-lg bg-olive-100 hover:bg-olive-200 text-olive-800 border border-olive-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User Block
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMessage("assistant")}
                  className="px-3 py-1.5 rounded-lg bg-olive-100 hover:bg-olive-200 text-olive-800 border border-olive-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Assistant Block
                </button>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={rawBody}
                onChange={(e) => setRawBody(e.target.value)}
                placeholder="Write system and user prompt content with {{variable}} placeholders..."
                rows={8}
                className="w-full bg-white border border-olive-200 rounded-xl p-4 font-mono text-sm text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 transition resize-y"
              />
            </div>
          )}

          {/* Variables Schema Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-olive-950 flex items-center gap-2">
                <Code className="w-4 h-4 text-olive-700" />
                Prompt Variables Schema ({variables.length})
              </h3>
            </div>

            {variables.length === 0 ? (
              <div className="p-4 rounded-xl bg-olive-50 border border-olive-200 text-center text-xs text-olive-600">
                No variables detected. Add <code className="text-olive-900 font-mono font-bold">{`{{variable_name}}`}</code> in prompt content to auto-generate inputs.
              </div>
            ) : (
              <div className="border border-olive-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-xs text-left text-olive-800">
                  <thead className="bg-olive-50 text-olive-700 font-semibold uppercase text-[11px] tracking-wider border-b border-olive-200">
                    <tr>
                      <th className="px-3 py-2">Variable Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Default Value</th>
                      <th className="px-3 py-2">Required</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-100">
                    {variables.map((v, i) => (
                      <tr key={v.name} className="hover:bg-olive-50/50">
                        <td className="px-3 py-2 font-mono font-bold text-olive-950">
                          {`{{${v.name}}}`}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={v.type || "string"}
                            onChange={(e) => handleVariableChange(i, "type", e.target.value)}
                            className="bg-white border border-olive-200 text-olive-900 rounded px-2 py-1 focus:outline-none"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="json">JSON</option>
                            <option value="boolean">Boolean</option>
                            <option value="enum">Enum</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.defaultValue || ""}
                            onChange={(e) => handleVariableChange(i, "defaultValue", e.target.value)}
                            placeholder="Default..."
                            className="bg-white border border-olive-200 text-olive-950 rounded px-2 py-1 font-mono w-full focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={v.required ?? true}
                            onChange={(e) => handleVariableChange(i, "required", e.target.checked)}
                            className="rounded border-olive-300 text-olive-800 focus:ring-0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.description || ""}
                            onChange={(e) => handleVariableChange(i, "description", e.target.value)}
                            placeholder="Usage description..."
                            className="bg-white border border-olive-200 text-olive-900 rounded px-2 py-1 w-full focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Change note for existing prompt version bump */}
          {existingPrompt && (
            <div>
              <label className="block text-xs font-semibold text-olive-800 mb-1">
                Version Change Note <span className="text-olive-500 font-normal">(bump v{existingPrompt.version + 1})</span>
              </label>
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Explain what changed in this version..."
                className="w-full bg-white border border-olive-200 rounded-xl px-3.5 py-2 text-sm text-olive-950 placeholder-olive-400 focus:outline-none focus:border-olive-400 focus:ring-4 focus:ring-olive-700/5 transition"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-olive-200 bg-olive-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-olive-600 hover:text-olive-950 hover:bg-olive-100 text-sm font-semibold transition"
            >
              Cancel
            </button>
            {existingPrompt && onOpenPlayground && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlayground(existingPrompt);
                }}
                className="px-3.5 py-2 rounded-xl bg-olive-100 hover:bg-olive-200 text-olive-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-600 fill-current" /> Open in Playground
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-olive-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold shadow-md shadow-olive-900/20 transition flex items-center gap-2"
          >
            {isSubmitting ? "Saving..." : existingPrompt ? "Save & Create Version" : "Create Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
};
