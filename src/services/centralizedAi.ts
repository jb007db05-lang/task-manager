import api from "./api";

export interface AIProjectPlanActor {
  name: string;
  type: "HUMAN" | "SYSTEM" | "EXTERNAL_SERVICE";
  responsibilities: string[];
  permissions?: string[];
}

export interface AIProjectPlanFeature {
  name: string;
  description: string;
  purpose?: string;
  actors?: string[];
  userFlow?: string[];
  backendRequirements?: string[];
  frontendRequirements?: string[];
  databaseRequirements?: string[];
  apiRequirements?: string[];
  validation?: string[];
  authorization?: string[];
  errorHandling?: string[];
  acceptanceCriteria: string[];
  estimatedHours: number;
}

export interface AIProjectPlanModule {
  name: string;
  purpose: string;
  features: AIProjectPlanFeature[];
}

export interface AIProjectPlanRisk {
  title: string;
  type: "TECHNICAL" | "INTEGRATION" | "REQUIREMENTS" | "TIMELINE" | "SCALABILITY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  mitigation: string;
}

export interface AIProjectPlanTimeline {
  totalEngineeringHours: number;
  totalEngineeringDays: number;
  estimatedCalendarWeeks: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  assumptions: string[];
  milestones: Array<{
    name: string;
    description?: string;
    estimatedHours: number;
    epicNames: string[];
  }>;
}

export interface AIProjectPlanResponse {
  name: string;
  description: string;
  systemGoal: string;
  coreWorkflow: string[];
  actors: AIProjectPlanActor[];
  suggestedStates: Array<{
    name: string;
    description?: string;
    color: string;
    category: "BACKLOG" | "UNSTARTED" | "STARTED" | "COMPLETED" | "CANCELED";
  }>;
  modules: AIProjectPlanModule[];
  epics: Array<{
    name: string;
    description?: string;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    estimatedHours: number;
    epicIndex?: number;
    suggestedStateIndex?: number;
    subtasks?: Array<{ title: string; description?: string }>;
    acceptanceCriteria?: string[];
    suggestedRole?: string;
    sourceFeatureName?: string;
  }>;
  dependencies: Array<{
    taskIndex: number;
    dependsOnTaskIndex: number;
    type: "BLOCKS" | "BLOCKED_BY";
    description?: string;
  }>;
  risks: AIProjectPlanRisk[];
  timeline: AIProjectPlanTimeline;
}

export interface AIPlanModificationResponse {
  updatedPlan: AIProjectPlanResponse;
  delta: {
    addedFeatures: string[];
    removedFeatures: string[];
    modifiedFeatures: string[];
    timelineDeltaHours: number;
    summary: string;
  };
}

export interface AITaskBreakdownResponse {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedHours: number;
  subtasks: Array<{
    title: string;
    description?: string;
    estimatedHours?: number;
  }>;
  dependencies: string[];
  rationale?: string;
}

export interface AIDailyScheduleResponse {
  summary: string;
  timeBlocks: Array<{
    time: string;
    taskTitle: string;
    taskId?: string;
    notes?: string;
  }>;
}

export interface WorkspaceSessionMessage {
  role: string;
  content: string;
  metadata?: {
    plan?: AIProjectPlanResponse;
    delta?: AIPlanModificationResponse["delta"];
  };
}

export interface WorkspaceSessionDraft {
  plan?: AIProjectPlanResponse;
}

export interface WorkspaceSessionItem {
  id: string;
  title?: string;
  createdAt?: string;
  messages?: WorkspaceSessionMessage[];
  drafts?: WorkspaceSessionDraft[];
}

