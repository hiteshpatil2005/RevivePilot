import {
  AlertCircle, Activity, Bot, ShieldCheck, Zap,
  CheckCircle2, Circle, XCircle, Clock,
} from 'lucide-react';

const STEP_ICONS = {
  detected:  AlertCircle,
  detection: Activity,
  rootcause: Activity,
  strategy:  Bot,
  policy:    ShieldCheck,
  action:    Zap,
  outcome:   CheckCircle2,
};

const STEP_COLORS = {
  done:    { dot: 'var(--color-success)',  bg: 'var(--color-success-bg)',  border: 'var(--color-success)' },
  active:  { dot: 'var(--color-brand)',    bg: 'var(--color-brand-light)', border: 'var(--color-brand)'   },
  pending: { dot: 'var(--color-border-strong)', bg: 'var(--color-bg-muted)', border: 'var(--color-border)' },
  blocked: { dot: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   border: 'var(--color-danger)'  },
  failed:  { dot: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   border: 'var(--color-danger)'  },
};

function StepIcon({ stepKey, status }) {
  const Icon = STEP_ICONS[stepKey] || Circle;
  const c = STEP_COLORS[status] || STEP_COLORS.pending;

  if (status === 'done') {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.bg, border: `2px solid ${c.dot}` }}>
        <CheckCircle2 size={16} style={{ color: c.dot }} />
      </div>
    );
  }
  if (status === 'blocked' || status === 'failed') {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.bg, border: `2px solid ${c.dot}` }}>
        <XCircle size={16} style={{ color: c.dot }} />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.bg, border: `2px solid ${c.dot}` }}>
        <Icon size={16} style={{ color: c.dot }} className="animate-pulse-live" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: c.bg, border: `2px dashed ${c.dot}` }}>
      <Clock size={14} style={{ color: c.dot }} />
    </div>
  );
}

/**
 * AIRecoveryTimeline — the central visual storytelling element of RevivePilot.
 *
 * Renders the full Detection→RootCause→Strategy→Policy→Action→Outcome flow.
 * Accepts `timeline` array from a recovery case object.
 *
 * Props:
 *   timeline ([{ step, label, detail, ts, status }])
 */
export default function AIRecoveryTimeline({ timeline }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          AI Recovery Timeline
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Autonomous pipeline execution trace
        </p>
      </div>
      <div className="px-5 py-4">
        {timeline.map((step, i) => {
          const c = STEP_COLORS[step.status] || STEP_COLORS.pending;
          const isLast = i === timeline.length - 1;

          return (
            <div key={step.step} className="flex gap-4">
              {/* Connector column */}
              <div className="flex flex-col items-center">
                <StepIcon stepKey={step.step} status={step.status} />
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 mt-1"
                    style={{
                      minHeight: '28px',
                      backgroundColor: step.status === 'done'
                        ? 'var(--color-success)'
                        : 'var(--color-border)',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-5'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
                    >
                      {step.label}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {step.detail}
                    </p>
                  </div>
                  {step.ts && (
                    <span
                      className="font-mono-data text-[10px] flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {step.ts}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
