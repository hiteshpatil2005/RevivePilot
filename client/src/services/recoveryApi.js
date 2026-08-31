/**
 * recoveryApi.js — Recovery Cases API service
 *
 * Endpoints:
 *   GET  /api/recovery/cases
 *   GET  /api/recovery/cases/:id
 *   POST /api/recovery/cases/:id/retry
 *   POST /api/recovery/cases/:id/stop
 *   POST /api/recovery/cases/:id/escalate
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_RECOVERY_CASES, MOCK_CUSTOMERS, MOCK_TRANSACTIONS } from '../data/mockData';

export const recoveryApi = {
  /**
   * getCases(params)
   * Returns: { cases: [], total, page, limit }
   */
  async getCases(params = {}) {
    return withFallback(
      () => axiosInstance.get('/recovery/cases', { params }),
      { cases: MOCK_RECOVERY_CASES, total: MOCK_RECOVERY_CASES.length, page: 1, limit: 50 },
      'recoveryApi.getCases'
    );
  },

  /**
   * getCase(id)
   * Returns: full case object with customer, transaction, and case details
   */
  async getCase(id) {
    return withFallback(
      () => axiosInstance.get(`/recovery/cases/${id}`),
      async () => {
        const c = MOCK_RECOVERY_CASES.find(r => r.id === id);
        if (!c) {
          const err = new Error('Case not found');
          err.response = { status: 404 };
          throw err;
        }
        return {
          ...c,
          customer: MOCK_CUSTOMERS.find(cu => cu.id === c.customerId),
          transaction: MOCK_TRANSACTIONS.find(t => t.id === c.paymentId || t.id === c.transactionId),
        };
      },
      `recoveryApi.getCase(${id})`
    );
  },

  /**
   * retryCase(id, { reason })
   */
  async retryCase(id, data = {}) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/retry`, data),
      { success: true, message: 'Retry initiated (demo mode)', _isMock: true },
      `recoveryApi.retryCase(${id})`
    );
  },

  /**
   * stopCase(id, { reason })
   */
  async stopCase(id, data = {}) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/stop`, data),
      { success: true, message: 'Case stopped (demo mode)', _isMock: true },
      `recoveryApi.stopCase(${id})`
    );
  },

  /**
   * escalateCase(id, { reason })
   */
  async escalateCase(id, data = {}) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/escalate`, data),
      { success: true, message: 'Case escalated (demo mode)', _isMock: true },
      `recoveryApi.escalateCase(${id})`
    );
  },
};
