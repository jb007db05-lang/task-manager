import React from 'react';
import Loader from './Loader';

interface GlobalLoaderProps {
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ message }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-[1px] animate-fadeIn">
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-olive-950/5">
      <Loader size="sm" />
      <span className="text-[13px] text-olive-600">{message || 'Loading…'}</span>
    </div>
  </div>
);

export default GlobalLoader;
