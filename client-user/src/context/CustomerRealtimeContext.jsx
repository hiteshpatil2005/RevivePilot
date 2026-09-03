import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { customerSocket } from '../services/socket';
import { useCustomerAuth } from './CustomerAuthContext';

const CustomerRealtimeContext = createContext(null);

export function CustomerRealtimeProvider({ children }) {
  const { markOrderRecovered } = useCustomerAuth();
  const [activeRecoveryNotice, setActiveRecoveryNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = customerSocket.subscribe((event) => {
      const type = event.event_type || event.type || '';
      const data = event.data || event || {};

      // 1. Recovery Case Updated / Strategy Selected -> Trigger Recovery Notification
      if (
        type.includes('CASE_UPDATED') ||
        type.includes('STRATEGY_SELECTED') ||
        type === 'recovery.action.completed' ||
        type === 'recovery.case.created'
      ) {
        const caseId = event.case_id || data.case_id || 'RC-Live';
        const notice = {
          id: `notif_${Date.now()}`,
          caseId,
          title: 'RevivePilot AI Recovery Assistance',
          channel: 'WhatsApp & SMS',
          message: `Your payment was not completed due to banking delay. A secure Razorpay 1-click recovery link has been activated for you.`,
          amount: data.amount || 35000,
          strategy: data.strategy || 'Smart Alternative Link',
          timestamp: new Date().toLocaleTimeString(),
          payLink: `/pay/${caseId}`,
        };

        setActiveRecoveryNotice(notice);
        setNotifications((prev) => [notice, ...prev]);
      }

      // 2. Recovery Success event -> Update order status to RECOVERED
      if (type.includes('RECOVERY_SUCCESS') || type === 'payment.recovered') {
        const caseId = event.case_id || data.caseId || data.case_id;
        if (caseId) {
          markOrderRecovered(caseId, data.recoveredAmount || data.recovered_amount || data.amount);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [markOrderRecovered]);

  const dismissNotice = useCallback(() => {
    setActiveRecoveryNotice(null);
  }, []);

  return (
    <CustomerRealtimeContext.Provider
      value={{
        activeRecoveryNotice,
        notifications,
        dismissNotice,
        setActiveRecoveryNotice,
      }}
    >
      {children}
    </CustomerRealtimeContext.Provider>
  );
}

export function useCustomerRealtime() {
  const ctx = useContext(CustomerRealtimeContext);
  if (!ctx) throw new Error('useCustomerRealtime must be used within CustomerRealtimeProvider');
  return ctx;
}
