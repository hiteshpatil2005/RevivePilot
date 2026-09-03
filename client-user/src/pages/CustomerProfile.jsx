import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, QrCode, ShieldCheck, Check, Plus, ArrowRight, Building2, Smartphone, LogIn, Copy } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { TEST_PAYMENT_CARDS } from '../data/mockUserData';

export default function CustomerProfile() {
  const { currentCustomer, setIsAuthModalOpen } = useCustomerAuth();
  const [balance, setBalance] = useState(Number(currentCustomer?.balance || 150000));
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState(null);

  const handleTopUp = (amount) => {
    setBalance((b) => b + amount);
    setTopUpSuccess(true);
    setTimeout(() => setTopUpSuccess(false), 2000);
  };

  const handleCopyCard = (card) => {
    navigator.clipboard.writeText(card.number.replace(/\s+/g, ''));
    setCopiedCardId(card.id);
    setTimeout(() => setCopiedCardId(null), 1500);
  };

  const allCards = useMemo(() => {
    const list = [];
    if (currentCustomer?.cardNumber || currentCustomer?.card_number) {
      list.push({
        id: 'card_assigned',
        network: currentCustomer.cardNetwork || currentCustomer.card_network || 'Visa',
        brand: `${currentCustomer.cardNetwork || 'Visa'} Corporate Platinum`,
        number: currentCustomer.cardNumber || currentCustomer.card_number,
        last4: String(currentCustomer.cardNumber || currentCustomer.card_number).slice(-4),
        holder: currentCustomer.name || 'Verified Customer',
        expiry: currentCustomer.cardExpiry || currentCustomer.card_expiry || '12/28',
        cvv: currentCustomer.cardCvv || currentCustomer.card_cvv || '742',
        bank: currentCustomer.bankName || 'HDFC Bank',
        bg: 'from-[#002050] to-[#005a9e]',
        isAssigned: true,
      });
    }
    (TEST_PAYMENT_CARDS || []).forEach((c) => {
      if (!list.find((x) => x.number === c.number)) {
        list.push(c);
      }
    });
    return list;
  }, [currentCustomer]);

  const customerName = currentCustomer?.name || 'Authorized Customer';
  const customerEmail = currentCustomer?.email || 'guest@example.com';
  const customerPhone = currentCustomer?.phone || '+91 98765 00000';
  const customerUpi = currentCustomer?.upiVpa || currentCustomer?.upi_vpa || 'customer.9281@okhdfcbank';

  return (
    <div className="space-y-4 pb-16">
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1">
          <Link to="/" className="hover:text-[#0078d4] text-slate-600">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Billing</span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Payment Methods &amp; Cards</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payment Rails &amp; Cards</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage saved payment cards, UPI handles, and simulated bank balance for {customerName}.
            </p>
          </div>

          {!currentCustomer && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
              className="btn-azure-secondary text-xs flex items-center gap-1.5 self-start"
            >
              <LogIn size={13} />
              <span>Sign In / Verify</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Account Summary Banner */}
        <div className="azure-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded bg-[#0078d4] text-white flex items-center justify-center font-bold text-sm">
              {customerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{customerName}</h3>
                <span className="text-[10px] font-semibold bg-blue-50 text-[#0078d4] px-2 py-0.5 rounded border border-blue-200">
                  {currentCustomer ? 'Enterprise Verified' : 'Guest Account'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{customerEmail} · {customerPhone}</p>
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

        {/* Multiple Saved Cards Deck */}
        <div className="azure-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard size={16} className="text-[#0078d4]" />
                <span>Available Test Payment Cards ({allCards.length} Cards)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Tokenized corporate and commercial credit/debit cards pre-configured for live gateway simulations.
              </p>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              PCI-DSS L1 Tokenized
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {allCards.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#0078d4] hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {c.bank}
                    </span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {c.network}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs mt-1 truncate">{c.brand}</h5>
                  <p className="font-mono text-xs font-bold text-[#0078d4] tracking-wider mt-1">
                    •••• •••• •••• {c.last4}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Exp: <strong className="font-mono text-slate-700">{c.expiry}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyCard(c)}
                    className="flex items-center gap-1 text-[#0078d4] hover:underline cursor-pointer font-medium"
                    title="Copy full 16-digit card number"
                  >
                    {copiedCardId === c.id ? (
                      <>
                        <Check size={11} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UPI & NetBanking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <span className="font-mono-code font-semibold text-slate-900">{customerUpi}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Verified Rail</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Primary payment rail for instant 1-click alternative recovery links.
              </p>
            </div>
          </div>

          {/* Netbanking */}
          <div className="azure-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={15} className="text-[#0078d4]" />
                NetBanking Corporate Portal
              </h4>
              <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                Instant Settlement
              </span>
            </div>

            <div className="p-3 rounded border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  {currentCustomer?.bankName || 'HDFC Bank Corporate'}
                </span>
                <span className="font-mono text-slate-500 text-[11px]">
                  IFSC: {currentCustomer?.bankIfsc || 'HDFC0001234'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                A/C: {currentCustomer?.bankAccountNumber || '5010049281928'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
