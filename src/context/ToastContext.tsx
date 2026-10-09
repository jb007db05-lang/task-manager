import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  dedupeKey: string;
}

interface ToastContextValue {
  showToast: (input: { variant: ToastVariant; message: string; dedupeKey?: string }) => void;
  dismissToast: (id: string) => void;
}

const TOAST_DURATION_MS = 5000;
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let showGlobalToastFn:
  | ((input: { variant: ToastVariant; message: string; dedupeKey?: string }) => void)
  | null = null;

export const showGlobalToast = (input: {
  variant: ToastVariant;
  message: string;
  dedupeKey?: string;
}): void => {
  showGlobalToastFn?.(input);
};

const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-5 right-5 z-[10000] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        role={toast.variant === 'error' ? 'alert' : 'status'}
        className="flex items-start gap-3 rounded-xl bg-olive-950 px-4 py-3 text-white shadow-xl ring-1 ring-black/10 animate-slideUp"
      >
        <span className={`mt-0.5 shrink-0 ${toast.variant === 'success' ? 'text-brand-300' : 'text-red-300'}`}>
          {toast.variant === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
        </span>
        <p className="m-0 flex-1 text-[13px] leading-5 text-white/90">{toast.message}</p>
        <button
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => onDismiss(toast.id)}
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = ({
    variant,
    message,
    dedupeKey
  }: {
    variant: ToastVariant;
    message: string;
    dedupeKey?: string;
  }) => {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      return;
    }

    const normalizedDedupeKey = dedupeKey ?? `${variant}:${normalizedMessage}`;

    setToasts((current) => {
      if (current.some((toast) => toast.dedupeKey === normalizedDedupeKey)) {
        return current;
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          variant,
          message: normalizedMessage,
          dedupeKey: normalizedDedupeKey
        }
      ];
    });
  };

  useEffect(() => {
    showGlobalToastFn = showToast;

    return () => {
      showGlobalToastFn = null;
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismissToast(toast.id);
      }, TOAST_DURATION_MS)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};