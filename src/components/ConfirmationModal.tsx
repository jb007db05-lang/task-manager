import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const isDanger = type === 'danger';

  return (
    <Modal onClose={onCancel} title={title} maxWidth="max-w-[440px]">
      <div className="flex items-start gap-3.5">
        <div className={[
          'w-9 h-9 flex items-center justify-center rounded-full shrink-0',
          isDanger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'
        ].join(' ')}>
          {isDanger ? <AlertTriangle size={17} /> : <HelpCircle size={17} />}
        </div>
        <p className="text-olive-600 leading-relaxed m-0 pt-1.5 text-sm text-pretty">{message}</p>
      </div>

      <div className="flex items-center justify-end gap-2 -mx-6 -mb-6 px-6 py-4 bg-olive-50/70 border-t border-olive-100 rounded-b-2xl">
        <button className="btn btn-secondary" disabled={isLoading} onClick={onCancel} type="button">
          {cancelText}
        </button>
        <button
          className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          disabled={isLoading}
          onClick={onConfirm}
          type="button"
          autoFocus
        >
          {isLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
