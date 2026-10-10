export interface Project {
  id: string;
  uuid?: string;
  _id?: string;
  name: string;
  description?: string;
  userId: string;
  currentUserRole: 'ADMIN' | 'MEMBER';
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface ProjectMemberUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt?: string;
  user: ProjectMemberUser;
}

export interface UserSearchResult {
  id: string;
  email: string;
  name: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
