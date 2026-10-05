import api from "./api";

export interface IPromptVariable {
  name: string;
  type?: "string" | "number" | "json" | "boolean" | "enum";
  description?: string;
  defaultValue?: string;
  required: boolean;
  options?: string[];
}

export interface IPromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptFolder {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt?: string;
}

export interface PromptCanary {
  version: number;
  percentage: number;
  startedAt: string;
}

/** What a prompt serves to the AI feature it is bound to. */
export interface PromptDeploymentSummary {
  featureKey: string | null;
  productionVersion: number;
  stagingVersion: number | null;
  canary: PromptCanary | null;
}

export type DeployStrategy = "direct" | "canary";

export interface PromptDeploymentEvent {
  action:
    | "set-production"
    | "start-canary"
    | "update-canary"
    | "promote-canary"
    | "abort-canary"
    | "rollback"
    | "bind-feature"
    | "unbind-feature";
  version?: number | null;
  previousVersion?: number | null;
  percentage?: number | null;
  featureKey?: string | null;
  actor?: { _id: string; name?: string; email?: string } | string;
  at: string;
}

export interface PromptDeployment extends PromptDeploymentSummary {
  promptId: string;
  latestVersion: number;
  history: PromptDeploymentEvent[];
}

export interface PromptFeature {
  key: string;
  label: string;
  description: string;
  variables: { name: string; description: string }[];
  defaultTemplate: string;
  binding: {
    promptId: string;
    promptName: string;
    productionVersion: number;
    stagingVersion: number | null;
    canary: PromptCanary | null;
  } | null;
}

export interface PromptItem {
  _id: string;
  workspaceId: string;
  projectId?: string | null;
  folderId?: string | null;
  name: string;
  slug?: string;
  description: string;
  category: string;
  tags: string[];
  body: string;
  messages?: IPromptMessage[];
  variables: IPromptVariable[];
  visibility: "private" | "project" | "organization";
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  version: number;
  hash?: string;
  isLatest: boolean;
  parentId?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  usageCount: number;
  deployment?: PromptDeploymentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export type PromptVersionStatus = "production" | "canary" | "staging" | "draft";

export interface PromptVersion {
  _id: string;
  status?: PromptVersionStatus;
  promptId: string;
  version: number;
  hash?: string;
  body: string;
  messages?: IPromptMessage[];
  variables: IPromptVariable[];
  changedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  changeNote?: string;
  createdAt: string;
}

export interface CreatePromptPayload {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  body: string;
  messages?: IPromptMessage[];
  variables?: IPromptVariable[];
  folderId?: string | null;
  visibility?: "private" | "project" | "organization";
  isTemplate?: boolean;
}

export interface UpdatePromptPayload {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  body?: string;
  messages?: IPromptMessage[];
  variables?: IPromptVariable[];
  folderId?: string | null;
  visibility?: "private" | "project" | "organization";
  changeNote?: string;
}

export const promptService = {
  // Folders
  async listFolders(workspaceId: string): Promise<PromptFolder[]> {
    const res = await api.get<{ status: string; data: PromptFolder[] }>(
      `/workspaces/${workspaceId}/prompts/folders`,
    );
    return res.data.data;
  },

  async createFolder(
    workspaceId: string,
    payload: { name: string; description?: string; parentId?: string | null },
  ): Promise<PromptFolder> {
    const res = await api.post<{ status: string; data: PromptFolder }>(
      `/workspaces/${workspaceId}/prompts/folders`,
      payload,
    );
    return res.data.data;
  },

  async deleteFolder(
    workspaceId: string,
    folderId: string,
  ): Promise<{ success: boolean }> {
    const res = await api.delete<{ status: string; data: { success: boolean } }>(
      `/workspaces/${workspaceId}/prompts/folders/${folderId}`,
    );
    return res.data.data;
  },

  // Prompts
  async listPrompts(
    workspaceId: string,
    params?: {
      category?: string;
      folderId?: string;
      search?: string;
      isTemplate?: boolean;
      isFavorite?: boolean;
    },
  ): Promise<PromptItem[]> {
    const res = await api.get<{ status: string; data: PromptItem[] }>(
      `/workspaces/${workspaceId}/prompts`,
      { params },
    );
    return res.data.data;
  },

  async getPromptDetails(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptItem> {
    const res = await api.get<{ status: string; data: PromptItem }>(
      `/workspaces/${workspaceId}/prompts/${promptId}`,
    );
    return res.data.data;
  },

  async createPrompt(
    workspaceId: string,
    payload: CreatePromptPayload,
  ): Promise<PromptItem> {
    const res = await api.post<{ status: string; data: PromptItem }>(
      `/workspaces/${workspaceId}/prompts`,
      payload,
    );
    return res.data.data;
  },

  async updatePrompt(
    workspaceId: string,
    promptId: string,
    payload: UpdatePromptPayload,
  ): Promise<PromptItem> {
    const res = await api.patch<{ status: string; data: PromptItem }>(
      `/workspaces/${workspaceId}/prompts/${promptId}`,
      payload,
    );
    return res.data.data;
  },

  async getPromptVersions(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptVersion[]> {
    const res = await api.get<{ status: string; data: PromptVersion[] }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/versions`,
    );
    return res.data.data;
  },

  async comparePromptVersions(
    workspaceId: string,
    promptId: string,
    v1: number,
    v2: number,
  ): Promise<{ v1: PromptVersion; v2: PromptVersion; hashMatch: boolean }> {
    const res = await api.get<{
      status: string;
      data: { v1: PromptVersion; v2: PromptVersion; hashMatch: boolean };
    }>(`/workspaces/${workspaceId}/prompts/${promptId}/compare`, {
      params: { v1, v2 },
    });
    return res.data.data;
  },

  async toggleFavorite(
    workspaceId: string,
    promptId: string,
  ): Promise<{ isFavorite: boolean }> {
    const res = await api.post<{
      status: string;
      data: { isFavorite: boolean };
    }>(`/workspaces/${workspaceId}/prompts/${promptId}/favorite`);
    return res.data.data;
  },

  async deletePrompt(
    workspaceId: string,
    promptId: string,
  ): Promise<{ success: boolean }> {
    const res = await api.delete<{
      status: string;
      data: { success: boolean };
    }>(`/workspaces/${workspaceId}/prompts/${promptId}`);
    return res.data.data;
  },

  // Deployments: feature binding, production version, canary rollout
  async listFeatures(workspaceId: string): Promise<PromptFeature[]> {
    const res = await api.get<{ status: string; data: PromptFeature[] }>(
      `/workspaces/${workspaceId}/prompts/features`,
    );
    return res.data.data;
  },

  async getDeployment(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptDeployment> {
    const res = await api.get<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment`,
    );
    return res.data.data;
  },

  async deployVersion(
    workspaceId: string,
    promptId: string,
    payload: { version: number; strategy: DeployStrategy; percentage?: number },
  ): Promise<PromptDeployment> {
    const res = await api.post<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/deploy`,
      payload,
    );
    return res.data.data;
  },

  async rollbackProduction(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptDeployment> {
    const res = await api.post<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/rollback`,
    );
    return res.data.data;
  },

  async setProductionVersion(
    workspaceId: string,
    promptId: string,
    version: number,
  ): Promise<PromptDeployment> {
    const res = await api.put<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/production`,
      { version },
    );
    return res.data.data;
  },

  async startCanary(
    workspaceId: string,
    promptId: string,
    version: number,
    percentage: number,
  ): Promise<PromptDeployment> {
    const res = await api.put<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/canary`,
      { version, percentage },
    );
    return res.data.data;
  },

