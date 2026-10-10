import { useCallback, useEffect, useState } from 'react';
import { FileText, Link2, Lock, Share2, UserMinus, Users } from 'lucide-react';

import Drawer from '@/components/Drawer';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { promptService, type PromptAccessGrant, type PromptItem } from '@/services/prompts';
import type { ProjectMember } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface ProjectPromptsPanelProps {
  projectId: string;
  projectName: string;
  members: ProjectMember[];
  onClose: () => void;
}

const VISIBILITY_LABEL: Record<PromptItem['visibility'], string> = {
  private: 'Private',
  project: 'Project',
  organization: 'Workspace'
};

/** Pick teammates who may open one prompt, and see who already can. */
function ShareDialog({ prompt, members, onClose }: { prompt: PromptItem; members: ProjectMember[]; onClose: () => void }): JSX.Element {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [grants, setGrants] = useState<PromptAccessGrant[] | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    promptService
      .listPromptAccess(activeWorkspaceId, prompt._id)
      .then(setGrants)
      .catch((error) => {
        showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
        setGrants([]);
      });
  }, [activeWorkspaceId, prompt._id, showToast]);

  const granted = new Set((grants ?? []).map((g) => g.userId));
  const candidates = members.filter(
    (m) => m.userId !== user?.id && m.userId !== prompt.createdBy?._id && !granted.has(m.userId)
  );

  const run = async (fn: () => Promise<PromptAccessGrant[]>, message: string) => {
    setBusy(true);
    try {
      setGrants(await fn());
      setSelected('');
      showToast({ variant: 'success', message });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal description={`Only the people listed here (plus its author and admins) can open “${prompt.name}”.`} onClose={onClose} title="Share with a teammate">
      <div className="flex gap-2">
        <select aria-label="Teammate" className="input-base flex-1" onChange={(e) => setSelected(e.target.value)} value={selected}>
          <option value="">{candidates.length ? 'Choose a project member…' : 'Everyone in this project already has access'}</option>
          {candidates.map((m) => (
            <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
          ))}
        </select>
        <button
          className="btn btn-primary"
          disabled={!selected || busy}
          onClick={() => {
            const member = members.find((m) => m.userId === selected);
            void run(
              () => promptService.sharePrompt(activeWorkspaceId, prompt._id, selected),
              `Shared with ${member?.user.name || member?.user.email || 'teammate'}.`
            );
          }}
          type="button"
        >
          Share
        </button>
      </div>

      <div>
        <div className="section-label mb-2">People with access</div>
        {grants === null ? (
          <div className="skeleton h-12" />
        ) : grants.length === 0 ? (
          <p className="m-0 text-[13px] text-olive-500">Not shared with anyone individually yet.</p>
        ) : (
          <ul className="m-0 p-0 list-none rounded-lg border border-olive-200 divide-y divide-olive-100">
            {grants.map((g) => (
              <li className="flex items-center gap-3 px-3 py-2" key={g.id}>
                <UserAvatar email={g.email} name={g.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-olive-900 truncate">{g.name || g.email}</div>
                  <div className="text-[11px] text-olive-500">
                    Shared {g.grantedBy ? `by ${g.grantedBy} ` : ''}on {new Date(g.grantedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  aria-label={`Stop sharing with ${g.name || g.email}`}
                  className="btn btn-sm btn-ghost"
                  disabled={busy}
                  onClick={() => void run(() => promptService.unsharePrompt(activeWorkspaceId, prompt._id, g.userId), 'Access removed.')}
                  type="button"
                >
                  <UserMinus size={13} /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Project → Prompts: prompts linked to the project, attaching and sharing. */
function ProjectPromptsPanel({ projectId, projectName, members, onClose }: ProjectPromptsPanelProps): JSX.Element {
  const { activeWorkspaceId, can } = useWorkspace();
  const { showToast } = useToast();
  const [prompts, setPrompts] = useState<PromptItem[] | null>(null);
  const [library, setLibrary] = useState<PromptItem[]>([]);
  const [attachId, setAttachId] = useState('');
  const [sharing, setSharing] = useState<PromptItem | null>(null);

  const load = useCallback(async () => {
    try {
      const [inProject, all] = await Promise.all([
        promptService.listPrompts(activeWorkspaceId, { projectId }),
        can('prompt.add_to_project') ? promptService.listPrompts(activeWorkspaceId) : Promise.resolve([])
      ]);
      setPrompts(inProject);
      setLibrary(all.filter((p) => !p.projectId));
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      setPrompts([]);
    }
  }, [activeWorkspaceId, projectId, can, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const attach = async () => {
    if (!attachId) return;
    try {
      await promptService.updatePrompt(activeWorkspaceId, attachId, { projectId, visibility: 'project' });
      setAttachId('');
      showToast({ variant: 'success', message: 'Prompt attached to the project.' });
      await load();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  return (
    <Drawer description={projectName} onClose={onClose} title="Project prompts">
      {can('prompt.add_to_project') && (
        <section className="px-6 py-4 border-b border-olive-100 bg-olive-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={14} className="text-brand-700" />
            <h3 className="m-0 text-[14px] font-semibold text-olive-950">Attach a prompt from the library</h3>
          </div>
          <div className="flex gap-2">
            <select aria-label="Prompt" className="input-base flex-1" onChange={(e) => setAttachId(e.target.value)} value={attachId}>
              <option value="">{library.length ? 'Choose a prompt…' : 'No unattached prompts you can edit'}</option>
              {library.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button className="btn btn-primary" disabled={!attachId} onClick={() => void attach()} type="button">Attach</button>
          </div>
          <p className="field-hint mb-0 mt-1.5">Attached prompts are visible to everyone who can open this project.</p>
        </section>
      )}

      <section className="px-6 py-4">
        {prompts === null ? (
          <div className="grid gap-2">{[0, 1, 2].map((i) => <div className="skeleton h-16" key={i} />)}</div>
        ) : prompts.length === 0 ? (
          <EmptyState icon={FileText} title="No prompts in this project" description="Attach prompts from the library so the whole team uses the same versions." />
        ) : (
          <ul className="m-0 p-0 list-none grid gap-2">
            {prompts.map((p) => (
              <li className="card px-4 py-3" key={p._id}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                    <FileText size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-olive-950 truncate">{p.name}</span>
                      <span className="badge badge-slate !h-5 !text-[10px]">v{p.version}</span>
                      <span className="badge badge-slate !h-5 !text-[10px]">
                        {p.visibility === 'private' ? <Lock size={10} /> : <Users size={10} />}
                        {VISIBILITY_LABEL[p.visibility]}
                      </span>
                    </div>
                    {p.description && <p className="m-0 mt-0.5 text-xs text-olive-500 line-clamp-2">{p.description}</p>}
                    <div className="mt-1 text-[11px] text-olive-400">
                      By {p.createdBy?.name || p.createdBy?.email || 'unknown'} · used {p.usageCount ?? 0} {p.usageCount === 1 ? 'time' : 'times'}
                    </div>
                  </div>
                  {can('prompt.share_individual') && (
                    <button className="btn btn-sm btn-secondary shrink-0" onClick={() => setSharing(p)} type="button">
                      <Share2 size={13} /> Share
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sharing && <ShareDialog members={members} onClose={() => setSharing(null)} prompt={sharing} />}
    </Drawer>
  );
}

export default ProjectPromptsPanel;
