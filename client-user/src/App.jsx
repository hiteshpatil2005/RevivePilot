import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { CustomerRealtimeProvider } from './context/CustomerRealtimeContext';
import Navbar from './components/layout/Navbar';
import Store from './pages/Store';
import Orders from './pages/Orders';
import CustomerProfile from './pages/CustomerProfile';
import RecoveryPay from './pages/RecoveryPay';
import RecoveryNotificationToast from './components/recovery/RecoveryNotificationToast';
import NewCustomerModal from './components/common/NewCustomerModal';

export default function App() {
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);

  return (
    <CustomerAuthProvider>
      <CustomerRealtimeProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col font-sans selection:bg-[#0078d4] selection:text-white">
            <Navbar onOpenNewCustomerModal={() => setNewCustomerModalOpen(true)} />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Store />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/profile" element={<CustomerProfile />} />
                <Route path="/pay/:caseId" element={<RecoveryPay />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p>
                  © 2026 Acme Cloud · Powered by{' '}
                  <strong className="text-slate-700">RevivePilot AI Recovery</strong> &amp;{' '}
                  <strong className="text-slate-700">Razorpay</strong>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="font-mono-code text-[#0078d4] font-medium">
                    Port 5174 (Customer Portal)
                  </span>
                  <span>•</span>
                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0078d4] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Merchant Cockpit (:5173)</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              </div>
            </footer>

            {/* Real-time Floating WhatsApp Recovery Alert */}
            <RecoveryNotificationToast />

            {/* New Customer Creation Modal */}
            <NewCustomerModal
              isOpen={newCustomerModalOpen}
              onClose={() => setNewCustomerModalOpen(false)}
            />
          </div>
        </BrowserRouter>
      </CustomerRealtimeProvider>
    </CustomerAuthProvider>
  );
}
