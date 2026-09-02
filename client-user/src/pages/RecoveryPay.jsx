import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle2, QrCode, CreditCard, ArrowRight,
  Lock, Loader2, Sparkles, AlertCircle, ExternalLink
} from 'lucide-react';
import { userApi } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function RecoveryPay() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { currentCustomer, markOrderRecovered } = useCustomerAuth();

  const [method, setMethod] = useState('upi');
  const [vpa, setVpa] = useState(currentCustomer?.upiId || 'rahul.s@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const amount = 35000; // Standard demo case amount

  const handleSettle = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      await userApi.settleRecoveryLink({
        caseId: caseId || 'RC-10291',
        amount,
        paymentMethod: method.toUpperCase(),
      });

      markOrderRecovered(caseId || 'RC-10291', amount);
      setSuccess(true);
    } catch (err) {
      console.error('Settlement error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0078d4] text-xs font-semibold border border-blue-200">
          <ShieldCheck size={13} />
          <span>Razorpay Smart Alternative Recovery Link</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Complete Payment</h1>
        <p className="text-xs text-slate-500">
          Recovery Case Reference: <span className="font-mono-code font-bold text-slate-800">{caseId || 'RC-10291'}</span>
        </p>
      </div>

      <div className="azure-card p-6 space-y-5 shadow-sm">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Payment Successfully Recovered!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                ₹{amount.toLocaleString('en-IN')} was settled via Razorpay Alternative Priority Rail. RevivePilot Merchant Cockpit on <strong className="font-semibold text-slate-900">Port 5173</strong> has marked this case as <span className="font-mono-code font-bold text-emerald-700">RECOVERED</span>.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-center gap-2.5">
              <Link to="/orders" className="btn-azure text-xs">
                View Invoices &amp; Status
              </Link>
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noreferrer"
                className="btn-azure-secondary text-xs"
              >
                <span>Check Merchant Cockpit (:5173)</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Summary */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Acme Cloud Corporation</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">High-Performance Cloud Infrastructure</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Due</p>
                <p className="text-2xl font-bold text-slate-900 font-mono-code">
                  ₹{amount.toLocaleString('en-IN')}.00
                </p>
              </div>
            </div>

            {/* Smart Channel Notification */}
            <div className="p-3 bg-[#eff6fc] rounded border border-[#c7e0f4] text-xs text-[#004578] space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#0078d4]" />
                Automated Priority Fallback Rail
              </span>
              <p className="text-[11px] leading-relaxed">
                Previous transaction timed out at the issuing bank. This secure link routes your checkout through an active high-speed channel with zero re-entry required.
              </p>
            </div>

            {/* Method Tabs */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Select Alternative Payment Rail
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`p-3 rounded border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'border-[#0078d4] bg-blue-50/70 text-[#0078d4]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode size={20} />
                  <span>Instant UPI Intent / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`p-3 rounded border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    method === 'card'
                      ? 'border-[#0078d4] bg-blue-50/70 text-[#0078d4]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard size={20} />
                  <span>Debit / Credit Card</span>
                </button>
              </div>

              {method === 'upi' ? (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 block">UPI Handle (VPA)</label>
                  <input
                    type="text"
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code"
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-800">HDFC Bank Visa •••• 4242</span>
                  <span className="text-slate-500 font-mono-code">Exp 12/28</span>
                </div>
              )}
            </div>

            {/* Authorize Button */}
            <button
              type="button"
              onClick={handleSettle}
              disabled={isProcessing}
              className="w-full btn-azure py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Settling Recovery Payment...</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>Authorize &amp; Settle ₹{amount.toLocaleString('en-IN')}.00</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                Verified HMAC Webhook Ingestion
              </span>
              <span>PCI-DSS Compliant</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
