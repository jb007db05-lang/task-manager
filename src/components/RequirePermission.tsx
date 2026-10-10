import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { useWorkspace } from '@/context/WorkspaceContext';
import type { PermissionKey } from '@/services/workspaces';

interface RequirePermissionProps {
  permission: PermissionKey;
  children: ReactNode;
  /** What the gated area is, for the message ("the prompt library"). */
  feature: string;
  /** Render nothing instead of the explanation (for buttons and menu items). */
  silent?: boolean;
}

/**
 * Shows children only when the member holds the permission in the active
 * workspace. The server enforces the same rule; this keeps the UI honest.
 */
function RequirePermission({ permission, children, feature, silent = false }: RequirePermissionProps): JSX.Element | null {
  const { can, access, activeWorkspace } = useWorkspace();
  if (!access) return silent ? null : <div className="p-8"><div className="skeleton h-40" /></div>;
  if (can(permission)) return <>{children}</>;
  if (silent) return null;
  return (
    <div className="px-8 py-16">
      <EmptyState
        icon={Lock}
        title={`You don't have access to ${feature}`}
        description={`Ask an admin of ${activeWorkspace?.name ?? 'this workspace'} to turn on this permission for you.`}
      />
    </div>
  );
}

export default RequirePermission;
