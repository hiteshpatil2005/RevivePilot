import { useState, useEffect } from 'react';
import { wsService, WS_STATUS } from '../../services/websocket';

export default function ConnectionStatusBadge() {
  const [status, setStatus] = useState(wsService.status);

  useEffect(() => {
    return wsService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const config = {
    [WS_STATUS.CONNECTED]: {
      label: 'Live',
      dotColor: 'var(--color-success)',
      textColor: 'var(--color-success)',
      bgColor: 'var(--color-success-bg)',
      pulse: true,
    },
    [WS_STATUS.CONNECTING]: {
      label: 'Connecting...',
      dotColor: 'var(--color-warning)',
      textColor: 'var(--color-warning)',
      bgColor: 'var(--color-warning-bg)',
      pulse: true,
    },
    [WS_STATUS.RECONNECTING]: {
      label: 'Reconnecting...',
      dotColor: 'var(--color-warning)',
      textColor: 'var(--color-warning)',
      bgColor: 'var(--color-warning-bg)',
      pulse: true,
    },
    [WS_STATUS.DISCONNECTED]: {
      label: 'Offline',
      dotColor: 'var(--color-text-muted)',
      textColor: 'var(--color-text-muted)',
      bgColor: 'var(--color-bg-muted)',
      pulse: false,
    },
    [WS_STATUS.DEMO]: {
      label: 'Demo Sync',
      dotColor: 'var(--color-brand)',
      textColor: 'var(--color-brand)',
      bgColor: 'var(--color-brand-light)',
      pulse: false,
    },
  }[status] || {
    label: 'Connecting',
    dotColor: 'var(--color-warning)',
    textColor: 'var(--color-warning)',
    bgColor: 'var(--color-warning-bg)',
    pulse: true,
  };

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: '1px solid currentColor',
        borderColor: `${config.dotColor}33`,
      }}
      title={`Real-Time Connection: ${config.label}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: config.dotColor }}
      />
      <span className="font-semibold tracking-wide">{config.label}</span>
    </div>
  );
}