  async promoteCanary(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptDeployment> {
    const res = await api.post<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/canary/promote`,
    );
    return res.data.data;
  },

  async abortCanary(
    workspaceId: string,
    promptId: string,
  ): Promise<PromptDeployment> {
    const res = await api.delete<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/canary`,
    );
    return res.data.data;
  },

  async bindFeature(
    workspaceId: string,
    promptId: string,
    featureKey: string | null,
  ): Promise<PromptDeployment> {
    const res = await api.put<{ status: string; data: PromptDeployment }>(
      `/workspaces/${workspaceId}/prompts/${promptId}/deployment/feature`,
      { featureKey },
    );
    return res.data.data;
  },

  async runPlayground(
    workspaceId: string,
    payload: PlaygroundRunPayload,
  ): Promise<PlaygroundRunResult> {
    const endpoint = payload.promptId
      ? `/workspaces/${workspaceId}/prompts/${payload.promptId}/playground/run`
      : `/workspaces/${workspaceId}/prompts/playground/run`;
    const res = await api.post<{ status: string; data: PlaygroundRunResult }>(
      endpoint,
      payload,
    );
    return res.data.data;
  },
};

export interface PlaygroundRunPayload {
  promptId?: string;
  versionNumber?: number;
  body?: string;
  messages?: IPromptMessage[];
  variables?: Record<string, any>;
  provider?: string;
  modelName?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface PlaygroundRunResult {
  output: string;
  resolvedPrompt: string | IPromptMessage[];
  metadata: {
    modelName: string;
    provider: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    timestamp: string;
    promptId?: string;
    versionNumber?: number;
  };
}

