import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  compact?: boolean;
  description: string;
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

function EmptyState({ compact = false, description, icon: Icon, title, action }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12'
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={[
          'inline-flex items-center justify-center rounded-full',
          'bg-olive-100 text-olive-500 ring-8 ring-olive-50',
          compact ? 'w-9 h-9 mb-1' : 'w-11 h-11 mb-2'
        ].join(' ')}
      >
        <Icon size={compact ? 16 : 19} strokeWidth={1.75} />
      </div>
      <div className="grid gap-1 max-w-[380px]">
        <strong className={`text-olive-900 font-medium ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{title}</strong>
        <p className={`m-0 text-olive-500 text-pretty ${compact ? 'text-xs' : 'text-[13px]'}`}>{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
