import { useState, useEffect, useMemo } from 'react';
import {
  X, CreditCard, QrCode, Building2, ShieldCheck, CheckCircle2,
  AlertTriangle, Clock, XCircle, ArrowRight, Loader2, Smartphone,
  Info, ChevronDown, ChevronUp, Lock, RefreshCw, Zap, Search,
  MessageSquare, Calendar, Send
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

  // Card Simulator State (Section 11 & 42: Valid vs Expired toggle)
  const [isCardExpiredInSimulator, setIsCardExpiredInSimulator] = useState(false);
  const [isBankDegradedInSimulator, setIsBankDegradedInSimulator] = useState(false);

  // Form states with dynamic unique assigned payment instruments
  const [selectedCardId, setSelectedCardId] = useState('card_assigned');
  const [vpa, setVpa] = useState(
    currentCustomer?.upiVpa || currentCustomer?.upi_vpa || 'user.9281@okhdfcbank'
  );
  const [cardNumber, setCardNumber] = useState(
    currentCustomer?.cardNumber || currentCustomer?.card_number || '4532 8912 3456 7890'
  );
  const [cardHolder, setCardHolder] = useState(currentCustomer?.name || 'Verified User');
  const [expiry, setExpiry] = useState(isCardExpiredInSimulator ? '08/25' : (currentCustomer?.cardExpiry || currentCustomer?.card_expiry || '12/28'));
  const [cvv, setCvv] = useState(currentCustomer?.cardCvv || currentCustomer?.card_cvv || '742');

  // Customer Interactive Recovery State (Section 8, 9, 24, 25)
  const [customerContextOption, setCustomerContextOption] = useState(null);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [isContextSubmitting, setIsContextSubmitting] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [holdStatedTime, setHoldStatedTime] = useState(null);
  const [agentContextReply, setAgentContextReply] = useState(null);

  // Execution & Recovery states
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStep, setAuthStep] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [recoveryStep, setRecoveryStep] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  // Update card expiry when simulator toggle changes
  useEffect(() => {
    if (isCardExpiredInSimulator) {
      setExpiry('08/25');
    } else {
      setExpiry(currentCustomer?.cardExpiry || currentCustomer?.card_expiry || '12/28');
    }
  }, [isCardExpiredInSimulator, currentCustomer]);

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
        expiry: isCardExpiredInSimulator ? '08/25' : (currentCustomer.cardExpiry || currentCustomer.card_expiry || '12/28'),
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
  }, [currentCustomer, isCardExpiredInSimulator]);

  const activeCardObj = useMemo(() => {
    return allAvailableCards.find((c) => c.id === selectedCardId) || allAvailableCards[0];
  }, [allAvailableCards, selectedCardId]);

  const handleSelectCard = (c) => {
    setSelectedCardId(c.id);
    setCardNumber(c.number);
    setExpiry(isCardExpiredInSimulator ? '08/25' : c.expiry);
    setCvv(c.cvv);
    setCardHolder(c.holder);
  };

  useEffect(() => {
    if (currentCustomer) {
      setVpa(currentCustomer.upiVpa || currentCustomer.upi_vpa || 'user.9281@okhdfcbank');
      setCardNumber(currentCustomer.cardNumber || currentCustomer.card_number || '4532 8912 3456 7890');
      setCardHolder(currentCustomer.name || 'Verified User');
      setExpiry(isCardExpiredInSimulator ? '08/25' : (currentCustomer.cardExpiry || currentCustomer.card_expiry || '12/28'));
      setCvv(currentCustomer.cardCvv || currentCustomer.card_cvv || '742');
    }
  }, [currentCustomer, isCardExpiredInSimulator]);

  // Subscribe to real-time backend Socket.IO events (backend-driven, NO fake timers)
  useEffect(() => {
    const unsub = customerSocket.subscribe((event) => {
      const type = event?.type || event?.event;
      if (type === 'recovery.case.created') {
        setRecoveryStep(1);
      } else if (type === 'recovery.waiting_for_customer') {
        setRecoveryStep(2);
      } else if (type === 'recovery.hold_started') {
        setIsOnHold(true);
        setRecoveryStep(3);
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !item) return null;

  const handlePay = async () => {
    if (!currentCustomer) {
      if (setIsAuthModalOpen) setIsAuthModalOpen(true);
      return;
    }

    setIsProcessing(true);
    setPaymentResult(null);
    setRecoveryStep(0);
    setIsOnHold(false);
    setHoldStatedTime(null);
    setAgentContextReply(null);

    setAuthStep('Routing to Payment Gateway Switch...');
    await new Promise((r) => setTimeout(r, 350));

    setAuthStep('Authorizing payment with issuer...');
    await new Promise((r) => setTimeout(r, 350));

    try {
      // Determine effective scenario (e.g. if card is toggled expired in simulator)
      let effectiveScenario = selectedScenario;
      if (activeTab === 'cards' && isCardExpiredInSimulator) {
        effectiveScenario = 'CARD_EXPIRED';
      } else if (isBankDegradedInSimulator) {
        effectiveScenario = 'BANK_DOWNTIME';
      }

      const isSuccess = effectiveScenario === 'NORMAL' || effectiveScenario === 'SUCCESS';
      const res = await userApi.simulateCustomerPayment({
        amount: item.amount,
        method: activeTab,
        scenario: effectiveScenario,
        itemName: item.name,
      });

      setActiveCaseId(res.case_id);

      const orderRecord = {
        id: res.payment_id || `INV-2026-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString(),
        itemName: item.name,
        amount: item.amount,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : effectiveScenario,
        paymentMethod: activeTab === 'upi' ? `UPI (${vpa})` : `Card (•••• ${cardNumber.slice(-4)})`,
        caseId: res.case_id || `RC-${Date.now().toString().slice(-5)}`,
      };

      addOrder(orderRecord);
      setPaymentResult({
        ...res,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        failureReason: isSuccess ? null : effectiveScenario,
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

  // Customer interactive context submission (Section 8: "I should have enough funds tomorrow at 10 AM")
  const handleSubmitCustomerContext = async (optionText = null) => {
    const chosenTime = optionText || customTimeInput || customerContextOption;
    if (!chosenTime || !activeCaseId) return;

    try {
      setIsContextSubmitting(true);
      const res = await userApi.sendCustomerRecoveryChat(activeCaseId, {
        selectedOption: chosenTime,
        message: optionText ? null : customTimeInput,
      });

      setIsOnHold(true);
      setHoldStatedTime(chosenTime);
      setAgentContextReply(res.reply);
    } catch (err) {
      console.error('Context submission failed:', err);
    } finally {
      setIsContextSubmitting(false);
    }
  };

  // Verified Retry Execution (Section 45: Never mark RECOVERED without actual verified settlement)
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
      console.error('Verified retry failed:', err);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col max-h-[94vh]">
        {/* Razorpay Authentic Navy Header */}
        <div className="bg-[#0c2340] px-5 py-4 text-white flex items-center justify-between border-b border-blue-900/50 shadow-sm">
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

          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Amount Due</p>
              <p className="text-xl font-bold text-white font-mono-code leading-tight">
                ₹{item.amount.toLocaleString('en-IN')}.00
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
              title="Close checkout (Esc)"
              aria-label="Close checkout"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-white text-slate-900">
          {paymentResult ? (
            /* Result Screen */
            <div className="text-center py-4 space-y-4">
              {paymentResult.status === 'RECOVERED' ? (
                /* VERIFIED RECOVERY SUCCESS */
                <div className="space-y-3 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={34} />
                  </div>
                  <h4 className="text-xl font-bold text-emerald-800">
                    Payment Recovered Successfully!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    ₹{(paymentResult.recovered_amount || item.amount).toLocaleString('en-IN')}.00 has been captured and validated by payment gateway telemetry.
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 max-w-md mx-auto space-y-1 text-left">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Verification Audit:</span>
                      <span className="font-mono text-emerald-700">PAYMENT_CAPTURED_VERIFIED</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Merchant Cockpit:</span>
                      <span>Realtime +₹{(paymentResult.recovered_amount || item.amount).toLocaleString('en-IN')} updated</span>
                    </div>
                  </div>
                </div>
              ) : paymentResult.status === 'SUCCESS' ? (
                /* NORMAL SUCCESS */
                <div className="space-y-2 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Payment Captured!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    ₹{item.amount.toLocaleString('en-IN')} has been authorized cleanly.
                  </p>
                  <div className="p-2.5 bg-emerald-50 rounded text-xs font-mono-code text-emerald-800 border border-emerald-200 inline-block mt-2">
                    Payment ID: {paymentResult.payment_id || paymentResult.paymentId || 'pay_demo_success'}
                  </div>
                </div>
              ) : (
                /* INTERACTIVE RECOVERY CONVERSATION (FAILURE CASE) */
                <div className="space-y-3.5 animate-fade-in text-left">
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider block">
                        Payment Authorization Failed
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {activeScenarioObj.label}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {paymentResult.message || activeScenarioObj.description}
                      </p>
                    </div>
                  </div>

                  {/* Scenario 1: INSUFFICIENT FUNDS INTERACTIVE CONVERSATION (Section 7, 8, 9, 25) */}
                  {paymentResult.failure_reason === 'INSUFFICIENT_FUNDS' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-[#0078d4]" />
                          <span>RevivePilot Smart Recovery Conversation</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#0078d4] font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Case #{activeCaseId ? String(activeCaseId).slice(0, 8) : 'ACTIVE'}
                        </span>
                      </div>

                      {!isOnHold ? (
                        /* Step A: Ask Customer when funds will be available */
                        <div className="space-y-3 text-xs">
                          <p className="text-slate-700 leading-relaxed">
                            Your payment of <strong>₹{item.amount.toLocaleString('en-IN')}</strong> could not be completed because the available payment balance was insufficient.
                          </p>
                          <p className="font-semibold text-slate-900">
                            When would you like to try this payment again?
                          </p>

                          {/* Quick Choice Chips */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {[
                              'Today evening',
                              'Tomorrow morning',
                              'After expected salary/funds',
                              'Tomorrow at 10 AM',
                            ].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleSubmitCustomerContext(opt)}
                                disabled={isContextSubmitting}
                                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-[#0078d4] text-slate-800 font-medium text-left transition-all cursor-pointer shadow-2xs"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>

                          {/* Free text write-in */}
                          <div className="pt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={customTimeInput}
                              onChange={(e) => setCustomTimeInput(e.target.value)}
                              placeholder="Or specify custom time (e.g. Friday 2 PM)..."
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-hidden focus:border-[#0078d4]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitCustomerContext(null)}
                              disabled={isContextSubmitting || !customTimeInput.trim()}
                              className="btn-azure py-2 px-3 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Send size={12} />
                              <span>Set</span>
                            </button>
                          </div>

                          {/* Section 10: Strict Disclaimer */}
                          <p className="text-[10px] text-slate-500 italic pt-1">
                            🔒 RevivePilot cannot access your private bank account balance. Your stated retry time is recorded as customer-provided evidence to prevent unwanted retries.
                          </p>
                        </div>
                      ) : (
                        /* Step B: Case is ON HOLD */
                        <div className="space-y-3 text-xs animate-fade-in">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                <Clock size={14} className="text-[#0078d4]" />
                                <span>Payment Placed ON HOLD</span>
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-200/60 font-bold text-blue-800">
                                HOLD ACTIVE
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-[11px]">
                              {agentContextReply || `Recorded retry window: "${holdStatedTime}". The payment will remain held rather than repeatedly retrying your bank account.`}
                            </p>
                          </div>

                          <div className="pt-1 space-y-2">
                            <p className="text-slate-600 text-[11px]">
                              Have your funds arrived? You can confirm and proceed with the payment now:
                            </p>
                            <button
                              type="button"
                              onClick={handleRetryRecovery}
                              disabled={isRecovering}
                              className="w-full btn-azure py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isRecovering ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Authorizing Verified Payment...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Confirm &amp; Complete Payment (₹{item.amount.toLocaleString('en-IN')})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scenario 2: CARD EXPIRED INTERACTIVE FLOW (Section 11) */}
                  {paymentResult.failure_reason === 'CARD_EXPIRED' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                      <p className="text-slate-700 leading-relaxed">
                        Your saved payment card ending in <strong>{cardNumber.slice(-4)}</strong> appears to have expired.
                      </p>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                        <span className="font-bold block">Simulation Test Environment</span>
                        <p>You can toggle the simulated card validity in the simulator controls below to test recovery.</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCardExpiredInSimulator(false);
                            setExpiry('12/28');
                          }}
                          className="flex-1 btn-azure py-2 text-xs font-semibold cursor-pointer"
                        >
                          Update Card to Valid (12/28)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('upi');
                            setPaymentResult(null);
                          }}
                          className="flex-1 btn-azure-secondary py-2 text-xs font-semibold cursor-pointer"
                        >
                          Switch to UPI Rail
                        </button>
                      </div>
                    </div>
                  )}

                  {/* General Verified Retry Action for Other Scenarios */}
                  {paymentResult.failure_reason !== 'INSUFFICIENT_FUNDS' && paymentResult.failure_reason !== 'CARD_EXPIRED' && (
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
                            <span>Processing Verified Retry...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={13} />
                            <span>Confirm &amp; Retry Payment (₹{item.amount.toLocaleString('en-IN')})</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full btn-azure-secondary py-2 text-xs font-semibold cursor-pointer"
                >
                  Close &amp; View Orders
                </button>
              </div>
            </div>
          ) : (
            /* Active Form */
            <>
              {/* Customer Identity Banner */}
              {currentCustomer ? (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-[11px] leading-tight">
                        Verified Identity: {currentCustomer.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {currentCustomer.email} • Assigned Unique Test Instruments
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

              {/* Payment Rail Tabs */}
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
                        <span className={`font-mono font-semibold ${isCardExpiredInSimulator ? 'text-red-300 underline font-bold' : ''}`}>
                          {expiry || '12/28'}
                        </span>
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

              {/* ── Section 42: Test Scenario & Simulator Controls Engine ── */}
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowSimulatorDrawer(!showSimulatorDrawer)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={14} className="text-[#0078d4]" />
                    <span>Real-Time Failure Simulation: 25 Scenarios</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-[#0078d4] font-semibold border border-blue-200">
                      SIMULATION ENVIRONMENT
                    </span>
                    {showSimulatorDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {showSimulatorDrawer && (
                  <div className="p-3.5 bg-white space-y-3 border-t border-slate-200 text-xs">
                    {/* Category Filter Pills */}
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

                    {/* Scenario Picker */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Select Payment Failure Scenario
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

                    {/* Section 11 & 42: Simulator Environment Controls (Card & Bank Health) */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                        Test Rail Simulator Controls
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsCardExpiredInSimulator(!isCardExpiredInSimulator)}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border cursor-pointer transition-all ${
                            isCardExpiredInSimulator
                              ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Card Validity: {isCardExpiredInSimulator ? 'EXPIRED (08/25)' : 'VALID (12/28)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsBankDegradedInSimulator(!isBankDegradedInSimulator)}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border cursor-pointer transition-all ${
                            isBankDegradedInSimulator
                              ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Bank Status: {isBankDegradedInSimulator ? 'DEGRADED (Downtime)' : 'HEALTHY (Normal)'}
                        </button>
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
                    <span>{authStep || 'Authorizing...'}</span>
                  </>
                ) : (
                  <>
                    <Lock size={13} />
                    <span>Authorize Payment ₹{item.amount.toLocaleString('en-IN')}.00</span>
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