export const centralizedAiService = {
  async listWorkspaceSessions(workspaceId?: string): Promise<WorkspaceSessionItem[]> {
    const res = await api.get<{ data: { sessions: WorkspaceSessionItem[] } }>("/ai/workspace-sessions", {
      params: { workspaceId },
    });
    return res.data?.data?.sessions || [];
  },

  async createWorkspaceSession(workspaceId?: string, title?: string): Promise<WorkspaceSessionItem> {
    const res = await api.post<{ data: { session: WorkspaceSessionItem } }>("/ai/workspace-sessions", {
      workspaceId,
      title,
    });
    return res.data?.data?.session;
  },

  async getWorkspaceSession(workspaceId: string | undefined, sessionId: string): Promise<WorkspaceSessionItem> {
    const res = await api.get<{ data: WorkspaceSessionItem }>(`/ai/workspace-sessions/${sessionId}`, {
      params: { workspaceId },
    });
    return res.data?.data;
  },

  async deleteWorkspaceSession(workspaceId: string | undefined, sessionId: string): Promise<void> {
    await api.delete(`/ai/workspace-sessions/${sessionId}`, {
      params: { workspaceId },
    });
  },

  async listWorkspacePlans(workspaceId?: string): Promise<Record<string, unknown>[]> {
    const res = await api.get<{ plans: Record<string, unknown>[] }>("/ai/workspace-plans", {
      params: { workspaceId },
    });
    return res.data.plans;
  },

  async generateProjectPlan(
    prompt: string,
    context?: string,
    sessionId?: string | null,
    workspaceId?: string | null,
    provider?: string,
    modelName?: string,
  ): Promise<AIProjectPlanResponse> {
    const res = await api.post<{ plan: AIProjectPlanResponse }>(
      "/ai/project-plan",
      {
        prompt,
        context,
        sessionId,
        workspaceId,
        provider,
        modelName,
      },
      { timeout: 180000 },
    );
    return res.data.plan;
  },

  async modifyProjectPlan(
    existingPlan: AIProjectPlanResponse,
    changeRequest: string,
    sessionId?: string | null,
    workspaceId?: string | null,
    provider?: string,
    modelName?: string,
  ): Promise<AIPlanModificationResponse> {
    const res = await api.post<AIPlanModificationResponse>(
      "/ai/modify-project-plan",
      {
        existingPlan,
        changeRequest,
        sessionId,
        workspaceId,
        provider,
        modelName,
      },
      { timeout: 180000 },
    );
    return res.data;
  },

  async confirmProjectPlan(workspaceId: string | null, plan: AIProjectPlanResponse): Promise<Record<string, unknown>> {
    const res = await api.post<{ project: Record<string, unknown> }>("/ai/confirm-project-plan", {
      workspaceId,
      plan,
    });
    return res.data.project;
  },

  async decomposeTask(taskId?: string, title?: string, description?: string): Promise<AITaskBreakdownResponse> {
    const res = await api.post<{ breakdown: AITaskBreakdownResponse }>("/ai/task-breakdown", {
      taskId,
      title,
      description,
    });
    return res.data.breakdown;
  },

  async planDailyWork(workloadContext?: string, workspaceId?: string | null): Promise<AIDailyScheduleResponse> {
    const res = await api.post<{ schedule: AIDailyScheduleResponse }>("/ai/daily-plan", {
      workloadContext,
      workspaceId,
    });
    return res.data.schedule;
  },

  async generateDocument(projectId: string, docType: string, title: string): Promise<{ title: string; content: string; tags: string[] }> {
    const res = await api.post<{ draft: { title: string; content: string; tags: string[] } }>(
      "/ai/document-generation",
      { projectId, docType, title },
    );
    return res.data.draft;
  },

  async generateNotes(projectId: string, transcript: string): Promise<Record<string, unknown>> {
    const res = await api.post<{ notesDraft: Record<string, unknown> }>("/ai/notes-generation", {
      projectId,
      transcript,
    });
    return res.data.notesDraft;
  },

  async chatWithAssistant(projectId: string, message: string, chatHistory?: unknown[]): Promise<string> {
    const res = await api.post<{ reply: string }>("/ai/chat", {
      projectId,
      message,
      chatHistory,
    });
    return res.data.reply;
  },
};

export default centralizedAiService;
