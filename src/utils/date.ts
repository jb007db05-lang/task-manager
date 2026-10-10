/**
 * Standardised date formatting utility
 */

export type DateFormatType = 'short' | 'full' | 'time' | 'relative' | 'compact';

/**
 * Formats a date string or object into a human-readable format.
 * 
 * @param date The date to format
 * @param type The format type
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | number | undefined | null, type: DateFormatType = 'short'): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (type) {
    case 'time':
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    case 'short':
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    
    case 'compact':
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric'
      });

    case 'full':
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'relative':
      return formatRelativeTime(d);
      
    default:
      return d.toLocaleString();
  }
}

/**
 * Basic relative time formatter
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
