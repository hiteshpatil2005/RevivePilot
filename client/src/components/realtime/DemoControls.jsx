import { useState } from 'react';
import { Zap, X, Play, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';
import { useDemoEvents } from '../../hooks/useRealtime';
import { useRealtimeContext } from '../../context/RealtimeContext';

/**
 * DemoControls — Developer/demo real-time event simulator.
 *
 * IMPORTANT: This is a DEMO/DEVELOPMENT tool.
 * It generates mock events through the SAME pipeline that real WebSocket events
 * will use in production, making it ideal for testing and buildathon demos.
 *
 * Hidden in production (VITE_APP_ENV !== 'development').
 * Shows a clear "DEMO MODE" label so it's never confused with real payments.
 */

const IS_DEV = import.meta.env.VITE_APP_ENV !== 'production';

export default function DemoControls() {
  const [open, setOpen] = useState(false);
  const [lastTriggered, setLastTriggered] = useState(null);
  const { connectionStatus } = useRealtimeContext();

  const {
    triggerPaymentFailure,
    triggerRecovery,
    triggerPolicyBlock,
    triggerAgentEvent,
  } = useDemoEvents();

  // Don't render in production
  if (!IS_DEV) return null;

  const trigger = (fn, label) => {
    fn();
    setLastTriggered(label);
    setTimeout(() => setLastTriggered(null), 3000);
  };

  const buttons = [
    {
      label: 'Trigger Payment Failure',
      icon: AlertCircle,
      color: 'var(--color-danger)',
      bg: 'var(--color-danger-bg)',
      fn: () => trigger(triggerPaymentFailure, 'Payment Failure'),
      desc: 'PAYMENT_FAILED → RECOVERY_CASE_CREATED → AGENT_STARTED',
    },
    {
      label: 'Trigger Recovery',
      icon: Play,
      color: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      fn: () => trigger(triggerRecovery, 'Recovery'),
      desc: 'POLICY_APPROVED → ACTION_STARTED → RECOVERY_SUCCESS',
    },
    {
      label: 'Trigger Policy Block',
      icon: X,
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      fn: () => trigger(triggerPolicyBlock, 'Policy Block'),
      desc: 'POLICY_BLOCKED (max retries reached)',
    },
    {
      label: 'Trigger Agent Event',
      icon: Zap,
      color: 'var(--color-brand)',
      bg: 'var(--color-brand-light)',
      fn: () => trigger(triggerAgentEvent, 'Agent Event'),
      desc: 'AGENT_COMPLETED (Strategy Agent)',
    },
  ];

  return (
    <div
      className="fixed bottom-5 right-5 z-50"
      style={{ maxWidth: '320px' }}
    >
      {/* Collapsed state */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all shadow-lg"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-modal)',
          }}
        >
          <Zap size={13} style={{ color: 'var(--color-warning)' }} />
          Demo Controls
          <ChevronUp size={12} style={{ opacity: 0.6 }} />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className="rounded-2xl animate-fade-in"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'linear-gradient(135deg, var(--color-warning-bg), var(--color-bg-card))',
            }}
          >
            <div className="flex items-center gap-2">
              <Zap size={13} style={{ color: 'var(--color-warning)' }} />
              <span className="text-[12px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Realtime Demo Controls
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
              >
                Dev Only
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Demo mode notice */}
          <div
            className="flex items-start gap-2 px-4 py-2.5 text-[11px]"
            style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}
          >
            <Info size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Events flow through the same pipeline as real WebSocket events. Not real payments.</span>
          </div>

          {/* Buttons */}
          <div className="p-3 space-y-2">
            {buttons.map((btn, idx) => {
              const Icon = btn.icon;
              return (
                <button
                  key={idx}
                  onClick={btn.fn}
                  className="w-full flex flex-col gap-1 p-3 rounded-xl cursor-pointer transition-all text-left"
                  style={{
                    backgroundColor: btn.bg,
                    border: `1px solid ${btn.color}30`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color: btn.color }} />
                    <span className="text-[12px] font-semibold" style={{ color: btn.color }}>
                      {btn.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-data" style={{ color: 'var(--color-text-muted)', paddingLeft: '21px' }}>
                    {btn.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Last triggered */}
          {lastTriggered && (
            <div
              className="px-4 pb-3 animate-fade-in"
            >
              <p className="text-[11px] text-center py-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ {lastTriggered} event dispatched
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
