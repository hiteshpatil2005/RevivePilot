import { useState, useEffect, useCallback } from 'react';
import { recoveryApi } from '../services/recoveryApi';
import { useRealtimeContext } from '../context/RealtimeContext';
import { REALTIME_EVENT_TYPES } from '../data/mockData';

/**
 * useRecoveryCases — Hook to fetch, search, filter, and stream live updates
 * to the recovery cases list.
 */
export function useRecoveryCases(initialParams = {}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const paramsKey = JSON.stringify(initialParams);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = JSON.parse(paramsKey);
      const res = await recoveryApi.getCases(params);
      setCases(res.cases || res || []);
    } catch (err) {
      console.error('[useRecoveryCases] Failed to fetch cases:', err);
      setError(err.message || 'Failed to load recovery cases');
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Subscribe to real-time events for live list mutations
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (!event?.type) return;

      if (event.type === REALTIME_EVENT_TYPES.RECOVERY_CASE_CREATED) {
        const newCase = {
          id: event.caseId || `RC-${Date.now().toString().slice(-5)}`,
          customerId: 'cust_001',
          transactionId: event.data?.transactionId || `txn_demo_${Date.now()}`,
          amount: event.data?.amount ? event.data.amount / 100 : 25000,
          rootCause: event.data?.failureCode || 'BANK_TIMEOUT',
          riskScore: 88,
          recoveryProbability: 85,
          status: 'analyzing',
          strategy: 'Delayed Retry',
          createdAt: new Date().toISOString(),
          isLive: true,
        };

        setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
      }

      if (event.type === REALTIME_EVENT_TYPES.RECOVERY_CASE_UPDATED) {
        const { caseId, status, strategy } = event.data || {};
        if (caseId || event.caseId) {
          const targetId = caseId || event.caseId;
          setCases((prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    status: status || c.status,
                    strategy: strategy || c.strategy,
                  }
                : c
            )
          );
        }
      }

      if (event.type === REALTIME_EVENT_TYPES.RECOVERY_SUCCESS) {
        const targetId = event.caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: 'recovered' } : c))
          );
        }
      }

      if (event.type === REALTIME_EVENT_TYPES.RECOVERY_FAILED) {
        const targetId = event.caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: 'failed' } : c))
          );
        }
      }

      if (event.type === REALTIME_EVENT_TYPES.POLICY_BLOCKED) {
        const targetId = event.caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: 'stopped' } : c))
          );
        }
      }
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    cases,
    loading,
    error,
    refresh: fetchCases,
  };
}

/**
 * useRecoveryCaseDetails — Hook to fetch a single recovery case by ID
 */
export function useRecoveryCaseDetails(caseId) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const fetchDetails = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await recoveryApi.getCase(caseId);
      setCaseData(data);
    } catch (err) {
      console.error(`[useRecoveryCaseDetails] Failed to fetch ${caseId}:`, err);
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Real-time timeline & status updates
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (!event?.type || event.caseId !== caseId) return;

      setCaseData((prev) => {
        if (!prev) return prev;

        const updated = { ...prev };
        if (event.type === REALTIME_EVENT_TYPES.RECOVERY_SUCCESS) {
          updated.status = 'recovered';
        } else if (event.type === REALTIME_EVENT_TYPES.RECOVERY_FAILED) {
          updated.status = 'failed';
        } else if (event.type === REALTIME_EVENT_TYPES.POLICY_BLOCKED) {
          updated.status = 'stopped';
        }

        return updated;
      });
    });

    return unsubscribe;
  }, [caseId, subscribe]);

  return {
    caseData,
    loading,
    error,
    refresh: fetchDetails,
  };
}
