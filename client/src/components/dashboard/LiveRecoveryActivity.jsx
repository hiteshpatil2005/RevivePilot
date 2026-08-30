import { TrendingUp, AlertCircle, Bot, ShieldCheck, Zap, Activity } from 'lucide-react';
import { useRealtime } from '../../hooks/useRealtime';
import LiveIndicator from '../common/LiveIndicator';

const EVENT_STYLE = {
  recovered:  { icon: TrendingUp,    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  detected:   { icon: AlertCircle,   bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)'  },
  rootcause:  { icon: Activity,      bg: 'var(--color-info-bg)',    color: 'var(--color-info)'    },
  strategy:   { icon: Bot,           bg: 'var(--color-brand-light)',color: 'var(--color-brand)'   },
  policy:     { icon: ShieldCheck,   bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  action:     { icon: Zap,           bg: 'var(--color-brand-light)',color: 'var(--color-brand)'   },
};

function EventRow({ event }) {
  const style = EVENT_STYLE[event.type] || EVENT_STYLE.policy;
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: style.bg }}
      >
        <Icon size={13} style={{ color: style.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {event.message}
          </p>
          {event.ts && (
            <span className="font-mono-data text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {event.ts}
            </span>
          )}
        </div>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
          {event.detail}
        </p>
      </div>
    </div>
  );
}

/**
 * LiveRecoveryActivity — real-time event feed.
 * Uses useRealtime() — will switch from mock to WebSocket when backend is ready.
 */
export default function LiveRecoveryActivity() {
  const { events, connected } = useRealtime({ maxEvents: 10 });

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Live Recovery Activity
        </p>
        <LiveIndicator label={connected ? 'Live' : 'Offline'} />
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-5 max-h-[380px]">
        {events.map(ev => (
          <EventRow key={ev.id} event={ev} />
        ))}
      </div>
    </div>
  );
}
