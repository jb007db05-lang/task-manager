import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ACTIVE_WORKSPACE_KEY } from '@/services/api';
import workspaceService, {
  type PermissionKey,
  type Workspace,
  type WorkspaceAccess
} from '@/services/workspaces';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  access: WorkspaceAccess | null;
  loading: boolean;
  /** Owners/admins always can; members need the flag. */
  can: (permission: PermissionKey) => boolean;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  refresh: () => Promise<void>;
}

const globalContextKey = '__WORKSPACE_CONTEXT__';
const WorkspaceContext: React.Context<WorkspaceContextValue | null> =
  (typeof window !== 'undefined' && (window as any)[globalContextKey]) ||
  (() => {
    const ctx = createContext<WorkspaceContextValue | null>(null);
    if (typeof window !== 'undefined') {
      (window as any)[globalContextKey] = ctx;
    }
    return ctx;
  })();

const readStored = (): string => {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? '';
  } catch {
    return '';
  }
};

const store = (id: string) => {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // The header falls back to the server's default workspace.
  }
};

const fallbackWorkspaceValue: WorkspaceContextValue = {
  workspaces: [],
  activeWorkspace: null,
  activeWorkspaceId: readStored(),
  access: null,
  loading: false,
  can: () => true,
  switchWorkspace: () => {},
  createWorkspace: async () => ({ id: '', name: '', slug: '', role: 'OWNER' } as any),
  refresh: async () => {},
};

/**
 * The workspace the user is working in, plus their role and permissions in
 * it. The API client sends it as X-Workspace-Id on every request.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(readStored);
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await workspaceService.listWorkspaces();
      setWorkspaces(list);
      const current = list.find((w) => w.id === readStored()) ?? list[0];
      if (current) {
        store(current.id);
        setActiveWorkspaceId(current.id);
        setAccess(await workspaceService.getMyAccess(current.id));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchWorkspace = useCallback(
    (id: string) => {
      if (id === activeWorkspaceId) return;
      store(id);
      setActiveWorkspaceId(id);
      setAccess(null);
      void workspaceService.getMyAccess(id).then(setAccess);
    },
    [activeWorkspaceId]
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      const created = await workspaceService.createWorkspace(name);
      store(created.id);
      await refresh();
      return created;
    },
    [refresh]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace: workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
      activeWorkspaceId,
      access,
      loading,
      can: (permission) => Boolean(access && (access.isAdmin || access.permissions[permission])),
      switchWorkspace,
      createWorkspace,
      refresh
    }),
    [workspaces, activeWorkspaceId, access, loading, switchWorkspace, createWorkspace, refresh]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    return fallbackWorkspaceValue;
  }
  return context;
};
