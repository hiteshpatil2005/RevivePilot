import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { wsService, WS_STATUS } from '../services/websocket';
import { MOCK_LIVE_ACTIVITY, MOCK_NOTIFICATIONS, REALTIME_EVENT_TYPES } from '../data/mockData';

/**
 * RealtimeContext — Centralized real-time event system for RevivePilot.
 *
 * Architecture:
 *   WebSocket Service
 *       ↓
 *   RealtimeContext (this provider)
 *       ↓
 *   Application components (via useRealtimeContext hook)
 *
 * In demo mode (no VITE_WS_URL), events are injected via triggerDemoEvent().
 * In production, events arrive via the WebSocket connection automatically.
 *
 * Usage in components:
 *   const { events, connectionStatus, notifications, triggerDemoEvent } = useRealtimeContext();
 */

const RealtimeContext = createContext(null);

const MAX_EVENTS = 100;
const MAX_NOTIFICATIONS = 50;

/**
 * Map a raw realtime event to a live activity entry (for the activity feed).
 */
function eventToActivity(event) {
  const evType = (event.event_type || event.type || '').toLowerCase();
  const data = event.data || {};
  const caseId = data.case_id || event.caseId || '';
  const amt = data.amount ? `₹${Number(data.amount).toLocaleString('en-IN')}` : '';
  const reason = data.failure_reason || '';

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  if (evType.includes('failed')) {
    return {
      id: event.event_id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'detected',
      ts,
      message: `Payment failed — ${amt}`,
      detail: `${reason ? reason + ' • ' : ''}${caseId ? 'Case ' + caseId : 'Risk detected'}`,
      caseId: caseId || null,
      isDemo: false,
    };
  }

  if (evType.includes('success') || evType.includes('recovered')) {
    return {
      id: event.event_id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'recovered',
      ts,
      message: `Payment success — ${amt}`,
      detail: caseId ? `Case ${caseId} resolved` : 'Autonomous recovery verified',
      caseId: caseId || null,
      isDemo: false,
    };
  }

  return {
    id: event.event_id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'action',
    ts,
    message: event.type || event.event_type || 'Payment event',
    detail: data.detail || (caseId ? `Case ${caseId}` : 'Event emitted'),
    caseId: caseId || null,
    isDemo: false,
  };
}

/**
 * Map a raw realtime event to a notification entry.
 */
function eventToNotification(event) {
  const evType = (event.event_type || event.type || '').toLowerCase();
  const data = event.data || {};
  const caseId = data.case_id || event.caseId || null;
  const amt = data.amount ? `₹${Number(data.amount).toLocaleString('en-IN')}` : '';

  let category = 'System';
  let severity = 'info';
  let title = 'Payment Event';
  let message = data.detail || 'Event received';

  if (evType.includes('failed')) {
    category = 'Recovery';
    severity = 'danger';
    title = `Payment Failed: ${amt}`;
    message = `Transaction flagged (${data.failure_reason || 'Failure'}). ${caseId ? 'Case ' + caseId + ' created.' : ''}`;
  } else if (evType.includes('success') || evType.includes('recovered')) {
    category = 'Recovery';
    severity = 'success';
    title = `Payment Recovered: ${amt}`;
    message = `Transaction successfully verified. ${caseId ? 'Case ' + caseId + ' closed.' : ''}`;
  }

  return {
    id: event.event_id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category,
    severity,
    title,
    message,
    timestamp: event.timestamp || new Date().toISOString(),
    read: false,
    caseId,
    isDemo: false,
  };
}

export function RealtimeProvider({ children }) {
  const [events, setEvents]               = useState(MOCK_LIVE_ACTIVITY);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [connectionStatus, setConnectionStatus] = useState(WS_STATUS.DISCONNECTED);
  const [demoMode, setDemoMode]           = useState(false);
  const subscribersRef                    = useRef(new Set());

  // ── Connect WebSocket on mount ────────────────────────────────────────────
  useEffect(() => {
    // Listen for status changes
    const unsubStatus = wsService.onStatusChange(status => {
      setConnectionStatus(status);
      if (status === WS_STATUS.DEMO) setDemoMode(true);
    });

    // Listen for incoming events
    const unsubEvents = wsService.subscribe(event => {
      handleIncomingEvent(event);
    });

    // Connect (will auto-enter demo mode if no WS_URL)
    wsService.connect();

    return () => {
      unsubStatus();
      unsubEvents();
      wsService.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIncomingEvent = useCallback((event) => {
    // 1. Add to activity feed
    setEvents(prev => [eventToActivity(event), ...prev].slice(0, MAX_EVENTS));

    // 2. Add to notifications
    setNotifications(prev => [eventToNotification(event), ...prev].slice(0, MAX_NOTIFICATIONS));

    // 3. Notify additional subscribers
    subscribersRef.current.forEach(fn => {
      try { fn(event); } catch {}
    });
  }, []);

  /**
   * subscribe(handler) — Subscribe to incoming realtime events.
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  const subscribe = useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => subscribersRef.current.delete(handler);
  }, []);

  /**
   * triggerDemoEvent(event) — Inject a demo event into the pipeline.
   * Same code path as a real WebSocket event. Used for demo/testing.
   * @param {Object} event — { type, caseId, data }
   */
  const triggerDemoEvent = useCallback((event) => {
    const enriched = {
      ...event,
      timestamp: new Date().toISOString(),
      merchantId: 'merchant_001',
      _demo: true,
    };
    wsService.dispatchEvent(enriched);
    // Also directly handle since wsService won't echo back in demo mode
    handleIncomingEvent(enriched);
  }, [handleIncomingEvent]);

  /**
   * markNotificationRead(id) — Mark a notification as read.
   */
  const markNotificationRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  /**
   * markAllNotificationsRead() — Mark all notifications as read.
   */
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <RealtimeContext.Provider value={{
      events,
      notifications,
      connectionStatus,
      demoMode,
      unreadCount,
      subscribe,
      triggerDemoEvent,
      markNotificationRead,
      markAllNotificationsRead,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeContext must be used inside RealtimeProvider');
  return ctx;
}

export const useRealtime = useRealtimeContext;
