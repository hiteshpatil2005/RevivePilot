import api, { withFallback } from './api';

export const merchantApi = {
  getProfile: () =>
    withFallback(
      () => api.get('/merchants/me'),
      () => ({
        id: 'merchant_demo',
        name: 'Acme Corporation',
        businessName: 'Acme Corporation',
        business_name: 'Acme Corporation',
        email: 'admin@acme.com',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
      })
    ),

  updateProfile: (data) =>
    withFallback(
      () => api.put('/merchants/me', data),
      () => ({ success: true, ...data })
    ),
};
