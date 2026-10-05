import React from 'react';
import Loader from './Loader';

interface GlobalLoaderProps {
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40  animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4">
        <Loader size="lg" />
        {message && (
          <span className="text-[11px] font-bold tracking-[0.3em] text-olive-400  uppercase font-sans animate-pulse">
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default GlobalLoader;