import React from 'react';
import { createPortal } from 'react-dom';
import { useLoading } from '@/context/LoadingContext';

/** A slim progress bar along the top edge while any tracked request is in flight. */
export default function GlobalLoadingSpinner() {
  const { loadingCount } = useLoading();

  if (loadingCount === 0) return null;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[999999] h-[2px] overflow-hidden pointer-events-none" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 bg-brand-500 animate-[global-progress_1.1s_ease-in-out_infinite]" />
      <style>{'@keyframes global-progress{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>,
    document.body
  );
}
