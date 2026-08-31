import { WS_STATUS } from '../../services/websocket';

/**
 * RealtimeStatus — connection state pill badge.
 *
 * Props:
 *   status (string) — WS_STATUS value
 *   showLabel (bool) — show text label alongside dot (default true)
 */

const STATUS_CONFIG = {
  [WS_STATUS.CONNECTED]:    { dot: '#34d399', label: 'LIVE',        labelColor: '#34d399', bg: '#064e3b' },
  [WS_STATUS.DEMO]:         { dot: '#60a5fa', label: 'DEMO',        labelColor: '#60a5fa', bg: '#172554' },
  [WS_STATUS.CONNECTING]:   { dot: '#fbbf24', label: 'CONNECTING',  labelColor: '#fbbf24', bg: '#451a03' },
  [WS_STATUS.RECONNECTING]: { dot: '#f97316', label: 'RECONNECTING',labelColor: '#f97316', bg: '#431407' },
  [WS_STATUS.DISCONNECTED]: { dot: '#f87171', label: 'OFFLINE',     labelColor: '#f87171', bg: '#450a0a' },
};

export default function RealtimeStatus({ status, showLabel = true }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[WS_STATUS.DISCONNECTED];
  const isLive = status === WS_STATUS.CONNECTED || status === WS_STATUS.DEMO;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ backgroundColor: cfg.bg }}
      title={`Connection: ${cfg.label}`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'animate-pulse-live' : ''}`}
        style={{ backgroundColor: cfg.dot }}
        aria-hidden="true"
      />
      {showLabel && (
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: cfg.labelColor }}
        >
          {cfg.label}
        </span>
      )}
    </div>
  );
}
