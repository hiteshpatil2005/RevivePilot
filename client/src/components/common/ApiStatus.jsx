import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { checkBackendHealth } from '../../services/api';

/**
 * ApiStatus — shows whether the FastAPI backend is reachable.
 *
 * ● LIVE API  — backend connected
 * ● DEMO      — using mock data (backend unreachable)
 *
 * Checks every 30 seconds.
 */
export default function ApiStatus() {
  const [connected, setConnected] = useState(null); // null = checking

  const check = async () => {
    const ok = await checkBackendHealth();
    setConnected(ok);
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (connected === null) return null; // still checking — show nothing

  if (connected) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'var(--color-success-bg)' }}
        title="FastAPI backend connected"
      >
        <Wifi size={12} style={{ color: 'var(--color-success)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-success)' }}>
          API Live
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ backgroundColor: 'var(--color-bg-muted)' }}
      title="Backend unreachable — using mock data"
    >
      <WifiOff size={12} style={{ color: 'var(--color-text-muted)' }} />
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        API Demo
      </span>
    </div>
  );
}
