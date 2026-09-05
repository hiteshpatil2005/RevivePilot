import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach authenticated customer Bearer token if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('revivepilot_customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const userApi = {
  /**
   * Request 6-digit secure OTP for real customer email authentication.
   */
  async sendCustomerOtp(email, name = null) {
    const res = await client.post('/auth/customer/send-otp', {
      email: email.trim().toLowerCase(),
      name: name ? name.trim() : undefined,
    });
    return res.data;
  },

  /**
   * Verify 6-digit OTP and receive customer JWT token & unique payment instruments.
   */
  async verifyCustomerOtp(email, otp, name = null) {
    const res = await client.post('/auth/customer/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      name: name ? name.trim() : undefined,
    });
    return res.data;
  },

  /**
   * Retrieve active customer profile scoped strictly to JWT.
   */
  async getCustomerProfile() {
    const res = await client.get('/auth/customer/me');
    return res.data;
  },

  /**
   * Simulate payment across 25 failure taxonomy causes or SUCCESS.
   * Everything after the payment uses real backend PostgreSQL + Redis + Socket.IO!
   */
  async simulateCustomerPayment({ amount, method = 'UPI', scenario = 'BANK_TIMEOUT', itemName = null }) {
    const res = await client.post('/customer/payments/simulate', {
      amount: Number(amount) || 5000,
      method: method.toUpperCase(),
      scenario: scenario.toUpperCase(),
      item_name: itemName,
    });
    return res.data;
  },

  /**
   * Send context / response in customer recovery chat.
   */
  async sendCustomerRecoveryChat(caseId, { message, selectedOption }) {
    const res = await client.post(`/customer/recovery/${caseId}/chat`, {
      message: message || undefined,
      selected_option: selectedOption || undefined,
    });
    return res.data;
  },

  /**
   * Fetch customer recovery conversation history.
   */
  async getCustomerConversation(caseId) {
    const res = await client.get(`/customer/recovery/${caseId}/conversation`);
    return res.data;
  },

  /**
   * Customer confirms retry when ready to continue.
   * Executes verified settlement.
   */
  async retryRecovery(caseId) {
    const res = await client.post(`/customer/recovery/${caseId}/retry`);
    return res.data;
  },

  /**
   * Retrieve currently active recovery case for this customer.
   */
  async getActiveRecovery() {
    const res = await client.get('/customer/recovery/active/current');
    return res.data;
  },

  /**
   * Retrieve order history belonging strictly to this customer.
   */
  async getCustomerOrders() {
    const res = await client.get('/customer/orders');
    return res.data;
  },

  /**
   * Retrieve smart recovery link details by secure token.
   */
  async getRecoveryLinkDetails(token) {
    const res = await client.get(`/customer/recovery/link/${token}`);
    return res.data;
  },

  /**
   * Settle payment via smart recovery link.
   */
  async payRecoveryLink(token, method = 'UPI') {
    const res = await client.post(`/customer/recovery/link/${token}/pay`, { method });
    return res.data;
  },

  /**
   * Complete payment using an autonomous Razorpay Smart Recovery Link.
   */
  async settleRecoveryLink({ caseId, amount }) {
    if (caseId) {
      return await userApi.retryRecovery(caseId);
    }
    const res = await client.post('/webhooks/razorpay/simulate', null, {
      params: {
        event_type: 'payment.captured',
        amount: amount || 25000,
        case_id: caseId || undefined,
      },
    });
    return { success: true, message: 'Recovery payment settled!', data: res.data };
  },
};

export default client;
