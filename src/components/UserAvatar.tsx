import Tooltip from './Tooltip';

interface UserAvatarProps {
  name: string | null;
  email: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-[0.75rem]',
  lg: 'w-9 h-9 text-sm'
};

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

  const content = (
    <div 
      className={`flex items-center justify-center rounded-full bg-olive-100  text-olive-700  font-bold shadow-sm border border-olive-200/50  shrink-0 ${sizeClasses[size]} ${className}`}
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