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
      if (!event) return;
      const evType = (event.type || event.event_type || event.event || '').toLowerCase();

      if (evType === 'payment.failed' || evType === 'payment.created' || evType === 'payment.captured') {
        const data = event.data || {};
        const amount = Number(data.amount || 0);
        const cust = data.customer || {
          name: data.customer_name || data.customerName || 'Customer',
          email: data.customer_email || data.customerEmail || '',
        };
        const newTxn = {
          id: data.transaction_id || data.transactionId || data.id || `txn_${Date.now()}`,
          amount: amount >= 1000 ? amount / 100 : amount,
          currency: data.currency || 'INR',
          status: evType === 'payment.captured' ? 'success' : (data.status || 'failed'),
          paymentMethod: data.payment_method || data.paymentMethod || 'card',
          failureCode: data.failure_code || data.failureCode || (evType === 'payment.failed' ? 'PAYMENT_FAILED' : null),
          failureReason: data.failure_reason || data.failureReason || (evType === 'payment.failed' ? 'Transaction failed' : null),
          customer: cust,
          createdAt: data.created_at || data.createdAt || new Date().toISOString(),
          isLive: true,
        };
        setTransactions((prev) => {
          const filtered = prev.filter(t => t.id !== newTxn.id);
          return [newTxn, ...filtered];
        });
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
