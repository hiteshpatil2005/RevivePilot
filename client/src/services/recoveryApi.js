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
    try {
      const data = await withFallback(
        () => axiosInstance.get('/recovery/cases', { params }),
        () => ({ cases: MOCK_RECOVERY_CASES, total: MOCK_RECOVERY_CASES.length, page: 1, limit: 50 }),
        'recoveryApi.getCases'
      );
      if (!data) {
        return { cases: MOCK_RECOVERY_CASES, total: MOCK_RECOVERY_CASES.length, page: 1, limit: 50 };
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
      return { cases: MOCK_RECOVERY_CASES, total: MOCK_RECOVERY_CASES.length, page: 1, limit: 50 };
    } catch (err) {
      console.warn('[recoveryApi.getCases] Falling back to mock cases:', err);
      return { cases: MOCK_RECOVERY_CASES, total: MOCK_RECOVERY_CASES.length, page: 1, limit: 50 };
    }
  },

  /**
   * getCase(id)
   * Returns: full case object with customer, transaction, and case details
   */
  async getCase(id) {
    return withFallback(
      () => axiosInstance.get(`/recovery/cases/${id}`),
      async () => {
        // 1. Check MOCK_RECOVERY_CASES by id, paymentId, or transactionId
        let c = MOCK_RECOVERY_CASES.find(
          (r) =>
            r.id === id ||
            r.id?.toLowerCase() === String(id).toLowerCase() ||
            r.paymentId === id ||
            r.transactionId === id
        );

        // 2. Check MOCK_TRANSACTIONS if ID belongs to a transaction/payment
        if (!c) {
          const txn = MOCK_TRANSACTIONS.find(
            (t) =>
              t.id === id ||
              t.recoveryCase === id ||
              t.external_payment_id === id ||
              t.externalPaymentId === id
          );
          if (txn) {
            c = {
              id: txn.recoveryCase || `RC-${String(txn.id).replace(/^pay_/, '')}`,
              paymentId: txn.id,
              transactionId: txn.id,
              customerId: txn.customerId || 'cust_001',
              amount: txn.amount || 25000,
              currency: txn.currency || 'INR',
              riskScore: 84,
              rootCause: txn.failureReason || 'BANK_TIMEOUT',
              rootCauseConfidence: 92,
              rootCauseCategory: 'Temporary Gateway / Bank Failure',
              strategy: 'Alt Payment Link',
              strategyRecoveryProbability: 86,
              expectedRecovery: Math.round((txn.amount || 25000) * 0.86),
              status: txn.status === 'success' ? 'recovered' : 'action_required',
              priority: (txn.amount || 0) > 50000 ? 'critical' : 'high',
              policyPassed: true,
              policyChecks: [
                { label: 'Maximum retries', value: '1 / 3', passed: true },
                { label: 'Cooldown period', value: 'Passed', passed: true },
                { label: 'Amount limit', value: 'Passed', passed: true },
                { label: 'Customer flags', value: 'None', passed: true },
              ],
              attempts: 1,
              maxAttempts: 3,
              createdAt: txn.createdAt || new Date().toISOString(),
              timeline: [
                { step: 'detected', label: 'Revenue Risk Detected', detail: `Payment failure identified (${txn.failureReason || 'BANK_TIMEOUT'})`, ts: '10:00:02', status: 'done' },
                { step: 'detection', label: 'Detection Agent', detail: `${txn.failureReason || 'BANK_TIMEOUT'} pattern matched`, ts: '10:00:04', status: 'done' },
                { step: 'rootcause', label: 'Root Cause Agent', detail: `${txn.failureReason || 'BANK_TIMEOUT'} • Confidence 92%`, ts: '10:00:07', status: 'done' },
                { step: 'strategy', label: 'Strategy Agent', detail: 'Alt Payment Link • Probability 86%', ts: '10:00:10', status: 'done' },
                { step: 'policy', label: 'Policy Engine', detail: '4 / 4 checks passed', ts: '10:00:13', status: 'done' },
                { step: 'action', label: 'Recovery Action', detail: 'Razorpay alternative payment link dispatched', ts: '10:00:19', status: 'active' },
                { step: 'outcome', label: 'Awaiting Settlement', detail: 'Pending customer authorization', ts: null, status: 'pending' },
              ],
            };
          }
        }

        // 3. Fallback synthesis: generate a valid case for any requested ID
        if (!c) {
          const numDigits = String(id).replace(/\D/g, '');
          const synthesizedAmount = numDigits.length >= 4 ? parseInt(numDigits.slice(-4), 10) * 10 : 35000;
          c = {
            id: String(id).startsWith('RC-') ? id : `RC-${id}`,
            paymentId: String(id).startsWith('pay_') ? id : `pay_${id}`,
            transactionId: `txn_${id}`,
            customerId: 'cust_001',
            amount: synthesizedAmount || 35000,
            currency: 'INR',
            riskScore: 79,
            rootCause: 'BANK_TIMEOUT',
            rootCauseConfidence: 94,
            rootCauseCategory: 'Temporary Gateway / Bank Failure',
            strategy: 'Alt Payment Link',
            strategyRecoveryProbability: 89,
            expectedRecovery: Math.round((synthesizedAmount || 35000) * 0.89),
            status: 'action_required',
            priority: 'high',
            policyPassed: true,
            policyChecks: [
              { label: 'Maximum retries', value: '1 / 3', passed: true },
              { label: 'Cooldown period', value: 'Passed', passed: true },
              { label: 'Amount limit', value: 'Passed', passed: true },
              { label: 'Customer flags', value: 'None', passed: true },
            ],
            attempts: 1,
            maxAttempts: 3,
            createdAt: new Date().toISOString(),
            timeline: [
              { step: 'detected', label: 'Revenue Risk Detected', detail: 'Payment failure identified (BANK_TIMEOUT)', ts: '11:15:02', status: 'done' },
              { step: 'detection', label: 'Detection Agent', detail: 'BANK_TIMEOUT pattern matched', ts: '11:15:04', status: 'done' },
              { step: 'rootcause', label: 'Root Cause Agent', detail: 'BANK_TIMEOUT • Confidence 94%', ts: '11:15:07', status: 'done' },
              { step: 'strategy', label: 'Strategy Agent', detail: 'Alt Payment Link • Probability 89%', ts: '11:15:10', status: 'done' },
              { step: 'policy', label: 'Policy Engine', detail: '4 / 4 checks passed', ts: '11:15:13', status: 'done' },
              { step: 'action', label: 'Recovery Action', detail: 'Razorpay alternative smart link generated', ts: '11:15:19', status: 'active' },
              { step: 'outcome', label: 'Awaiting Settlement', detail: 'Pending customer authorization', ts: null, status: 'pending' },
            ],
          };
        }

        const customer =
          MOCK_CUSTOMERS.find((cu) => cu.id === c.customerId) || MOCK_CUSTOMERS[0];
        const transaction =
          MOCK_TRANSACTIONS.find(
            (t) => t.id === c.paymentId || t.id === c.transactionId
          ) || {
            id: c.paymentId,
            amount: c.amount,
            status: 'failed',
            method: 'CARD',
            failureReason: c.rootCause,
            createdAt: c.createdAt,
          };

        return {
          ...c,
          customer,
          transaction,
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

  /**
   * analyzeCase(id)
   * Runs the autonomous multi-agent pipeline on the case.
   */
  async analyzeCase(id) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/analyze`),
      { success: true, message: 'Multi-agent analysis completed (demo mode)', _isMock: true },
      `recoveryApi.analyzeCase(${id})`
    );
  },

  /**
   * executeCase(id)
   * Executes autonomous recovery action approved by policy.
   */
  async executeCase(id) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/execute`),
      { success: true, message: 'Recovery action executed (demo mode)', _isMock: true },
      `recoveryApi.executeCase(${id})`
    );
  },

  /**
   * generatePaymentLink(id)
   * Generates a smart alternative recovery link via Razorpay.
   */
  async generatePaymentLink(id) {
    return withFallback(
      () => axiosInstance.post(`/recovery/cases/${id}/payment-link`),
      {
        success: true,
        payment_link: `https://rzp.io/i/rec_${id?.slice(0, 8) || 'demo'}`,
        link_id: `plink_${id?.slice(0, 8) || 'demo'}`,
        _isMock: true,
      },
      `recoveryApi.generatePaymentLink(${id})`
    );
  },

  /**
   * simulateWebhook(params)
   * Simulates a cryptographically signed Razorpay webhook.
   */
  async simulateWebhook(params = {}) {
    return withFallback(
      () => axiosInstance.post('/webhooks/razorpay/simulate', null, { params }),
      { success: true, message: 'Simulated Razorpay webhook processed', _isMock: true },
      'recoveryApi.simulateWebhook'
    );
  },
};
