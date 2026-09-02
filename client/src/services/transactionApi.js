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
   * Returns: { transactions: [], total, pagination }
   */
  async getTransactions(params = {}) {
    return withFallback(
      async () => {
        const res = await axiosInstance.get('/transactions', { params });
        const items =
          res.data?.items ||
          res.data?.data?.items ||
          res.data?.transactions ||
          (Array.isArray(res.data) ? res.data : []);

        const total = res.data?.pagination?.total ?? res.data?.total ?? items.length;
        const pagination = res.data?.pagination || {
          page: params.page || 1,
          limit: params.limit || (items.length || 20),
          total: total,
          pages: Math.ceil(total / (params.limit || 20)) || 1,
        };
        return { transactions: items, total, pagination };
      },
      () => {
        const mockList = MOCK_TRANSACTIONS || [];
        return {
          transactions: mockList,
          total: mockList.length,
          pagination: { page: 1, limit: 20, total: mockList.length, pages: 1 },
        };
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
        const mockList = MOCK_TRANSACTIONS || [];
        const t = mockList.find(tx => tx.id === id || tx.external_payment_id === id);
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
