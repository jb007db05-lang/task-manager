import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class for larger screens. */
  width?: string;
  actions?: ReactNode;
}

/** Right-hand panel for project tools (time, prompts…). Escape or backdrop closes it. */
function Drawer({ title, description, onClose, children, width = 'sm:w-[600px]', actions }: DrawerProps): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[2000] bg-olive-950/30 animate-fadeIn" onClick={onClose} />
      <aside
        aria-label={title}
        className={`fixed top-0 right-0 z-[2001] h-full w-full ${width} bg-white shadow-2xl border-l border-olive-200 flex flex-col animate-slideInRight`}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-olive-200">
          <div className="min-w-0">
            <h2 className="m-0 text-[16px] font-semibold text-olive-950 tracking-tight">{title}</h2>
            {description && <p className="m-0 mt-0.5 text-[13px] text-olive-500">{description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button aria-label="Close" className="icon-btn -mr-2" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
      </aside>
    </>,
    document.body
  );
}

export default Drawer;
