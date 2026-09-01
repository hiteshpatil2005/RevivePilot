/**
 * transactionApi.js — Transactions API service
 *
 * Endpoints:
 *   GET /api/transactions
 *   GET /api/transactions/:id
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_TRANSACTIONS } from '../data/mockData';

export const transactionApi = {
  /**
   * getTransactions(params)
   * Returns: { transactions: [], total }
   */
  async getTransactions(params = {}) {
    return withFallback(
      async () => {
        const res = await axiosInstance.get('/transactions', { params });
        const items = res.data?.items || res.data?.transactions || (Array.isArray(res.data) ? res.data : []);
        const pagination = res.data?.pagination || {
          page: params.page || 1,
          limit: params.limit || items.length,
          total: items.length,
          pages: 1,
        };
        return { transactions: items, total: pagination.total, pagination };
      },
      {
        transactions: MOCK_TRANSACTIONS,
        total: MOCK_TRANSACTIONS.length,
        pagination: { page: 1, limit: 20, total: MOCK_TRANSACTIONS.length, pages: 1 },
      },
      'transactionApi.getTransactions'
    );
  },

  /**
   * getTransaction(id)
   */
  async getTransaction(id) {
    return withFallback(
      () => axiosInstance.get(`/transactions/${id}`),
      async () => {
        const t = MOCK_TRANSACTIONS.find(tx => tx.id === id);
        if (!t) {
          const err = new Error('Transaction not found');
          err.response = { status: 404 };
          throw err;
        }
        return t;
      },
      `transactionApi.getTransaction(${id})`
    );
  },
};
