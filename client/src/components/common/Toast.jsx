import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Toast — renders the floating toast stack.
 * Place once inside DashboardLayout (or App).
 */

const TOAST_CONFIG = {
  success: { icon: CheckCircle2, color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success)' },
  error:   { icon: XCircle,      color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  border: 'var(--color-danger)' },
  warning: { icon: AlertTriangle,color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning)' },
  info:    { icon: Info,         color: 'var(--color-info)',    bg: 'var(--color-info-bg)',    border: 'var(--color-info)' },
};

function ToastItem({ toast, onRemove }) {
  const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className="flex items-start gap-3 w-full animate-fade-in"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: `1px solid ${cfg.border}40`,
        borderLeft: `3px solid ${cfg.border}`,
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-dropdown)',
        minWidth: '280px',
        maxWidth: '380px',
      }}
    >
      <Icon size={16} style={{ color: cfg.color, flexShrink: 0, marginTop: '1px' }} />
      <p className="flex-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer', padding: '0', flexShrink: 0,
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function Toast() {
  const { toasts, toast } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 left-5 z-[100] flex flex-col-reverse gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={toast.remove} />
      ))}
    </div>
  );
}
