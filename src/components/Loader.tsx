import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  center?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2'
};

const Loader: React.FC<LoaderProps> = ({ size = 'md', className = '', center = false, label }) => {
  const loader = (
    <div className={`flex items-center gap-2.5 ${className}`} role="status" aria-live="polite">
      <span className={`${sizeClasses[size]} rounded-full border-olive-200 border-t-brand-600 animate-spin`} />
      {label ? <span className="text-[13px] text-olive-500">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );

  if (center) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[160px]">
        {loader}
      </div>
    );
  }

  return loader;
};

export default Loader;
