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
  const typeMap = {
    [REALTIME_EVENT_TYPES.PAYMENT_FAILED]:       { type: 'detected',  message: 'Failure detected' },
    [REALTIME_EVENT_TYPES.RECOVERY_CASE_CREATED]:{ type: 'detected',  message: 'Case created' },
    [REALTIME_EVENT_TYPES.RECOVERY_CASE_UPDATED]:{ type: 'action',    message: 'Case updated' },
    [REALTIME_EVENT_TYPES.AGENT_STARTED]:        { type: 'strategy',  message: 'Agent started' },
    [REALTIME_EVENT_TYPES.AGENT_COMPLETED]:      { type: 'strategy',  message: 'Agent completed' },
    [REALTIME_EVENT_TYPES.POLICY_APPROVED]:      { type: 'policy',    message: 'Policy approved' },
    [REALTIME_EVENT_TYPES.POLICY_BLOCKED]:       { type: 'policy',    message: 'Policy blocked' },
    [REALTIME_EVENT_TYPES.ACTION_STARTED]:       { type: 'action',    message: 'Action started' },
    [REALTIME_EVENT_TYPES.ACTION_COMPLETED]:     { type: 'action',    message: 'Action completed' },
    [REALTIME_EVENT_TYPES.RECOVERY_SUCCESS]:     { type: 'recovered', message: 'Recovery successful' },
    [REALTIME_EVENT_TYPES.RECOVERY_FAILED]:      { type: 'failed',    message: 'Recovery failed' },
  };

  const mapped = typeMap[event.type] || { type: 'action', message: event.type };
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  return {
    id: `act_demo_${Date.now()}`,
    type: mapped.type,
    ts,
    message: mapped.message,
    detail: event.data?.detail || `${event.caseId || ''} — ${event.type}`,
    caseId: event.caseId || null,
    isDemo: true,
  };
}

/**
 * Map a raw realtime event to a notification entry.
 */
function eventToNotification(event) {
  const categoryMap = {
    [REALTIME_EVENT_TYPES.PAYMENT_FAILED]:        { category: 'Recovery', severity: 'danger' },
    [REALTIME_EVENT_TYPES.RECOVERY_SUCCESS]:      { category: 'Recovery', severity: 'success' },
    [REALTIME_EVENT_TYPES.RECOVERY_FAILED]:       { category: 'Recovery', severity: 'danger' },
    [REALTIME_EVENT_TYPES.POLICY_BLOCKED]:        { category: 'Policy',   severity: 'warning' },
    [REALTIME_EVENT_TYPES.POLICY_APPROVED]:       { category: 'Policy',   severity: 'info' },
    [REALTIME_EVENT_TYPES.AGENT_STARTED]:         { category: 'AI Agent', severity: 'info' },
    [REALTIME_EVENT_TYPES.AGENT_COMPLETED]:       { category: 'AI Agent', severity: 'info' },
  };

  const mapped = categoryMap[event.type] || { category: 'System', severity: 'info' };

  return {
    id: `notif_demo_${Date.now()}`,
    category: mapped.category,
    severity: mapped.severity,
    title: event.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    message: event.data?.detail || `Event received for ${event.caseId || 'system'}`,
    timestamp: new Date().toISOString(),
    read: false,
    caseId: event.caseId || null,
    isDemo: true,
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
