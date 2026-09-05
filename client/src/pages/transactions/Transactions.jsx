import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, ChevronRight, X, ChevronLeft, AlertCircle, RefreshCw,
  ExternalLink, ArrowRight, CheckCircle2, ShieldCheck, Copy, Check,
  Code, User, Globe, Hash
} from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import SearchInput from '../../components/common/SearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const METHOD_LABELS = {
  CARD:        'Credit / Debit Card',
  UPI:         'UPI Instant',
  NET_BANKING: 'Net Banking',
  WALLET:      'Digital Wallet',
};

const STATUS_OPTS = [
  { value: '',         label: 'All Statuses' },
  { value: 'SUCCESS',  label: 'Success'  },
  { value: 'FAILED',   label: 'Failed'   },
  { value: 'PENDING',  label: 'Pending'  },
  { value: 'REFUNDED', label: 'Refunded' },
];

const METHOD_OPTS = [
  { value: '',            label: 'All Methods'   },
  { value: 'CARD',        label: 'Card'          },
  { value: 'UPI',         label: 'UPI'           },
  { value: 'NET_BANKING', label: 'Net Banking'   },
  { value: 'WALLET',      label: 'Wallet'        },
];

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function TransactionDrawer({ txn, onClose, navigate }) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!txn) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [txn, onClose]);

  if (!txn) return null;

  const customer = txn.customer || {};
  const amt = Number(txn.amount || 0);
  const paymentId = txn.external_payment_id || txn.externalPaymentId || txn.id;
  const statusStr = String(txn.status || 'PENDING').toUpperCase();

  const handleCopyId = () => {
    if (!paymentId) return;
    navigator.clipboard?.writeText(paymentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Full Viewport Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className="relative z-10 h-screen w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-payment-id"
      >
        {/* Drawer Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0c6ff9]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Payment Telemetry
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span id="drawer-payment-id" className="font-mono text-sm font-bold text-slate-900 select-all">
                  {paymentId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Copy payment ID"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Amount Hero Card */}
          <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Transaction Amount
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                ₹{amt.toLocaleString('en-IN')}.00
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Currency: <span className="font-semibold text-slate-700">{txn.currency || 'INR'}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={txn.status} />
              <span className="text-[10px] text-slate-500">
                {fmtDateTime(txn.created_at || txn.createdAt)}
              </span>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <User size={14} className="text-slate-500" />
              <span>Customer Information</span>
            </div>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden bg-white">
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Name</span>
                <span className="font-semibold text-slate-900">{customer.name || txn.customer_name || 'Customer'}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="font-mono text-slate-800">{customer.email || txn.customer_email || '—'}</span>
              </div>
              {(customer.phone || txn.customer_phone) && (
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Phone</span>
                  <span className="font-mono text-slate-800">{customer.phone || txn.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Gateway Metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <CreditCard size={14} className="text-slate-500" />
              <span>Gateway Metadata</span>
            </div>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden bg-white">
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Payment Method</span>
                <span className="font-semibold text-slate-900">
                  {METHOD_LABELS[txn.payment_method || txn.paymentMethod || 'CARD'] || 'Card'}
                </span>
              </div>
              {txn.external_order_id && (
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Order Reference</span>
                  <span className="font-mono text-slate-800">{txn.external_order_id}</span>
                </div>
              )}
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Gateway Provider</span>
                <span className="font-semibold text-[#0c6ff9]">Razorpay Payments Network</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Created Timestamp</span>
                <span className="text-slate-700">{fmtDateTime(txn.created_at || txn.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Failure Diagnostics if Failed */}
          {(txn.failure_reason || txn.failureReason) && (
            <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                <p className="font-bold text-red-900 uppercase tracking-wider text-[11px]">
                  Payment Failure Diagnostics
                </p>
              </div>
              <div className="p-2.5 rounded bg-white/80 border border-red-200/60 font-mono text-xs font-bold text-red-700">
                {txn.failure_reason || txn.failureReason}
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                Telemetry captured by RevivePilot autonomous recovery engine. An active recovery case has been initiated to resolve this payment issue.
              </p>
            </div>
          )}

          {/* Settled Confirmation if SUCCESS */}
          {statusStr === 'SUCCESS' && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3 text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">Payment Settled &amp; Verified</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                  Funds successfully captured via Razorpay Priority Rail. No manual intervention required.
                </p>
              </div>
            </div>
          )}

          {/* Collapsible Raw Telemetry Inspector */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowRaw(r => !r)}
              className="w-full text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code size={14} className="text-slate-500" />
                <span>Raw Gateway Telemetry</span>
              </div>
              <span className="text-[11px] font-mono text-blue-600">
                {showRaw ? 'Collapse ▲' : 'Inspect JSON ▼'}
              </span>
            </button>
            {showRaw && (
              <pre className="p-3.5 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-56 border-t border-slate-200">
                {JSON.stringify(txn, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Drawer Footer Action */}
        <div className="flex-shrink-0 p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          {statusStr === 'FAILED' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/recovery/${txn.recoveryCase || paymentId}`);
              }}
              className="h-9 px-4 rounded-md bg-[#0c6ff9] hover:bg-[#005ad4] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <span>Open in Recovery Center</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Settled on Priority Rail</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const HEADERS = ['Payment ID', 'Customer Profile', 'Amount', 'Payment Method', 'Gateway Status', 'Failure Diagnostics', 'Created At', ''];

export default function Transactions() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Call real backend through hook
  const { transactions = [], pagination, loading, error, refresh } = useTransactions({
    page,
    limit: 20,
    status: statusF ? statusF.toUpperCase() : undefined,
    search: search ? search.trim() : undefined,
  });

  // Client-side filtering by method if needed
  const displayTxns = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    if (!methodF) return list;
    return list.filter(t => {
      const m = (t.payment_method || t.paymentMethod || t.method || '').toUpperCase();
      return m === methodF.toUpperCase();
    });
  }, [transactions, methodF]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusF(val);
    setPage(1);
  };

  const handleMethodChange = (val) => {
    setMethodF(val);
  };

  const totalPages = pagination?.pages || Math.ceil((pagination?.total || displayTxns.length || 1) / 20) || 1;

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-6 mx-auto animate-fade-in text-slate-900 font-sans">
      {/* ── Enterprise Header (Razorpay White Theme) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Payment Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0c6ff9] border border-blue-200">
              Gateway Ledger
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time transaction tracking, failure reasons, and automated recovery linkage
          </p>
        </div>

        {/* Clean Production Toolbar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-4 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-[#0c6ff9] hover:border-[#0c6ff9] flex items-center gap-2 transition-all shadow-2xs"
            title="Open customer checkout portal on port 3001"
          >
            <ExternalLink size={14} className="text-[#0c6ff9]" />
            <span>Customer Store (:3001)</span>
          </a>

          <button
            type="button"
            onClick={() => refresh()}
            className="h-9 px-3.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Refresh transactions"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Unified Expanded Filter Toolbar ── */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search payment ID, customer, order..."
            />
          </div>
          <FilterDropdown value={statusF} onChange={handleStatusChange} options={STATUS_OPTS} className="w-44" />
          <FilterDropdown value={methodF} onChange={handleMethodChange} options={METHOD_OPTS} className="w-44" />

          {(search || statusF || methodF) && (
            <button
              type="button"
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => { setSearch(''); setStatusF(''); setMethodF(''); setPage(1); }}
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-slate-900">{pagination?.total ?? displayTxns.length}</strong> transactions
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="px-3 py-1 rounded bg-white border border-red-200 text-red-700 hover:bg-red-50 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Expanded Data Table Card (Pure White, Comfortable Spacing) ── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
          <SkeletonLoader.Table rows={8} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          {displayTxns.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<CreditCard size={24} className="text-slate-400" />}
                title="No transactions found"
                subtitle="Try adjusting your search criteria or resetting filters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left text-xs bg-white">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {HEADERS.map((h, idx) => (
                      <th
                        key={idx}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayTxns.map((txn) => {
                    const cust =
                      (typeof txn.customer === 'object' && txn.customer)
                        ? txn.customer
                        : {};
                    const custName = cust.name || txn.customer_name || 'Customer';
                    const custEmail = cust.email || txn.customer_email || '—';
                    const pMethod = txn.payment_method || txn.paymentMethod || txn.method || 'CARD';
                    const fReason = txn.failure_reason || txn.failureReason;
                    const amt = Number(txn.amount || 0);
                    const paymentId = txn.external_payment_id || txn.externalPaymentId || txn.id;

                    return (
                      <tr
                        key={txn.id}
                        onClick={() => setSelectedTxn(txn)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors bg-white group"
                      >
                        {/* Payment ID */}
                        <td className="px-6 py-4.5 font-mono font-bold text-[#0c6ff9] text-sm group-hover:underline">
                          {paymentId}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4.5">
                          <p className="font-semibold text-slate-900 text-sm">
                            {custName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {custEmail}
                          </p>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₹{amt.toLocaleString('en-IN')}.00
                          </span>
                        </td>

                        {/* Method */}
                        <td className="px-6 py-4.5 text-slate-700 font-medium">
                          {METHOD_LABELS[pMethod] || pMethod}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4.5">
                          <StatusBadge status={txn.status} />
                        </td>

                        {/* Failure Diagnostics */}
                        <td className="px-6 py-4.5">
                          {fReason ? (
                            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                              {fReason}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {fmtDateTime(txn.created_at || txn.createdAt)}
                        </td>

                        {/* Chevron Action */}
                        <td className="px-6 py-4.5 text-right">
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-[#0c6ff9] group-hover:translate-x-1 transition-all" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 text-xs">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 text-slate-600 font-medium">
                <span>Page</span>
                <span className="font-bold text-slate-900">{page}</span>
                <span>of</span>
                <span className="font-bold text-slate-900">{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-3 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Transaction Drawer */}
      <TransactionDrawer
        txn={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        navigate={navigate}
      />
    </div>
  );
}
