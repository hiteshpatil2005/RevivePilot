import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, QrCode, ShieldCheck, Check, Plus, ArrowRight } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function CustomerProfile() {
  const { currentCustomer } = useCustomerAuth();
  const [balance, setBalance] = useState(currentCustomer.balance);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  const handleTopUp = (amount) => {
    setBalance((b) => b + amount);
    setTopUpSuccess(true);
    setTimeout(() => setTopUpSuccess(false), 2000);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1">
          <Link to="/" className="hover:text-[#0078d4] text-slate-600">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Billing</span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Payment Methods &amp; Balance</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payment Methods</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage saved cards, UPI IDs, and test funds for {currentCustomer.name}.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Account Summary Banner */}
        <div className="azure-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded bg-[#0078d4] text-white flex items-center justify-center font-bold text-sm">
              {currentCustomer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{currentCustomer.name}</h3>
                <span className="text-[10px] font-semibold bg-blue-50 text-[#0078d4] px-2 py-0.5 rounded border border-blue-200">
                  {currentCustomer.tier} Tier
                </span>
              </div>
              <p className="text-xs text-slate-500">{currentCustomer.email} · {currentCustomer.phone}</p>
            </div>
          </div>

          {/* Simulated Bank Balance */}
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Simulated Account Balance</p>
            <p className="text-xl font-bold text-slate-900 font-mono-code">
              ₹{balance.toLocaleString('en-IN')}.00
            </p>
            <div className="flex items-center sm:justify-end gap-1.5 mt-1.5">
              <span className="text-[11px] text-slate-500">Quick Test Credit:</span>
              {[25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleTopUp(amt)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded border border-slate-200 cursor-pointer"
                >
                  +₹{amt / 1000}k
                </button>
              ))}
            </div>
            {topUpSuccess && (
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center sm:justify-end gap-1 mt-1">
                <Check size={12} /> Balance updated!
              </p>
            )}
          </div>
        </div>

        {/* Saved Cards & UPI Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cards */}
          <div className="azure-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={15} className="text-[#0078d4]" />
                Saved Corporate &amp; Debit Cards
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Tokenized
              </span>
            </div>

            <div className="space-y-2">
              {currentCustomer.savedCards?.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{c.bank} {c.brand} •••• {c.last4}</p>
                    <p className="text-[11px] text-slate-500 font-mono-code mt-0.5">Expires {c.exp}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Default</span>
                </div>
              ))}
            </div>
          </div>

          {/* UPI */}
          <div className="azure-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode size={15} className="text-emerald-600" />
                UPI Handles &amp; AutoPay
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Active
              </span>
            </div>

            <div className="p-3 rounded border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono-code font-semibold text-slate-900">{currentCustomer.upiId}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Verified Rail</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Primary payment rail for instant 1-click alternative recovery links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
