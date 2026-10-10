import api from "./api";

export interface ProjectState {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  category: "BACKLOG" | "UNSTARTED" | "STARTED" | "COMPLETED" | "CANCELED";
  isDefault?: boolean;
  isTerminal?: boolean;
}

export const projectStateService = {
  async getProjectStates(projectId: string): Promise<ProjectState[]> {
    const res = await api.get<{ states: ProjectState[] }>(`/projects/${projectId}/states`);
    return res.data.states;
  },

  async createProjectState(
    projectId: string,
    payload: { name: string; color?: string; category?: string; description?: string },
  ): Promise<ProjectState> {
    const res = await api.post<{ state: ProjectState }>(`/projects/${projectId}/states`, payload);
    return res.data.state;
  },

  async updateProjectState(
    projectId: string,
    stateId: string,
    payload: Partial<ProjectState>,
  ): Promise<ProjectState> {
    const res = await api.patch<{ state: ProjectState }>(
      `/projects/${projectId}/states/${stateId}`,
      payload,
    );
    return res.data.state;
  },

  async deleteProjectState(projectId: string, stateId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/states/${stateId}`);
  },

  async reorderProjectStates(projectId: string, stateIds: string[]): Promise<ProjectState[]> {
    const res = await api.patch<{ states: ProjectState[] }>(
      `/projects/${projectId}/states/reorder`,
      { stateIds },
    );
    return res.data.states;
  },
};

export default projectStateService;
