import { useState, useEffect, useMemo } from 'react';
import {
  X, CreditCard, QrCode, Building2, ShieldCheck, CheckCircle2,
  AlertTriangle, Clock, XCircle, ArrowRight, Loader2, Smartphone,
  Info, ChevronDown, ChevronUp, Lock, RefreshCw, Zap, Search
} from 'lucide-react';
import { PAYMENT_SCENARIOS, FAILURE_CATEGORIES, TEST_PAYMENT_CARDS } from '../../data/mockUserData';
import { userApi } from '../../services/api';
import { customerSocket } from '../../services/socket';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function RazorpayModal({ item, isOpen, onClose, onSuccess, onFailure }) {
  const {
    currentCustomer,
    addOrder,
    markOrderRecovered,
    setIsAuthModalOpen,
    deductBalance,
    setCustomerBalance,
  } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState('upi');
  const [selectedScenario, setSelectedScenario] = useState('INSUFFICIENT_FUNDS');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showSimulatorDrawer, setShowSimulatorDrawer] = useState(true);

  // Form states with dynamic unique assigned payment instruments
  const [selectedCardId, setSelectedCardId] = useState('card_assigned');
  const [vpa, setVpa] = useState(
    currentCustomer?.upiVpa || currentCustomer?.upi_vpa || 'user.9281@okhdfcbank'
  );
  const [cardNumber, setCardNumber] = useState(
    currentCustomer?.cardNumber || currentCustomer?.card_number || '4532 8912 3456 7890'
  );
  const [cardHolder, setCardHolder] = useState(currentCustomer?.name || 'Verified User');
  const [expiry, setExpiry] = useState(currentCustomer?.cardExpiry || currentCustomer?.card_expiry || '12/28');
  const [cvv, setCvv] = useState(currentCustomer?.cardCvv || currentCustomer?.card_cvv || '742');

  const allAvailableCards = useMemo(() => {
    const list = [];
    if (currentCustomer?.cardNumber || currentCustomer?.card_number) {
      list.push({
        id: 'card_assigned',
        network: currentCustomer.cardNetwork || currentCustomer.card_network || 'Visa',
        brand: `${currentCustomer.cardNetwork || 'Visa'} Corporate Platinum`,
        number: currentCustomer.cardNumber || currentCustomer.card_number,
        last4: String(currentCustomer.cardNumber || currentCustomer.card_number).slice(-4),
        holder: currentCustomer.name || 'Verified User',
        expiry: currentCustomer.cardExpiry || currentCustomer.card_expiry || '12/28',
        cvv: currentCustomer.cardCvv || currentCustomer.card_cvv || '742',
        bank: currentCustomer.bankName || 'HDFC Bank',
        bg: 'from-[#002050] to-[#005a9e]',
        type: 'Assigned Test Rail',
      });
    }
    (TEST_PAYMENT_CARDS || []).forEach((c) => {
      if (!list.find((x) => x.number === c.number)) {
        list.push(c);
      }
    });
    return list;
  }, [currentCustomer]);

  const activeCardObj = useMemo(() => {
    return allAvailableCards.find((c) => c.id === selectedCardId) || allAvailableCards[0];
  }, [allAvailableCards, selectedCardId]);

  const handleSelectCard = (c) => {
    setSelectedCardId(c.id);
    setCardNumber(c.number);
    setExpiry(c.expiry);
    setCvv(c.cvv);
    setCardHolder(c.holder);
  };

  // Execution & Recovery states
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStep, setAuthStep] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [recoveryStep, setRecoveryStep] = useState(0);
  const [recoveryActionReady, setRecoveryActionReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (currentCustomer) {
      setVpa(currentCustomer.upiVpa || currentCustomer.upi_vpa || 'user.9281@okhdfcbank');
      setCardNumber(currentCustomer.cardNumber || currentCustomer.card_number || '4532 8912 3456 7890');
      setCardHolder(currentCustomer.name || 'Verified User');
      setExpiry(currentCustomer.cardExpiry || currentCustomer.card_expiry || '12/28');
      setCvv(currentCustomer.cardCvv || currentCustomer.card_cvv || '742');
    }
  }, [currentCustomer]);

  // Subscribe to real-time backend Socket.IO events (backend-driven, NO fake timers)
  useEffect(() => {
    const unsub = customerSocket.subscribe((event) => {
      const type = event?.type || event?.event;
      if (type === 'recovery.case.created') {
        setRecoveryStep(1);
      } else if (type === 'recovery.analysis.started') {
        setRecoveryStep(2);
      } else if (type === 'recovery.root_cause_identified') {
        setRecoveryStep(3);
      } else if (type === 'recovery.strategy_selected') {
        setRecoveryStep(4);
      } else if (type === 'recovery.action.completed') {
        setRecoveryStep(5);
        setRecoveryActionReady(true);
      } else if (type === 'payment.recovered') {
        setPaymentResult((prev) => ({
          ...prev,
          status: 'RECOVERED',
          recovered_amount: event?.data?.recovered_amount || item?.amount,
        }));
      }
    });
    return () => unsub();
  }, [item]);

  const filteredScenarios = useMemo(() => {
    if (selectedCategory === 'ALL') return PAYMENT_SCENARIOS;
    return PAYMENT_SCENARIOS.filter(
      (s) => s.category === selectedCategory || s.id === 'NORMAL'
    );
  }, [selectedCategory]);

  const activeScenarioObj = useMemo(() => {
    return (
      PAYMENT_SCENARIOS.find((s) => s.id === selectedScenario) || PAYMENT_SCENARIOS[0]
    );
  }, [selectedScenario]);

  if (!isOpen || !item) return null;

  const handlePay = async () => {
    if (!currentCustomer) {
      if (setIsAuthModalOpen) setIsAuthModalOpen(true);
      return;
    }

    setIsProcessing(true);
    setPaymentResult(null);
    setRecoveryStep(0);
    setRecoveryActionReady(false);

    setAuthStep('Routing to Payment Gateway Switch...');
    await new Promise((r) => setTimeout(r, 400));

    setAuthStep('Authorizing through Merchant Payment Gateway...');
    await new Promise((r) => setTimeout(r, 400));

    try {
      const isSuccess = selectedScenario === 'NORMAL' || selectedScenario === 'SUCCESS';
      const res = await userApi.simulateCustomerPayment({
        amount: item.amount,
        method: activeTab,
        scenario: selectedScenario,
        itemName: item.name,
      });

      setActiveCaseId(res.case_id);

      const orderRecord = {
        id: res.payment_id || `INV-2026-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString(),
        itemName: item.name,
        amount: item.amount,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : selectedScenario,
        paymentMethod: activeTab === 'upi' ? `UPI (${vpa})` : `Card (•••• ${cardNumber.slice(-4)})`,
        caseId: res.case_id || `RC-${Date.now().toString().slice(-5)}`,
      };

      addOrder(orderRecord);
      setPaymentResult({
        ...res,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : selectedScenario,
      });

      if (isSuccess) {
        if (deductBalance) deductBalance(item.amount);
        if (res?.remaining_balance !== undefined && setCustomerBalance) {
          setCustomerBalance(res.remaining_balance);
        }
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

  const handleRetryRecovery = async () => {
    if (!activeCaseId) return;
    setIsRecovering(true);
    try {
      const res = await userApi.retryRecovery(activeCaseId);
      const recoveredAmt = res.recovered_amount || item.amount;
      setPaymentResult((prev) => ({
        ...prev,
        status: 'RECOVERED',
        recovered_amount: recoveredAmt,
      }));
      markOrderRecovered(activeCaseId, recoveredAmt);

      if (deductBalance) deductBalance(recoveredAmt);
      if (res?.remaining_balance !== undefined && setCustomerBalance) {
        setCustomerBalance(res.remaining_balance);
      }
      if (onSuccess) onSuccess(res);
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRecovering(false);
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
            <div className="text-center py-5 space-y-4">
              {paymentResult.status === 'RECOVERED' ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={34} />
                  </div>
                  <h4 className="text-xl font-bold text-emerald-800">
                    Payment Recovered Successfully!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    ₹{(paymentResult.recovered_amount || item.amount).toLocaleString('en-IN')}.00 has been captured and recorded as actual recovered revenue in the database.
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 max-w-md mx-auto space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Audit Status:</span>
                      <span className="font-mono text-emerald-700">RECOVERY_COMPLETED</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Merchant Cockpit:</span>
                      <span>Real-time +₹{(paymentResult.recovered_amount || item.amount).toLocaleString('en-IN')} updated</span>
                    </div>
                  </div>
                </div>
              ) : paymentResult.status === 'SUCCESS' ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Payment Captured!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    ₹{item.amount.toLocaleString('en-IN')} has been authorized and captured cleanly.
                  </p>
                  <div className="p-2.5 bg-emerald-50 rounded text-xs font-mono-code text-emerald-800 border border-emerald-200 inline-block mt-2">
                    Payment ID: {paymentResult.payment_id || paymentResult.paymentId || 'pay_demo_success'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertTriangle size={28} />
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

                  {/* Live Backend-Driven Recovery Stepper */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2.5 max-w-md mx-auto mt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <Zap size={14} className="text-[#0078d4]" />
                        Real-Time Recovery Lifecycle (Socket.IO)
                      </span>
                      <span className="text-[10px] font-mono text-[#0078d4] font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Live Case #{activeCaseId ? String(activeCaseId).slice(0, 8) : 'ACTIVE'}
                      </span>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <CheckCircle2 size={13} />
                        <span>Payment Failure Telemetry Captured</span>
                      </div>

                      <div className={`flex items-center gap-2 ${recoveryStep >= 1 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {recoveryStep >= 1 ? <CheckCircle2 size={13} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        <span>Revenue Risk Detected by Detection Agent</span>
                      </div>

                      <div className={`flex items-center gap-2 ${recoveryStep >= 2 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {recoveryStep >= 2 ? <CheckCircle2 size={13} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        <span>Root Cause Agent Diagnosing Failure</span>
                      </div>

                      <div className={`flex items-center gap-2 ${recoveryStep >= 4 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {recoveryStep >= 4 ? <CheckCircle2 size={13} /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                        <span>Recovery Strategy Selected: {activeScenarioObj.strategy}</span>
                      </div>

                      <div className={`flex items-center gap-2 ${recoveryActionReady || recoveryStep >= 5 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
                        {recoveryActionReady || recoveryStep >= 5 ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300" />
                        )}
                        <span>Autonomous Recovery Action Ready</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleRetryRecovery}
                        disabled={isRecovering}
                        className="w-full btn-azure py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isRecovering ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Executing Recovery Settlement...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={13} />
                            <span>Retry &amp; Recover Payment (₹{item.amount.toLocaleString('en-IN')})</span>
                          </>
                        )}
                      </button>
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
              {/* Dynamic Assigned Instruments Banner */}
              {currentCustomer ? (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-[11px] leading-tight">
                        Verified Identity: {currentCustomer.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {currentCustomer.email} • Unique Instruments Assigned
                      </p>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-blue-700 border border-blue-200 font-mono">
                    {currentCustomer.cardNetwork || 'Visa'} •••• {String(cardNumber).slice(-4)}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-900">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold block">Sign In Required to Proceed</span>
                      <span className="text-[11px] text-red-700">You must log in to authorize this transaction.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (setIsAuthModalOpen) setIsAuthModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

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
                <div className="space-y-3">
                  {/* Card Selector Pills */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Select Payment Card ({allAvailableCards.length} Cards Available)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {allAvailableCards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCard(c)}
                          className={`p-2 rounded border text-left text-xs transition-all cursor-pointer ${
                            selectedCardId === c.id
                              ? 'border-[#0078d4] bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px] truncate">{c.brand}</span>
                            <span className="text-[9px] uppercase font-mono px-1 rounded bg-slate-100 font-semibold text-slate-600">
                              {c.network}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-500 mt-0.5">•••• {c.last4}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Realistic Credit Card Preview */}
                  <div className={`p-4 rounded-xl text-white bg-gradient-to-r ${activeCardObj?.bg || 'from-[#002050] to-[#005a9e]'} shadow-md space-y-3 relative overflow-hidden`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-wider uppercase opacity-80">
                        {activeCardObj?.bank || 'HDFC Bank'}
                      </span>
                      <span className="text-xs font-bold font-mono tracking-widest">
                        {activeCardObj?.network || 'Visa'}
                      </span>
                    </div>

                    <div className="w-8 h-5 rounded bg-amber-300/80 border border-amber-400/80 flex items-center justify-center shadow-inner">
                      <div className="w-5 h-3 border border-amber-500/50 rounded-xs" />
                    </div>

                    <p className="font-mono text-sm tracking-widest font-bold">
                      {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '••••  ••••  ••••  7890'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider opacity-90">
                      <div>
                        <span className="text-[8px] opacity-60 block">Card Holder</span>
                        <span className="font-semibold truncate max-w-[150px] inline-block">{cardHolder || 'Verified User'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] opacity-60 block">Expires</span>
                        <span className="font-mono font-semibold">{expiry || '12/28'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code focus:outline-hidden focus:border-[#0078d4]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code text-center focus:outline-hidden focus:border-[#0078d4]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">CVV</label>
                        <input
                          type="password"
                          value={cvv}
                          maxLength={4}
                          onChange={(e) => setCvv(e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-mono-code text-center focus:outline-hidden focus:border-[#0078d4]"
                        />
                      </div>
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
                disabled={isProcessing || !currentCustomer}
                className={`w-full py-2.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  !currentCustomer
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : isProcessing
                      ? 'bg-slate-400 text-white cursor-wait'
                      : 'btn-azure'
                }`}
              >
                {!currentCustomer ? (
                  <>
                    <Lock size={13} />
                    <span>Sign In Required to Pay</span>
                  </>
                ) : isProcessing ? (
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
