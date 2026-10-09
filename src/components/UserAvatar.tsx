import Tooltip from './Tooltip';

interface UserAvatarProps {
  name: string | null;
  email: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-9 h-9 text-[13px]'
};

// Muted, palette-friendly avatar tints, chosen deterministically per user.
const palette = [
  'bg-brand-100 text-brand-800',
  'bg-olive-200 text-olive-800',
  'bg-amber-100 text-amber-800',
  'bg-blue-100 text-blue-800',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-800',
];

export default function UserAvatar({ 
  name, 
  email, 
  size = 'md', 
  className = '',
  showTooltip = true
}: UserAvatarProps) {
  // Better initials logic: Take first initial of first and last word if available
  const nameParts = (name || '').trim().split(' ').filter(p => p.length > 0);
  const initials = nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0]?.[0] || email[0] || 'U').toUpperCase();

  const fullName = name || email;
  const hash = Array.from(email || fullName).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const content = (
    <div 
      className={`flex items-center justify-center rounded-full font-semibold ring-2 ring-white shrink-0 ${palette[hash % palette.length]} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip content={fullName}>
        {content}
      </Tooltip>
    );
  }

  return content;
}