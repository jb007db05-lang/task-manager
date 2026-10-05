import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Plus, Loader2 } from 'lucide-react';
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

  return (
    <div className="mt-8 border-t border-olive-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-olive-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-olive-600" />
          Approval Workflows
        </h3>
        <button
          onClick={() => setRequestModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-olive-700 bg-olive-50 hover:bg-olive-100 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Request Approval
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-olive-400 animate-spin" />
        </div>
      ) : approvals.length === 0 ? (
        <p className="text-xs text-olive-500 italic text-center py-2">No approval workflows for this task.</p>
      ) : (
        <div className="grid gap-3">
          {approvals.map((approval) => {
            const isPendingForMe = approval.status === 'PENDING' && 
              approval.signOffChain.some(s => s.approverUserId === user?.id && s.status === 'PENDING');
            
            return (
              <div key={approval.id} className="p-3 bg-white border border-olive-200 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-olive-900">{ACTION_LABELS[approval.action] || approval.action}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                    approval.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    approval.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {approval.status}
                  </span>
                </div>
                <p className="text-xs text-olive-600 mb-3">{approval.reason}</p>
                
                <div className="space-y-1 mb-3">
                  {approval.signOffChain.map((step) => {
                    const memberName = members.find(m => m.userId === step.approverUserId)?.user.name || 'Unknown User';
                    return (
                      <div key={step.order} className="flex items-center gap-2 text-xs text-olive-500">
                        {step.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> :
                         step.status === 'REJECTED' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                         <Loader2 className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{memberName}</span>
                      </div>
                    );
                  })}
                </div>

                {isPendingForMe && (
                  <div className="flex items-center gap-2 pt-2 border-t border-olive-100 mt-2">
                    <button
                      onClick={() => handleDecision(approval.id, 'APPROVED')}
                      className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-md transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(approval.id, 'REJECTED')}
                      className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-md transition-colors"
                    >
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
        <Modal onClose={() => setRequestModalOpen(false)} title="Request Approval">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-olive-900">Action Type</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ApprovalAction)}
                className="w-full px-3 py-2 bg-white border border-olive-200 rounded-lg text-sm focus:outline-none focus:border-olive-500"
              >
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-semibold text-olive-900">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this approval needed?"
                className="w-full px-3 py-2 bg-white border border-olive-200 rounded-lg text-sm focus:outline-none focus:border-olive-500 min-h-[80px]"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-semibold text-olive-900 mb-1">Select Approvers (ordered)</label>
              <div className="max-h-40 overflow-y-auto border border-olive-200 rounded-lg bg-white custom-scrollbar">
                {members.map(member => (
                  <label key={member.userId} className="flex items-center gap-3 p-2 hover:bg-olive-50 cursor-pointer border-b border-olive-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedApprovers.includes(member.userId)}
                      onChange={() => toggleApprover(member.userId)}
                      className="w-4 h-4 text-olive-600 bg-white border-olive-300 rounded focus:ring-olive-500"
                    />
                    <span className="text-sm text-olive-800">{member.user.name || member.user.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-olive-600 hover:bg-olive-50 border border-olive-200 rounded-lg transition-colors"
                onClick={() => setRequestModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestApproval}
                disabled={submittingRequest || selectedApprovers.length === 0}
                className="px-4 py-2 text-sm font-bold text-white bg-olive-900 hover:bg-olive-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submittingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {submittingRequest ? 'Submitting...' : 'Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
