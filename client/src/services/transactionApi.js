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
      () => axiosInstance.get('/transactions', { params }),
      { transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length },
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
