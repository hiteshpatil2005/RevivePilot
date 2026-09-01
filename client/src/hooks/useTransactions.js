import { useState, useEffect, useCallback, useRef } from 'react';
import { transactionApi } from '../services/transactionApi';
import { useRealtimeContext } from '../context/RealtimeContext';
import { REALTIME_EVENT_TYPES } from '../data/mockData';

export function useTransactions(params = {}) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useRealtimeContext();

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await transactionApi.getTransactions(paramsRef.current);
      const list = res.transactions || (Array.isArray(res) ? res : []);
      setTransactions(list);
      if (res.pagination) {
        setPagination(res.pagination);
      } else {
        setPagination({
          page: paramsRef.current.page || 1,
          limit: paramsRef.current.limit || list.length,
          total: res.total || list.length,
          pages: Math.ceil((res.total || list.length) / (paramsRef.current.limit || 20)) || 1,
        });
      }
    } catch (err) {
      console.error('[useTransactions] Failed to fetch transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.status,
    params.search,
    params.dateFrom,
    params.dateTo,
  ]);

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
    pagination,
    total: pagination.total,
    loading,
    error,
    refresh: fetchTransactions,
  };
}
