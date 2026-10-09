import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Plus, Loader2, Clock3 } from 'lucide-react';
import { listApprovals, createApproval, decideApproval, type ApprovalWorkflow, type ApprovalAction } from '@/services/approvals';
import type { ProjectMember } from '@/types/project';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Modal from '@/components/Modal';

interface ApprovalSectionProps {
  projectId: string;
  taskId: string;
  members: ProjectMember[];
}

const ACTION_LABELS: Record<ApprovalAction, string> = {
  PRIORITY_CHANGE: 'Priority Change',
  DYNAMIC_PRIORITY_ESCALATION: 'Dynamic Priority Escalation',
  RETENTION_POLICY_CHANGE: 'Retention Policy Change',
  LEGAL_HOLD_CHANGE: 'Legal Hold Change',
};

export default function ApprovalSection({ projectId, taskId, members }: ApprovalSectionProps) {
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [action, setAction] = useState<ApprovalAction>('DYNAMIC_PRIORITY_ESCALATION');
  const [reason, setReason] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const allApprovals = await listApprovals(projectId);
      const taskApprovals = allApprovals.filter(a => a.taskId === taskId);
      setApprovals(taskApprovals);
    } catch {
      showToast({ message: 'Failed to load approvals', variant: 'error' });
    }
    setLoading(false);
  }, [projectId, taskId, showToast]);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  const handleRequestApproval = async () => {
    if (selectedApprovers.length === 0) {
      showToast({ message: 'Please select at least one approver', variant: 'error' });
      return;
    }
    setSubmittingRequest(true);
    try {
      await createApproval({
        projectId,
        taskId,
        action,
        reason,
        approverUserIds: selectedApprovers,
        payload: { priority: 'CRITICAL' }, // Defaulting to CRITICAL for escalation
      });
      showToast({ message: 'Approval requested successfully', variant: 'success' });
      setRequestModalOpen(false);
      setReason('');
      setSelectedApprovers([]);
      void fetchApprovals();
    } catch {
      showToast({ message: 'Failed to request approval', variant: 'error' });
    }
    setSubmittingRequest(false);
  };

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await decideApproval(approvalId, { decision });
      showToast({ message: `Successfully ${decision.toLowerCase()} approval`, variant: 'success' });
      void fetchApprovals();
    } catch {
      showToast({ message: `Failed to ${decision.toLowerCase()} approval`, variant: 'error' });
    }
  };

  const toggleApprover = (userId: string) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const statusBadge = (status: string) =>
    status === 'APPROVED' ? 'badge-green' : status === 'REJECTED' ? 'badge-red' : 'badge-amber';

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="section-label m-0">Approvals</h4>
        <button onClick={() => setRequestModalOpen(true)} className="btn btn-sm btn-ghost !h-7 -mr-2" type="button">
          <Plus className="w-3.5 h-3.5" />
          Request
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-12" />
      ) : approvals.length === 0 ? (
        <p className="text-[13px] text-olive-500 m-0">No approvals requested for this task.</p>
      ) : (
        <div className="grid gap-2">
          {approvals.map((approval) => {
            const isPendingForMe = approval.status === 'PENDING' &&
              approval.signOffChain.some(s => s.approverUserId === user?.id && s.status === 'PENDING');

            return (
              <div key={approval.id} className="p-3 border border-olive-200 rounded-lg text-[13px]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-olive-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-olive-400" />
                    {ACTION_LABELS[approval.action] || approval.action}
                  </span>
                  <span className={`badge ${statusBadge(approval.status)} !h-5 !text-[11px] capitalize`}>
                    {approval.status.toLowerCase()}
                  </span>
                </div>
                {approval.reason && <p className="text-olive-600 m-0 mb-2">{approval.reason}</p>}

                <ol className="m-0 p-0 list-none space-y-1">
                  {approval.signOffChain.map((step) => {
                    const memberName = members.find(m => m.userId === step.approverUserId)?.user.name || 'Unknown user';
                    return (
                      <li key={step.order} className="flex items-center gap-2 text-xs text-olive-600">
                        {step.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> :
                         step.status === 'REJECTED' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                         <Clock3 className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{memberName}</span>
                      </li>
                    );
                  })}
                </ol>

                {isPendingForMe && (
                  <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-olive-100">
                    <button onClick={() => handleDecision(approval.id, 'APPROVED')} className="btn btn-sm btn-primary flex-1" type="button">
                      Approve
                    </button>
                    <button onClick={() => handleDecision(approval.id, 'REJECTED')} className="btn btn-sm btn-secondary flex-1" type="button">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {requestModalOpen && (
        <Modal onClose={() => setRequestModalOpen(false)} title="Request approval" description="Approvers sign off in the order you select them.">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="field-label !mb-0">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ApprovalAction)}
                className="input-base"
              >
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="field-label !mb-0">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this approval needed?"
                className="input-base min-h-[80px]"
              />
            </div>

            <div className="grid gap-1">
              <label className="field-label !mb-0">Approvers</label>
              <div className="max-h-44 overflow-y-auto border border-olive-200 rounded-lg bg-white custom-scrollbar">
                {members.map(member => (
                  <label key={member.userId} className="flex items-center gap-3 px-3 py-2 hover:bg-olive-50 cursor-pointer border-b border-olive-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedApprovers.includes(member.userId)}
                      onChange={() => toggleApprover(member.userId)}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <span className="text-[13px] text-olive-800 flex-1">{member.user.name || member.user.email}</span>
                    {selectedApprovers.includes(member.userId) && <span className="text-[11px] text-olive-500 tabular-nums">#{selectedApprovers.indexOf(member.userId) + 1}</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRequestModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestApproval}
                disabled={submittingRequest || selectedApprovers.length === 0}
                className="btn btn-primary"
              >
                {submittingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {submittingRequest ? 'Requesting…' : 'Request approval'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
