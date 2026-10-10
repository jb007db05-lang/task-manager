import api from './api';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'GUEST';

/** Mirrors the backend catalog (GET /workspaces/permissions). */
export type PermissionKey =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'task.update_status'
  | 'prompt.access'
  | 'prompt.create'
  | 'library.access'
  | 'prompt.add_to_project'
  | 'prompt.share_individual'
  | 'intelligence.view'
  | 'intelligence.analyze';

export type PermissionSet = Record<PermissionKey, boolean>;

export interface PermissionDefinition {
  key: PermissionKey;
  group: string;
  label: string;
  description: string;
}

export interface PermissionCatalog {
  permissions: PermissionDefinition[];
  roles: WorkspaceRole[];
  assignableRoles: WorkspaceRole[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  permissions: PermissionSet;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  /** Membership id (used to edit permissions/role). */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  permissions: PermissionSet;
  joinedAt: string;
  isPending?: boolean;
  token?: string;
}

export interface WorkspaceAccess {
  workspaceId: string;
  memberId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  permissions: PermissionSet;
}

export interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  currentUserRole: WorkspaceRole;
  isAdmin: boolean;
  members: WorkspaceMember[];
  projects: Array<{ id: string; name: string; description?: string; color: string; status: string }>;
}

const base = (id: string) => `/workspaces/${id}`;

export const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    return (await api.get<{ workspaces: Workspace[] }>('/workspaces')).data.workspaces;
  },

  async createWorkspace(name: string): Promise<Workspace> {
    return (await api.post<{ workspace: Workspace }>('/workspaces', { name })).data.workspace;
  },

  async getWorkspaceDetails(id: string): Promise<WorkspaceDetails> {
    return (await api.get<{ workspace: WorkspaceDetails }>(base(id))).data.workspace;
  },

  async updateWorkspace(id: string, payload: { name?: string }): Promise<void> {
    await api.patch(base(id), payload);
  },

  async getMyAccess(id: string): Promise<WorkspaceAccess> {
    return (await api.get<{ access: WorkspaceAccess }>(`${base(id)}/me`)).data.access;
  },

  async getPermissionCatalog(): Promise<PermissionCatalog> {
    return (await api.get<PermissionCatalog>('/workspaces/permissions')).data;
  },

  async listMembers(id: string): Promise<WorkspaceMember[]> {
    return (await api.get<{ members: WorkspaceMember[] }>(`${base(id)}/members`)).data.members;
  },

  async inviteMember(id: string, email: string, role: WorkspaceRole = 'MEMBER'): Promise<WorkspaceMember> {
    return (await api.post<{ member: WorkspaceMember }>(`${base(id)}/members`, { email, role })).data.member;
  },

  async updateMemberPermissions(
    id: string,
    memberId: string,
    permissions: Partial<PermissionSet>
  ): Promise<WorkspaceMember> {
    return (
      await api.patch<{ member: WorkspaceMember }>(`${base(id)}/members/${memberId}/permissions`, { permissions })
    ).data.member;
  },

  async updateMemberRole(id: string, memberId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    return (await api.patch<{ member: WorkspaceMember }>(`${base(id)}/members/${memberId}/role`, { role })).data
      .member;
  },

  async removeMember(id: string, memberId: string): Promise<void> {
    await api.delete(`${base(id)}/members/${memberId}`);
  }
};

export default workspaceService;
