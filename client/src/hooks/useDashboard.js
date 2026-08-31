import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../services/dashboardApi';
import { useRealtimeContext } from '../context/RealtimeContext';
import { REALTIME_EVENT_TYPES } from '../data/mockData';

/**
 * useDashboard — Hook to manage dashboard metrics and live activity,
 * with real-time delta updates from the WebSocket/Realtime pipeline.
 */
export function useDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('[useDashboard] Failed to fetch metrics:', err);
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Subscribe to real-time events that mutate dashboard metrics
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (!event?.type) return;

      setMetrics((prev) => {
        if (!prev) return prev;

        // Clone metrics
        const updated = { ...prev };

        switch (event.type) {
          case REALTIME_EVENT_TYPES.PAYMENT_FAILED:
          case REALTIME_EVENT_TYPES.RECOVERY_CASE_CREATED: {
            const amount = event.data?.amount || 0;
            updated.revenueAtRisk = (updated.revenueAtRisk || 0) + amount;
            updated.activeCases = (updated.activeCases || 0) + 1;
            updated.totalEventsToday = (updated.totalEventsToday || 0) + 1;
            break;
          }

          case REALTIME_EVENT_TYPES.RECOVERY_SUCCESS: {
            const amount = event.data?.amount || 0;
            updated.revenueAtRisk = Math.max(0, (updated.revenueAtRisk || 0) - amount);
            updated.recoveredRevenue = (updated.recoveredRevenue || 0) + amount;
            updated.activeCases = Math.max(0, (updated.activeCases || 0) - 1);
            if (updated.revenueAtRisk + updated.recoveredRevenue > 0) {
              updated.recoveryRate = +(
                (updated.recoveredRevenue / (updated.revenueAtRisk + updated.recoveredRevenue)) *
                100
              ).toFixed(1);
            }
            break;
          }

          case REALTIME_EVENT_TYPES.RECOVERY_FAILED:
          case REALTIME_EVENT_TYPES.CASE_STOPPED: {
            updated.activeCases = Math.max(0, (updated.activeCases || 0) - 1);
            break;
          }

          case REALTIME_EVENT_TYPES.AGENT_STARTED: {
            updated.agentsRunning = Math.min(4, (updated.agentsRunning || 0) + 1);
            break;
          }

          case REALTIME_EVENT_TYPES.AGENT_COMPLETED: {
            updated.agentsRunning = Math.max(0, (updated.agentsRunning || 1) - 1);
            break;
          }

          default:
            break;
        }

        return updated;
      });
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}
