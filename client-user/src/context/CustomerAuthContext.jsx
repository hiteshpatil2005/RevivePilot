import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';
import { customerSocket } from '../services/socket';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('revivepilot_customer_token') || null;
  });

  const [currentCustomer, setCurrentCustomer] = useState(() => {
    const saved = localStorage.getItem('revivepilot_active_customer');
    return saved ? JSON.parse(saved) : null;
  });

  const [orders, setOrders] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync token to localStorage and Socket.IO
  useEffect(() => {
    if (token) {
      localStorage.setItem('revivepilot_customer_token', token);
      customerSocket.connect(token);
    } else {
      localStorage.removeItem('revivepilot_customer_token');
      customerSocket.disconnect();
    }
  }, [token]);

  // Sync currentCustomer to localStorage
  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem('revivepilot_active_customer', JSON.stringify(currentCustomer));
    } else {
      localStorage.removeItem('revivepilot_active_customer');
    }
  }, [currentCustomer]);

  // Fetch initial profile and orders on mount if token exists
  useEffect(() => {
    async function initSession() {
      if (token) {
        try {
          const profile = await userApi.getCustomerProfile();
          setCurrentCustomer(profile);
          const orderData = await userApi.getCustomerOrders();
          setOrders(orderData.orders || []);
        } catch (err) {
          console.warn('[CustomerAuth] Session expired or invalid, logging out:', err);
          setToken(null);
          setCurrentCustomer(null);
        }
      }
      setLoading(false);
    }
    initSession();
  }, [token]);

  // Refresh customer orders
  const refreshOrders = useCallback(async () => {
    const activeToken = token || localStorage.getItem('revivepilot_customer_token');
    if (activeToken) {
      try {
        const orderData = await userApi.getCustomerOrders();
        setOrders(orderData.orders || []);
      } catch (err) {
        console.warn('[CustomerAuth] Failed to refresh orders:', err);
      }
    }
  }, [token]);

  // Sync real-time balance updates from Socket.IO
  useEffect(() => {
    const unsub = customerSocket.on('customer.balance.updated', (data) => {
      if (data?.balance !== undefined) {
        setCustomerBalance(data.balance);
      }
    });
    return () => unsub();
  }, []);

  /**
   * Request 6-digit secure OTP for real email.
   */
  const sendOtp = async (email, name = null) => {
    return await userApi.sendCustomerOtp(email, name);
  };

  /**
   * Deduct balance in frontend state and localStorage immediately
   */
  const deductBalance = (amount) => {
    setCurrentCustomer((prev) => {
      if (!prev) return prev;
      const currentBal = Number(prev.balance !== undefined ? prev.balance : 150000);
      const newBal = Math.max(0, currentBal - Number(amount));
      const updated = { ...prev, balance: newBal };
      localStorage.setItem('revivepilot_active_customer', JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Set balance to specific amount in frontend state and localStorage
   */
  const setCustomerBalance = (newBal) => {
    setCurrentCustomer((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, balance: Number(newBal) };
      localStorage.setItem('revivepilot_active_customer', JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Verify 6-digit OTP, receive token and activate session.
   * Immediately loads customer orders from database.
   */
  const verifyOtp = async (email, otp, name = null) => {
    const res = await userApi.verifyCustomerOtp(email, otp, name);
    if (res.token && res.customer) {
      localStorage.setItem('revivepilot_customer_token', res.token);
      localStorage.setItem('revivepilot_active_customer', JSON.stringify(res.customer));
      setToken(res.token);
      setCurrentCustomer(res.customer);
      customerSocket.connect(res.token);
      try {
        const orderData = await userApi.getCustomerOrders();
        setOrders(orderData.orders || []);
      } catch (err) {
        console.warn('[CustomerAuth] Failed to fetch orders on login:', err);
      }
    }
    return res;
  };

  /**
   * Secure Logout: clear session token and disconnect socket.
   */
  const logoutCustomer = () => {
    setToken(null);
    setCurrentCustomer(null);
    setOrders([]);
    localStorage.removeItem('revivepilot_customer_token');
    localStorage.removeItem('revivepilot_active_customer');
    customerSocket.disconnect();
  };

  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const markOrderRecovered = (orderId, amount) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId || o.caseId === orderId || o.payment_id === orderId
          ? { ...o, status: 'RECOVERED', recovered_amount: amount, recoveredAt: new Date().toISOString() }
          : o
      )
    );
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        token,
        currentCustomer,
        isAuthenticated: !!token && !!currentCustomer,
        orders,
        loading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        sendOtp,
        verifyOtp,
        logoutCustomer,
        refreshOrders,
        deductBalance,
        setCustomerBalance,
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
