import { useState, useRef, useEffect } from 'react';
import {
  X, Mail, User, Phone, CheckCircle2, ShieldCheck, KeyRound,
  ArrowRight, Loader2, CreditCard, Building2, Smartphone, Sparkles,
  LogIn, UserPlus, ArrowLeft
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function CustomerRegisterModal({ isOpen, onClose, initialMode = 'login' }) {
  const { sendOtp, verifyOtp } = useCustomerAuth();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryNotice, setDeliveryNotice] = useState(null);
  const [createdProfile, setCreatedProfile] = useState(null);

  // Sync mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
    }
  }, [isOpen, initialMode]);

  // Focus first blank slot when entering OTP step
  useEffect(() => {
    if (isOpen && step === 'otp') {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen, step]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setError(null);
      setOtpDigits(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handleDigitChange = (val, idx) => {
    const clean = val.replace(/\D/g, '');
    const updated = [...otpDigits];

    if (!clean) {
      updated[idx] = '';
      setOtpDigits(updated);
      return;
    }

    const digit = clean.slice(-1);
    updated[idx] = digit;
    setOtpDigits(updated);

    // Auto-advance to next blank slot
    if (idx < 5 && inputRefs.current[idx + 1]) {
      inputRefs.current[idx + 1].focus();
      setActiveIndex(idx + 1);
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[idx] && idx > 0 && inputRefs.current[idx - 1]) {
        const updated = [...otpDigits];
        updated[idx - 1] = '';
        setOtpDigits(updated);
        inputRefs.current[idx - 1].focus();
        setActiveIndex(idx - 1);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      setActiveIndex(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
      setActiveIndex(idx + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);

    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
    setActiveIndex(nextIdx);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your real email address.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please provide your full name for registration.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await sendOtp(
        email.trim().toLowerCase(),
        mode === 'register' ? name.trim() : undefined
      );
      setDeliveryNotice(res);
      setStep('otp');
    } catch (err) {
      console.error('Send OTP failed:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('').trim();
    if (!enteredCode || enteredCode.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtp(
        email.trim().toLowerCase(),
        enteredCode,
        mode === 'register' ? (name.trim() || undefined) : undefined
      );
      setCreatedProfile(res.customer);
      setStep('success');
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.detail || err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col">
        {/* Header */}
        <div className="bg-[#0c2340] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-[#0078d4] flex items-center justify-center font-bold text-xs text-white">
              R
            </span>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">
                {step === 'success'
                  ? mode === 'login' ? 'Signed In Successfully!' : 'Account Verified!'
                  : step === 'otp'
                  ? 'Verification Code'
                  : mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {step === 'otp'
                  ? 'Enter the 6-digit OTP sent to your email'
                  : mode === 'login'
                  ? 'Sign in securely with real-time OTP'
                  : 'Realtime registration & unique test payment rails'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Form (Sign In or Register) */}
          {step === 'form' && (
            <div>
              {/* Segmented Mode Switcher */}
              <div className="flex rounded-lg bg-slate-100 p-1 mb-4 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#0078d4] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#0078d4] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus size={13} />
                  <span>Create Account</span>
                </button>
              </div>

              <form onSubmit={handleSendCode} className="space-y-3.5">
                {mode === 'register' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-hidden focus:border-[#0078d4]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-hidden focus:border-[#0078d4]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {mode === 'login'
                      ? 'Enter your registered email to receive a 6-digit login OTP'
                      : 'We will send a real-time verification code to this inbox'}
                  </p>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-hidden focus:border-[#0078d4]"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-azure py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sending Security Code...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Send 6-Digit Login Code' : 'Send Verification Code'}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>

                {/* Footer Switcher Link */}
                <div className="text-center pt-2 border-t border-slate-100">
                  {mode === 'login' ? (
                    <p className="text-xs text-slate-600">
                      New customer?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('register'); setError(null); }}
                        className="text-[#0078d4] font-semibold hover:underline cursor-pointer"
                      >
                        Create an Account
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); }}
                        className="text-[#0078d4] font-semibold hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Enter Verification Code (6 Blank Spaces) */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0078d4] flex items-center justify-center mx-auto">
                  <KeyRound size={20} />
                </div>
                <h4 className="font-bold text-sm text-slate-900">
                  {mode === 'login' ? 'Sign In Verification' : 'Verify Your Email'}
                </h4>
                <p className="text-xs text-slate-500">
                  We dispatched a 6-digit code to <strong className="text-slate-800">{email}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <div className="flex items-center justify-center gap-2.5 my-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otpDigits[index] || '';
                    const isFocused = activeIndex === index;
                    return (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(e.target.value, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        onFocus={() => setActiveIndex(index)}
                        className={`w-11 h-12 text-center text-xl font-bold font-mono rounded-lg border transition-all duration-150 outline-none select-none ${
                          digit
                            ? 'border-[#0078d4] bg-blue-50/50 text-[#0c2340] shadow-xs'
                            : isFocused
                            ? 'border-[#0078d4] bg-white ring-2 ring-blue-500/25 shadow-xs'
                            : 'border-slate-300 bg-slate-50/50 text-slate-900 hover:border-slate-400'
                        }`}
                        placeholder=""
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  6 blank spaces • Check your email inbox for the code
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-azure py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{mode === 'login' ? 'Authenticating...' : 'Verifying & Assigning Rails...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In to Account' : 'Verify & Activate Account'}</span>
                      <CheckCircle2 size={13} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={12} />
                  <span>Change Email</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Verification Success with Unique Instruments */}
          {step === 'success' && createdProfile && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  {mode === 'login' ? `Welcome Back, ${createdProfile.name}!` : `Welcome, ${createdProfile.name}!`}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mode === 'login'
                    ? 'Signed in successfully. Your payment instruments and order history are active.'
                    : 'Your profile is verified. Unique payment instruments have been provisioned:'}
                </p>
              </div>

              {/* Unique Payment Instruments Box */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <CreditCard size={14} className="text-[#0078d4]" />
                    Unique 16-Digit Card
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {createdProfile.cardNumber || createdProfile.card_number}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Smartphone size={14} className="text-purple-600" />
                    Unique UPI VPA
                  </span>
                  <span className="font-mono font-semibold text-purple-700">
                    {createdProfile.upiVpa || createdProfile.upi_vpa}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Building2 size={14} className="text-emerald-600" />
                    HDFC NetBanking
                  </span>
                  <span className="font-mono text-slate-700 font-medium">
                    A/C: {createdProfile.bankAccountNumber || createdProfile.bank_account_number}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full btn-azure py-2.5 text-xs font-bold cursor-pointer shadow-xs"
              >
                Proceed to Store
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            256-Bit SSL Encrypted
          </span>
          <span className="font-mono text-[10px]">RevivePilot Auth v2.0</span>
        </div>
      </div>
    </div>
  );
}
