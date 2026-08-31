import { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * ToastContext — Global toast notification system.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Changes saved');
 *   toast.error('Failed to save');
 *   toast.warning('Max retries reached');
 *   toast.info('Case updated');
 */

const ToastContext = createContext(null);

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const add = useCallback((type, message, options = {}) => {
    const id = ++counterRef.current;
    const duration = options.duration ?? DEFAULT_DURATION;

    setToasts(prev => {
      const next = [{ id, type, message, options }, ...prev];
      return next.slice(0, MAX_TOASTS);
    });

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, opts) => add('success', msg, opts),
    error:   (msg, opts) => add('error',   msg, { duration: 6000, ...opts }),
    warning: (msg, opts) => add('warning', msg, opts),
    info:    (msg, opts) => add('info',    msg, opts),
    remove,
  };

  return (
    <ToastContext.Provider value={{ toast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
