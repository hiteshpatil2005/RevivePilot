import { useState, useEffect, useCallback } from 'react';
import { transactionApi } from '../services/transactionApi';
import { useRealtimeContext } from '../context/RealtimeContext';
import { REALTIME_EVENT_TYPES } from '../data/mockData';

export function useTransactions(initialParams = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transactionApi.getTransactions(initialParams);
      setTransactions(res.transactions || res || []);
    } catch (err) {
      console.error('[useTransactions] Failed to fetch transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Listen to new transactions or failed payments created live
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (!event?.type) return;

      if (event.type === REALTIME_EVENT_TYPES.PAYMENT_FAILED) {
        const newTxn = {
          id: event.data?.transactionId || `txn_demo_${Date.now()}`,
          amount: event.data?.amount ? event.data.amount / 100 : 25000,
          currency: 'INR',
          status: 'failed',
          paymentMethod: 'card',
          failureCode: event.data?.failureCode || 'BANK_TIMEOUT',
          failureReason: 'Payment gateway bank timeout',
          customer: { name: 'Rahul Sharma', email: 'rahul.sharma@example.com' },
          createdAt: new Date().toISOString(),
          isLive: true,
        };
        setTransactions((prev) => [newTxn, ...prev]);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
  };
}
