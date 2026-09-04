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
      const caseList = res?.cases || (Array.isArray(res) ? res : []);
      setCases(caseList);
    } catch (err) {
      console.error('[useRecoveryCases] Failed to fetch cases:', err);
      setError(err.message || 'Failed to load recovery cases');
      setCases([]);
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
      if (!event) return;
      const evType = (event.type || event.event_type || event.event || '').toLowerCase();
      const data = event.data || {};
      const caseId = data.case_id || data.caseId || event.caseId || event.id;

      if (
        evType.includes('case.created') ||
        evType.includes('recovery_case_created') ||
        evType === 'payment.failed'
      ) {
        const amt = Number(data.amount || data.expected_recovery_amount || 0);
        const newCase = {
          id: caseId || `RC-${Date.now().toString().slice(-5)}`,
          customerId: data.customer_id || data.customerId || null,
          customer: data.customer || {
            name: data.customer_name || data.customerName || 'Customer',
            email: data.customer_email || data.customerEmail || '',
          },
          transactionId: data.transaction_id || data.transactionId || null,
          amount: amt >= 1000 ? amt / 100 : amt,
          expected_recovery_amount: amt >= 1000 ? amt / 100 : amt,
          rootCause: data.failure_code || data.failureCode || data.failure_reason || 'BANK_TIMEOUT',
          riskScore: data.risk_score ?? data.riskScore ?? 80,
          recoveryProbability: data.recovery_probability ?? data.recoveryProbability ?? 75,
          status: data.status || 'detected',
          strategy: data.strategy || data.recommended_strategy || 'Smart Routing',
          createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          isLive: true,
        };

        setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
      }

      if (evType.includes('case.updated') || evType.includes('recovery_case_updated')) {
        const targetId = caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    status: data.status || c.status,
                    strategy: data.strategy || c.strategy,
                  }
                : c
            )
          );
        }
      }

      if (
        evType.includes('success') ||
        evType.includes('captured') ||
        evType.includes('resolved') ||
        evType.includes('recovery_success')
      ) {
        const targetId = caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: 'recovered' } : c))
          );
        }
      }

      if (evType.includes('recovery_failed') || evType.includes('case.failed')) {
        const targetId = caseId;
        if (targetId) {
          setCases((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: 'failed' } : c))
          );
        }
      }

      if (evType.includes('policy_blocked') || evType.includes('case.stopped')) {
        const targetId = caseId;
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
