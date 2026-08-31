import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../services/auditApi';
import { useRealtimeContext } from '../context/RealtimeContext';
import { REALTIME_EVENT_TYPES } from '../data/mockData';

export function useAuditLogs(initialParams = {}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await auditApi.getLogs(initialParams);
      setLogs(res.logs || res || []);
    } catch (err) {
      console.error('[useAuditLogs] Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Merge live audit events from WebSocket
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (!event?.type) return;

      const newLog = {
        id: `log_live_${Date.now()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        eventType: event.type,
        actor: event.data?.agent || 'RevivePilot System',
        caseId: event.caseId || '—',
        action: event.data?.action || event.type,
        result: event.type.includes('FAILED') || event.type.includes('BLOCKED') ? 'FAILED' : 'SUCCESS',
        detail: event.data?.detail || `Processed ${event.type}`,
        metadata: event.data || {},
        decision: `Live event: ${event.type}`,
        reason: 'Automated state machine evaluation',
        isLive: true,
      };

      setLogs((prev) => [newLog, ...prev]);
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    logs,
    loading,
    error,
    refresh: fetchLogs,
  };
}
