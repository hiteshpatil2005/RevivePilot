import { useState, useEffect, useMemo } from 'react';
import {
  X, CreditCard, QrCode, Building2, ShieldCheck, CheckCircle2,
  AlertTriangle, Clock, XCircle, ArrowRight, Loader2, Smartphone,
  Info, ChevronDown, ChevronUp, Lock, RefreshCw, Zap, Search
} from 'lucide-react';
import { PAYMENT_SCENARIOS, FAILURE_CATEGORIES } from '../../data/mockUserData';
import { userApi } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function RazorpayModal({ item, isOpen, onClose, onSuccess, onFailure }) {
  const { currentCustomer, addOrder } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState('upi');
  const [selectedScenario, setSelectedScenario] = useState('INSUFFICIENT_FUNDS');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(true);

  // Form states
  const [vpa, setVpa] = useState(currentCustomer?.upiId || 'rahul.sharma@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(currentCustomer?.name || 'Rahul Sharma');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('889');

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStep, setAuthStep] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    if (currentCustomer) {
      setVpa(currentCustomer.upiId || 'rahul.sharma@okhdfcbank');
      setCardHolder(currentCustomer.name || 'Rahul Sharma');
    }
  }, [currentCustomer]);

  const filteredScenarios = useMemo(() => {
    if (selectedCategory === 'ALL') return PAYMENT_SCENARIOS;
    return PAYMENT_SCENARIOS.filter(
      (s) => s.category === selectedCategory || s.id === 'NORMAL'
    );
  }, [selectedCategory]);

  const activeScenarioObj = useMemo(() => {
    return PAYMENT_SCENARIOS.find((s) => s.id === selectedScenario) || PAYMENT_SCENARIOS[0];
  }, [selectedScenario]);

  if (!isOpen || !item) return null;

  const handlePay = async () => {
    setIsProcessing(true);
    setPaymentResult(null);

    setAuthStep('Routing to Payment Gateway Switch...');
    await new Promise((r) => setTimeout(r, 450));

    setAuthStep('Verifying 3D-Secure 2.0 / MPIN Protocol...');
    await new Promise((r) => setTimeout(r, 450));

    setAuthStep('Processing Authorization Payload...');
    await new Promise((r) => setTimeout(r, 400));

    try {
      const isSuccess = selectedScenario === 'NORMAL';
      const res = await userApi.processPayment({
        customer: currentCustomer,
        item,
        scenario: selectedScenario,
        paymentMethod: activeTab.toUpperCase(),
        failureReason: isSuccess ? null : selectedScenario,
      });

      const orderRecord = {
        id: `INV-2026-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString(),
        itemName: item.name,
        amount: item.amount,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : selectedScenario,
        paymentMethod: activeTab === 'upi' ? `UPI (${vpa})` : `Card (•••• ${cardNumber.slice(-4)})`,
        caseId: `RC-${Date.now().toString().slice(-5)}`,
      };

      addOrder(orderRecord);
      setPaymentResult({
        ...res,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : selectedScenario,
      });

      if (isSuccess) {
        if (onSuccess) onSuccess(res);
      } else {
        if (onFailure) onFailure(res, orderRecord);
      }
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setIsProcessing(false);
      setAuthStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col max-h-[94vh]">
        {/* Razorpay Authentic Navy Header */}
        <div className="bg-[#0c2340] p-4.5 text-white flex items-start justify-between relative shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#0078d4] flex items-center justify-center font-bold text-[10px] text-white">
                R
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Razorpay Trusted Checkout
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Test Mode
              </span>
            </div>
            <h3 className="font-bold text-base text-white">Acme Corporation</h3>
            <p className="text-xs text-slate-300 truncate max-w-xs">{item.name}</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-slate-400">Amount Due</p>
            <p className="text-xl font-bold text-white font-mono-code">
              ₹{item.amount.toLocaleString('en-IN')}.00
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-white text-slate-900">
          {paymentResult ? (
            /* Result Screen */
            <div className="text-center py-6 space-y-4">
              {paymentResult.status === 'SUCCESS' ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Payment Captured!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    ₹{item.amount.toLocaleString('en-IN')} has been authorized and captured cleanly.
                  </p>
                  <div className="p-2.5 bg-emerald-50 rounded text-xs font-mono-code text-emerald-800 border border-emerald-200 inline-block mt-2">
                    Payment ID: {paymentResult.paymentId || 'pay_demo_success'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-bold text-red-600 tracking-wider">
                      Gateway Authorization Failed
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                      {activeScenarioObj.label}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    {activeScenarioObj.description}
                  </p>

                  <div className="p-3.5 bg-blue-50/80 rounded-lg border border-blue-200 text-left text-xs text-blue-900 space-y-1.5 max-w-md mx-auto mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-[#0078d4]">
                        <Zap size={14} />
                        RevivePilot Autonomous Agents Active
                      </span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 text-[#0078d4] font-semibold">
                        Port 5173
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Captured failure telemetry and dispatched to the multi-agent mesh. Detection, Root Cause, and Strategy agents are formulating recovery actions.
                    </p>
                    <div className="pt-1 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Autonomous Action:</span>
                      <span className="font-semibold text-emerald-700">{activeScenarioObj.strategy}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full btn-azure-secondary py-2 text-xs font-semibold cursor-pointer"
                >
                  Close &amp; View Invoices
                </button>
              </div>
            </div>
          ) : (
            /* Active Form */
            <>
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`p-2.5 rounded border text-xs font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'upi'
                      ? 'border-[#0078d4] bg-blue-50 text-[#0078d4] font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <QrCode size={16} />
                  <span>UPI &amp; QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cards')}
                  className={`p-2.5 rounded border text-xs font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'cards'
                      ? 'border-[#0078d4] bg-blue-50 text-[#0078d4] font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('netbanking')}
                  className={`p-2.5 rounded border text-xs font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'netbanking'
                      ? 'border-[#0078d4] bg-blue-50 text-[#0078d4] font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Building2 size={16} />
                  <span>NetBanking</span>
                </button>
              </div>

              {/* UPI Form */}
              {activeTab === 'upi' && (
                <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Enter UPI VPA</label>
                    <input
                      type="text"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code focus:outline-hidden focus:border-[#0078d4]"
                    />
                  </div>

                  <div className="p-2.5 bg-white rounded border border-slate-200 flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 p-1 rounded flex items-center justify-center flex-shrink-0">
                      <QrCode size={48} className="text-slate-800" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">Scan &amp; Pay</p>
                      <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, or CRED</p>
                      <p className="text-[10px] text-emerald-600 font-mono-code mt-0.5">Expires in 04:59</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cards Form */}
              {activeTab === 'cards' && (
                <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Expiry</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">CVV</label>
                      <input
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code text-center"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NetBanking */}
              {activeTab === 'netbanking' && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">Select Bank</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => (
                      <div key={b} className="p-2 bg-white rounded border border-slate-200 text-slate-700 font-medium text-center">
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 25 Payment Failure Simulation Controls ── */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowSimulatorDrawer(!showSimulatorDrawer)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={14} className="text-[#0078d4]" />
                    <span>Real-Time Failure Simulation: 25 Failure Causes</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-[#0078d4] font-semibold border border-blue-200">
                      Razorpay Standard
                    </span>
                    {showSimulatorDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {showSimulatorDrawer && (
                  <div className="p-3.5 bg-white space-y-3 border-t border-slate-200 text-xs">
                    {/* Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {FAILURE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                            selectedCategory === cat.id
                              ? 'bg-[#0078d4] text-white font-semibold shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Failure Cause Selector */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Select Realtime Failure Scenario
                      </label>
                      <select
                        value={selectedScenario}
                        onChange={(e) => setSelectedScenario(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#0078d4] cursor-pointer"
                      >
                        {filteredScenarios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Active Scenario Preview Card */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {activeScenarioObj.label}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-600 font-semibold">
                          code: {activeScenarioObj.code}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        {activeScenarioObj.description}
                      </p>
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Triggered Strategy:</span>
                        <span className="font-bold text-emerald-700">{activeScenarioObj.strategy}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pay Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full btn-azure py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>{authStep || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Lock size={13} />
                    <span>Pay ₹{item.amount.toLocaleString('en-IN')}.00</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            256-Bit SSL Encrypted
          </span>
          <span className="font-mono-code text-[10px]">Razorpay Sandbox v2.4</span>
        </div>
      </div>
    </div>
  );
}
