import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userApi = {
  /**
   * Process a customer payment through RevivePilot / Razorpay test engine.
   */
  async processPayment({ customer, item, scenario, paymentMethod, failureReason }) {
    try {
      if (scenario === 'NORMAL') {
        // Successful payment -> captured event
        const res = await client.post('/webhooks/razorpay/simulate', null, {
          params: {
            event_type: 'payment.captured',
            amount: item.amount,
          },
        });
        return {
          success: true,
          status: 'SUCCESS',
          paymentId: `pay_${Date.now().toString().slice(-8)}`,
          orderId: `order_${Date.now().toString().slice(-8)}`,
          amount: item.amount,
          backendResponse: res.data,
        };
      } else {
        // Simulated failure -> emits payment.failed to trigger real-time AI recovery!
        const res = await client.post('/webhooks/razorpay/simulate', null, {
          params: {
            event_type: 'payment.failed',
            amount: item.amount,
            failure_reason: failureReason || scenario,
          },
        });
        return {
          success: false,
          status: 'FAILED',
          failureReason: failureReason || scenario,
          amount: item.amount,
          backendResponse: res.data,
        };
      }
    } catch (err) {
      console.warn('[userApi] Backend simulated fallback:', err.message);
      return {
        success: scenario === 'NORMAL',
        status: scenario === 'NORMAL' ? 'SUCCESS' : 'FAILED',
        failureReason: scenario,
        amount: item.amount,
        _offline: true,
      };
    }
  },

  /**
   * Complete payment using an autonomous Razorpay Smart Recovery Link.
   */
  async settleRecoveryLink({ caseId, amount, paymentMethod }) {
    try {
      const res = await client.post('/webhooks/razorpay/simulate', null, {
        params: {
          event_type: 'payment.captured',
          amount: amount || 25000,
          case_id: caseId || undefined,
        },
      });
      return { success: true, message: 'Recovery payment settled!', data: res.data };
    } catch (err) {
      console.warn('[userApi] Settle fallback:', err.message);
      return { success: true, message: 'Simulated recovery payment settled (demo mode)' };
    }
  },
};

export default client;
