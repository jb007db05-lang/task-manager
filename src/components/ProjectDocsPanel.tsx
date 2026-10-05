import React, { useState, useEffect } from "react";
import documentService, { Document } from "../services/documents";
import centralizedAiService from "../services/centralizedAi";
import { FileText, Sparkles, Plus, Edit3, Trash2, BookOpen, Save, X } from "lucide-react";

interface ProjectDocsPanelProps {
  projectId: string;
}

export const ProjectDocsPanel: React.FC<ProjectDocsPanelProps> = ({ projectId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("PRD");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, [projectId]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const list = await documentService.getProjectDocuments(projectId);
      setDocuments(list);
      if (list.length > 0 && !selectedDoc) {
        setSelectedDoc(list[0]);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const doc = await documentService.createDocument(projectId, {
        title,
        type: docType,
        content,
      });
      setDocuments((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create document", err);
    }
  };

  const handleAiGenerateDoc = async () => {
    if (!title.trim()) return;
    setAiGenerating(true);
    try {
      const draft = await centralizedAiService.generateDocument(projectId, docType, title);
      const doc = await documentService.createDocument(projectId, {
        title: draft.title,
        type: docType,
        content: draft.content,
        tags: draft.tags,
        aiGenerated: true,
      });
      setDocuments((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error("Failed to AI generate document", err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    try {
      const updated = await documentService.updateDocument(selectedDoc._id, {
        title: selectedDoc.title,
        content: selectedDoc.content,
      });
      setDocuments((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
      setSelectedDoc(updated);
      setEditing(false);
    } catch (err) {
      console.error("Failed to save document updates", err);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await documentService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      if (selectedDoc?._id === docId) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDocType("PRD");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[750px]">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-slate-800 p-4 flex flex-col bg-slate-950/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-slate-200 text-sm">Documentation</h3>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {documents.map((doc) => (
            <button
              key={doc._id}
              onClick={() => {
                setSelectedDoc(doc);
                setEditing(false);
              }}
              className={`w-full text-left p-3 rounded-xl border transition ${
                selectedDoc?._id === doc._id
                  ? "bg-blue-600/20 border-blue-500/40 text-slate-100"
                  : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  {doc.type}
                </span>
                {doc.aiGenerated && (
                  <span className="flex items-center space-x-0.5 text-[11px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI</span>
                  </span>
                )}
              </div>
              <div className="font-medium text-xs text-slate-200 truncate">{doc.title}</div>
            </button>
          ))}
          {documents.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-slate-500">
              No documents created yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Document Content */}
      <div className="flex-1 p-6 flex flex-col bg-slate-900 overflow-y-auto">
        {selectedDoc ? (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded text-[11px] font-bold">
                    {selectedDoc.type}
                  </span>
                  <span className="text-xs text-slate-500">v{selectedDoc.version || 1}</span>
                </div>
                {editing ? (
                  <input
                    type="text"
                    value={selectedDoc.title}
                    onChange={(e) => setSelectedDoc({ ...selectedDoc, title: e.target.value })}
                    className="text-xl font-bold bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 focus:outline-none"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-100">{selectedDoc.title}</h2>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {editing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedDoc._id)}
                  className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            {editing ? (
              <textarea
                value={selectedDoc.content}
                onChange={(e) => setSelectedDoc({ ...selectedDoc, content: e.target.value })}
                className="w-full flex-1 min-h-[450px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-200 focus:outline-none leading-relaxed"
              />
            ) : (
              <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedDoc.content || "No document content."}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <FileText className="w-12 h-12 mb-3 text-slate-600" />
            <h4 className="text-slate-300 font-semibold mb-1">No Document Selected</h4>
            <p className="text-xs">Select a document from the left sidebar or create a new PRD with AI.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Create New Document</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Authentication System PRD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="PRD">PRD (Product Requirements Document)</option>
                  <option value="SPEC">Technical Specification</option>
                  <option value="BRIEF">Product Brief</option>
                  <option value="ARCHITECTURE">Architecture Document</option>
                  <option value="MEETING_NOTES">Meeting Notes</option>
                  <option value="GENERAL">General Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Content (Markdown)
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft your document content..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleAiGenerateDoc}
                disabled={aiGenerating || !title.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{aiGenerating ? "Generating PRD with AI..." : "Generate Draft with AI"}</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Create Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
