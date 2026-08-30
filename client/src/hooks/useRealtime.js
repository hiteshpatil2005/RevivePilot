import { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_LIVE_ACTIVITY } from '../data/mockData';

/**
 * useRealtime — real-time event subscription hook.
 *
 * Currently returns mock events.
 *
 * Future upgrade path:
 *   1. Replace the mock timer with:
 *        ws.current = new WebSocket(import.meta.env.VITE_WS_URL);
 *   2. On ws.onmessage, call handleEvent(JSON.parse(e.data))
 *   3. Remove the mock simulation
 *
 * Returns:
 *   events      — array of event objects (newest first)
 *   connected   — bool (WebSocket connected status)
 *   lastEvent   — most recent event object
 */
export function useRealtime({ maxEvents = 50 } = {}) {
  const [events, setEvents] = useState(MOCK_LIVE_ACTIVITY);
  const [connected, setConnected] = useState(true); // mock: always connected
  const wsRef = useRef(null);

  const handleEvent = useCallback((event) => {
    setEvents(prev => [event, ...prev].slice(0, maxEvents));
  }, [maxEvents]);

  // ── Future: replace this block with real WebSocket setup ──────────────────
  useEffect(() => {
    // Simulate periodic incoming events (mock only)
    const mockEventTypes = ['detected', 'recovered', 'policy', 'strategy', 'action'];
    const interval = setInterval(() => {
      // In production: do nothing here — events arrive via ws.onmessage
      // For demo we don't add events automatically to avoid confusion
    }, 30000);

    setConnected(true);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [handleEvent]);
  // ─────────────────────────────────────────────────────────────────────────

  return {
    events,
    connected,
    lastEvent: events[0] ?? null,
  };
}
