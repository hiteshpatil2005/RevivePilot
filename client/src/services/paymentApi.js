/**
 * paymentApi.js — Test Payment API service
 *
 * IMPORTANT: This only calls the FastAPI backend, which owns all Razorpay credentials.
 * The browser NEVER touches Razorpay keys directly.
 *
 * Endpoints:
 *   POST /api/payments/test       — create a test payment
 *   GET  /api/payments/scenarios  — get available test scenarios
 */

import { axiosInstance, withFallback } from './api';

const IS_DEV = import.meta.env.VITE_APP_ENV !== 'production';

/**
 * TEST_SCENARIOS — controlled failure/success modes.
 * The backend payment adapter maps these to Razorpay test card IDs.
 */
export const TEST_SCENARIOS = [
  { id: 'SUCCESS',            label: 'Successful Payment',    description: 'Payment completes successfully' },
  { id: 'BANK_TIMEOUT',       label: 'Bank Timeout',          description: 'Bank gateway timeout — most common failure' },
  { id: 'CARD_DECLINED',      label: 'Card Declined',         description: 'Card declined by issuing bank' },
  { id: 'INSUFFICIENT_FUNDS', label: 'Insufficient Funds',    description: 'Account balance insufficient' },
  { id: 'NETWORK_ERROR',      label: 'Network Error',         description: 'Payment network connectivity failure' },
  { id: 'MANDATE_FAILED',     label: 'Mandate Failed',        description: 'Auto-debit mandate execution failed' },
];

export const paymentApi = {
  /**
   * getScenarios()
   * Returns: array of available test scenarios
   */
  async getScenarios() {
    return withFallback(
      () => axiosInstance.get('/payments/scenarios'),
      TEST_SCENARIOS,
      'paymentApi.getScenarios'
    );
  },

  /**
   * createTestPayment({ customerId, amount, scenario, currency })
   * Returns: { paymentId, caseId, status, message }
   *
   * SECURITY: No Razorpay keys are passed from the frontend.
   * The backend creates the order using its own credentials.
   */
  async createTestPayment({ customerId, amount, scenario, currency = 'INR', description }) {
    return withFallback(
      () => axiosInstance.post('/payments/test', {
        customerId,
        amount,
        scenario,
        currency,
        description,
        source: 'merchant_dashboard',
      }),
      async () => {
        // Demo mode: simulate the full pipeline
        await new Promise(r => setTimeout(r, 1200));
        const caseId = `RC-1${Math.floor(Math.random() * 900) + 100}`;
        const isSuccess = scenario === 'SUCCESS';
        return {
          _isMock: true,
          paymentId: `pay_demo_${Date.now()}`,
          caseId,
          scenario,
          amount,
          currency,
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          message: isSuccess
            ? `Test payment of ₹${(amount / 100).toLocaleString('en-IN')} completed successfully`
            : `Test payment failed — scenario: ${scenario}. Recovery case ${caseId} created.`,
          recoveryTriggered: !isSuccess,
          note: 'Demo mode — no real payment processed',
        };
      },
      'paymentApi.createTestPayment'
    );
  },
};
