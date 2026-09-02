import { createContext, useContext, useState, useEffect } from 'react';
import { PRESET_CUSTOMERS } from '../data/mockUserData';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('revivepilot_customers');
    return saved ? JSON.parse(saved) : PRESET_CUSTOMERS;
  });

  const [currentCustomer, setCurrentCustomer] = useState(() => {
    const saved = localStorage.getItem('revivepilot_active_customer');
    return saved ? JSON.parse(saved) : PRESET_CUSTOMERS[0];
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('revivepilot_user_orders');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'ord_demo_9821',
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            itemName: 'AI Model Inference Cluster',
            amount: 35000,
            status: 'FAILED',
            failureReason: 'BANK_TIMEOUT',
            paymentMethod: 'UPI',
            caseId: 'RC-10291',
            hasRecoveryLink: true,
            recoveryLink: 'https://rzp.io/i/rec_rc10291',
          },
          {
            id: 'ord_demo_9819',
            date: new Date(Date.now() - 86400000).toISOString(),
            itemName: 'Instant UPI Verification Pack',
            amount: 5000,
            status: 'PAID',
            paymentMethod: 'Card (Visa •••• 4242)',
          },
        ];
  });

  useEffect(() => {
    localStorage.setItem('revivepilot_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('revivepilot_active_customer', JSON.stringify(currentCustomer));
  }, [currentCustomer]);

  useEffect(() => {
    localStorage.setItem('revivepilot_user_orders', JSON.stringify(orders));
  }, [orders]);

  const switchCustomer = (customerId) => {
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCurrentCustomer(found);
    }
  };

  const registerCustomer = ({ name, email, phone, tier }) => {
    const newCust = {
      id: `cust_${Date.now().toString().slice(-4)}`,
      name,
      email,
      phone: phone || '+91 98765 00000',
      tier: tier || 'Standard',
      balance: 50000,
      upiId: `${name.toLowerCase().replace(/\s+/g, '.')}@okaxis`,
      savedCards: [{ id: `c_${Date.now()}`, last4: '4242', brand: 'Visa', exp: '12/29', bank: 'HDFC Bank' }],
    };
    setCustomers((prev) => [newCust, ...prev]);
    setCurrentCustomer(newCust);
    return newCust;
  };

  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const markOrderRecovered = (orderId, recoveredAmount) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId || o.caseId === orderId
          ? { ...o, status: 'RECOVERED', recoveredAt: new Date().toISOString() }
          : o
      )
    );
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customers,
        currentCustomer,
        orders,
        switchCustomer,
        registerCustomer,
        addOrder,
        markOrderRecovered,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be inside CustomerAuthProvider');
  return ctx;
}
