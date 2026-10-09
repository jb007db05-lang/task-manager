import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Open modals, newest last — Escape only closes the top one. */
const modalStack: symbol[] = [];

interface ModalProps {
  backdropClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  title: string;
  description?: string;
  maxWidth?: string;
}

function Modal({ backdropClassName, bodyClassName, children, onClose, panelClassName, title, description, maxWidth = 'max-w-[560px]' }: ModalProps): JSX.Element {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const idRef = useRef(Symbol('modal'));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = idRef.current;
    modalStack.push(id);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalStack[modalStack.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(id), 1);
    };
  }, []);

  if (portalTarget == null) {
    return <></>;
  }

  return createPortal(
    <div
      aria-modal="true"
      aria-label={title}
      className={[
        'fixed inset-0 z-[1000] flex items-start sm:items-center justify-center',
        'bg-olive-950/40 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto animate-fadeIn',
        backdropClassName ?? ''
      ].join(' ')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div
        className={[
          'relative w-full max-h-[calc(100vh-3rem)] flex flex-col my-auto',
          maxWidth,
          'bg-white rounded-2xl shadow-2xl ring-1 ring-olive-950/5',
          'animate-modalIn',
          panelClassName ?? ''
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-olive-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold m-0 text-olive-950 tracking-tight">{title}</h2>
            {description ? <p className="text-[13px] text-olive-500 mt-0.5 mb-0">{description}</p> : null}
          </div>
          <button
            aria-label="Close"
            className="icon-btn -mr-2 -mt-1 shrink-0"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className={['p-6 grid gap-5 overflow-y-auto', bodyClassName ?? ''].join(' ')}>{children}</div>
      </div>
    </div>,
    portalTarget
  );
}

export default Modal;
