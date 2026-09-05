/**
 * recoveryApi.js — Recovery Cases API service (100% Real PostgreSQL Data)
 *
 * Endpoints:
 *   GET  /api/recovery/cases
 *   GET  /api/recovery/cases/:id
 *   POST /api/recovery/cases/:id/retry
 *   POST /api/recovery/cases/:id/stop
 *   POST /api/recovery/cases/:id/escalate
 *   POST /api/recovery/cases/:id/analyze
 *   POST /api/recovery/cases/:id/execute
 *   POST /api/recovery/cases/:id/payment-link
 *   POST /api/recovery/cases/:id/approve
 *   POST /api/recovery/cases/:id/reject
 *   POST /api/recovery/cases/:id/chat
 *   GET  /api/recovery/cases/:id/agent-executions
 *   POST /api/webhooks/razorpay/simulate
 */

import { axiosInstance } from './api';

export const recoveryApi = {
  /**
   * getCases(params)
   * Returns: { cases: [], total, page, limit }
   */
  async getCases(params = {}) {
    try {
      const res = await axiosInstance.get('/recovery/cases', { params });
      const data = res.data;
      if (!data) {
        return { cases: [], total: 0, page: 1, limit: 50 };
      }
      if (Array.isArray(data)) {
        return { cases: data, total: data.length, page: 1, limit: 50 };
      }
      if (data.cases) {
        return data;
      }
      if (data.items) {
        return { cases: data.items, total: data.total ?? data.items.length, page: 1, limit: 50 };
      }
      return { cases: [], total: 0, page: 1, limit: 50 };
    } catch (err) {
      console.error('[recoveryApi.getCases] Live fetch error:', err);
      return { cases: [], total: 0, page: 1, limit: 50 };
    }
  },

  /**
   * getCase(id)
   * Returns: full live case object with customer, transaction, and dynamic agent timeline
   */
  async getCase(id) {
    const res = await axiosInstance.get(`/recovery/cases/${id}`);
    return res.data;
  },

  /**
   * retryCase(id, { reason })
   * Manually trigger retry intervention on a case.
   */
  async retryCase(id, data = {}) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/retry`, data);
    return res.data;
  },

  /**
   * stopCase(id, { reason })
   * Halts autonomous recovery actions on a case.
   */
  async stopCase(id, data = {}) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/stop`, data);
    return res.data;
  },

  /**
   * escalateCase(id, { reason })
   * Escalates case to manual human review queue.
   */
  async escalateCase(id, data = {}) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/escalate`, data);
    return res.data;
  },

  /**
   * analyzeCase(id)
   * Runs the autonomous multi-agent pipeline on the case.
   */
  async analyzeCase(id) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/analyze`);
    return res.data;
  },

  /**
   * executeCase(id)
   * Executes autonomous recovery action approved by policy.
   */
  async executeCase(id) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/execute`);
    return res.data;
  },

  /**
   * generatePaymentLink(id)
   * Generates a secure, signed smart alternative recovery link.
   */
  async generatePaymentLink(id) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/payment-link`);
    return res.data;
  },

  /**
   * sendCustomerEmail(id)
   * Dispatches the 24-hour secure recovery link email directly to the customer.
   */
  async sendCustomerEmail(id) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/send-customer-email`);
    return res.data;
  },

  /**
   * approveStrategy(id, notes)
   * Merchant authorizes strategy recommendation.
   */
  async approveStrategy(id, notes = '') {
    const res = await axiosInstance.post(`/recovery/cases/${id}/approve`, { action: 'APPROVE', notes });
    return res.data;
  },

  /**
   * rejectStrategy(id, notes)
   * Merchant rejects strategy, triggering dynamic replanning.
   */
  async rejectStrategy(id, notes = '') {
    const res = await axiosInstance.post(`/recovery/cases/${id}/reject`, { action: 'REJECT', notes });
    return res.data;
  },

  /**
   * merchantChat(id, message)
   * Case-scoped merchant ↔ agent intelligence chat.
   */
  async merchantChat(id, message) {
    const res = await axiosInstance.post(`/recovery/cases/${id}/chat`, { message });
    return res.data;
  },

  /**
   * getAgentExecutions(id)
   * Fetches real agent execution logs for audit and transparency.
   */
  async getAgentExecutions(id) {
    const res = await axiosInstance.get(`/recovery/cases/${id}/agent-executions`);
    return res.data;
  },

  /**
   * simulateWebhook(params)
   * Simulates a cryptographically signed Razorpay webhook.
   */
  async simulateWebhook(params = {}) {
    const res = await axiosInstance.post('/webhooks/razorpay/simulate', null, { params });
    return res.data;
  },
};
