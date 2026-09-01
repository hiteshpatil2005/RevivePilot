import api, { withFallback } from './api';
import { MOCK_CUSTOMERS } from '../data/mockData';

export const customerApi = {
  getCustomers: (params = {}) =>
    withFallback(
      () => api.get('/customers', { params }),
      () => {
        let items = [...MOCK_CUSTOMERS];
        if (params.search) {
          const s = params.search.toLowerCase();
          items = items.filter(
            c =>
              c.name?.toLowerCase().includes(s) ||
              c.email?.toLowerCase().includes(s) ||
              c.phone?.includes(s)
          );
        }
        return {
          customers: items,
          total: items.length,
          page: params.page || 1,
          limit: params.limit || 20,
        };
      }
    ),

  getCustomer: (id) =>
    withFallback(
      () => api.get(`/customers/${id}`),
      () => MOCK_CUSTOMERS.find(c => c.id === id) || null
    ),
};
