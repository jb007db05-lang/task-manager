import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
}

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: Array<MenuItem | 'divider'>;
  align?: 'left' | 'right';
  width?: string;
}

/** Small dropdown menu: closes on outside click, Escape, or selection. */
function Menu({ trigger, items, align = 'right', width = 'w-56' }: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} ${width} z-50 rounded-xl bg-white p-1 shadow-lg ring-1 ring-olive-950/[0.07] animate-modalIn`}
        >
          {items.map((item, i) =>
            item === 'divider' ? (
              <div key={`d${i}`} className="my-1 h-px bg-olive-100" />
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={[
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 h-8 text-[13px] text-left transition-colors disabled:opacity-40',
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-olive-700 hover:bg-olive-100 hover:text-olive-950',
                ].join(' ')}
              >
                {item.icon && <item.icon size={15} strokeWidth={1.75} className={item.danger ? '' : 'text-olive-400'} />}
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-[11px] text-olive-400">{item.hint}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Menu;
