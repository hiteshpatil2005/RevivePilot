import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle2, QrCode, CreditCard, ArrowRight,
  Lock, Loader2, Sparkles, AlertCircle, ExternalLink, RefreshCw, Clock
} from 'lucide-react';
import { userApi } from '../services/api';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function RecoveryPay() {
  const { caseId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { currentCustomer, markOrderRecovered, deductBalance, setCustomerBalance } = useCustomerAuth();

  const [linkData, setLinkData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(!!token);
  const [errorDetails, setErrorDetails] = useState(null);

  const [method, setMethod] = useState('upi');
  const [vpa, setVpa] = useState(currentCustomer?.upiVpa || currentCustomer?.upi_vpa || 'user.9281@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recoveredAmount, setRecoveredAmount] = useState(0);

  useEffect(() => {
    if (token) {
      setLoadingDetails(true);
      userApi.getRecoveryLinkDetails(token)
        .then((data) => {
          setLinkData(data);
          setErrorDetails(null);
        })
        .catch((err) => {
          setErrorDetails(err.response?.data?.detail || 'This recovery link is invalid or has expired.');
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [token]);

  const effectiveAmount = linkData?.amount || 35000;
  const merchantName = linkData?.merchant_name || 'Acme Cloud Corporation';
  const effectiveCaseId = linkData?.case_id || caseId || 'RC-10291';

  const handleSettle = async () => {
    setIsProcessing(true);
    try {
      if (token) {
        const res = await userApi.payRecoveryLink(token, method.toUpperCase());
        const amt = res.recovered_amount || effectiveAmount;
        setRecoveredAmount(amt);
        if (deductBalance) deductBalance(amt);
        markOrderRecovered(effectiveCaseId, amt);
        setSuccess(true);
      } else {
        const res = await userApi.settleRecoveryLink({
          caseId: effectiveCaseId,
          amount: effectiveAmount,
        });
        const amt = effectiveAmount;
        setRecoveredAmount(amt);
        if (deductBalance) deductBalance(amt);
        markOrderRecovered(effectiveCaseId, amt);
        setSuccess(true);
      }
    } catch (err) {
      console.error('Settlement error:', err);
      alert(err.response?.data?.detail || 'Payment settlement failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingDetails) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
        <Loader2 size={32} className="animate-spin text-[#0078d4] mx-auto" />
        <p className="text-xs text-slate-600 font-medium">Validating secure recovery token with merchant gateway...</p>
      </div>
    );
  }

  if (errorDetails) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-xs max-w-md mx-auto space-y-3">
          <AlertCircle size={36} className="text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Recovery Link Unavailable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorDetails}</p>
          <div className="pt-2">
            <Link to="/orders" className="btn-azure text-xs inline-flex items-center gap-1.5">
              <span>View Your Invoices</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-5 animate-fade-in text-slate-900">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0078d4] text-xs font-semibold border border-blue-200">
          <ShieldCheck size={13} />
          <span>Signed Smart Recovery Checkout</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Complete Payment</h1>
        <p className="text-xs text-slate-500">
          Recovery Case Reference: <span className="font-mono-code font-bold text-slate-800">{String(effectiveCaseId).slice(0, 12)}</span>
        </p>
      </div>

      <div className="azure-card p-6 space-y-5 shadow-sm bg-white border border-slate-200 rounded-xl">
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={34} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Payment Successfully Recovered!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                ₹{Number(recoveredAmount || effectiveAmount).toLocaleString('en-IN')}.00 was settled via the approved recovery rail. The merchant database has verified this capture as <span className="font-mono-code font-bold text-emerald-700">RECOVERED</span>.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-center gap-2.5">
              <Link to="/orders" className="btn-azure text-xs">
                View Invoices &amp; Status
              </Link>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="btn-azure-secondary text-xs flex items-center gap-1"
              >
                <span>Merchant Cockpit (:3000)</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Summary */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{merchantName}</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">High-Performance Cloud Infrastructure</p>
                {linkData?.customer_name && (
                  <p className="text-[11px] text-slate-500 mt-0.5">Customer: {linkData.customer_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Due</p>
                <p className="text-2xl font-bold text-slate-900 font-mono-code">
                  ₹{Number(effectiveAmount).toLocaleString('en-IN')}.00
                </p>
              </div>
            </div>

            {/* Secure Link Timespan Notice */}
            {linkData?.expires_at && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-700" />
                  <span>Secure 24h Timespan: Closes on {new Date(linkData.expires_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
                  Time-Limited
                </span>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Choose Recovery Payment Rail
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'border-[#0078d4] bg-blue-50/70 shadow-2xs ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-[#0078d4]" />
                    <span className="font-bold text-slate-800">UPI Instant</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Zero fee · Instant CBS clearance</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('cards')}
                  className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    method === 'cards'
                      ? 'border-[#0078d4] bg-blue-50/70 shadow-2xs ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-[#0078d4]" />
                    <span className="font-bold text-slate-800">Alternative Card</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Direct tokenized card retry</p>
                </button>
              </div>

              {method === 'upi' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">UPI VPA</label>
                  <input
                    type="text"
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code focus:outline-hidden focus:border-[#0078d4]"
                  />
                </div>
              )}
            </div>

            {/* Settle CTA */}
            <button
              type="button"
              onClick={handleSettle}
              disabled={isProcessing}
              className="w-full btn-azure py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Settling Recovery Payment...</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Authorize &amp; Settle ₹{Number(effectiveAmount).toLocaleString('en-IN')}.00</span>
                </>
              )}
            </button>

            {/* Security Guarantee */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Cryptographically signed single-use recovery session</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
