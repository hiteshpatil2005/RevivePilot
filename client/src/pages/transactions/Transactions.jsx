import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, ChevronRight, X, ChevronLeft, AlertCircle, RefreshCw,
  ExternalLink, ArrowRight, CheckCircle2, ShieldCheck
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
  if (!txn) return null;
  const customer = txn.customer || {};
  const amt = Number(txn.amount || 0);
  const paymentId = txn.external_payment_id || txn.externalPaymentId || txn.id;
  const statusStr = String(txn.status || 'PENDING').toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 overflow-y-auto bg-white border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col justify-between">
        <div>
          {/* Drawer Header */}
          <div className="sticky top-0 flex items-center justify-between px-6 py-4.5 bg-white border-b border-slate-200 z-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Payment Telemetry
              </p>
              <p className="font-mono text-base font-bold text-slate-900 mt-0.5">
                {paymentId}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={17} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Amount Banner */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Transaction Amount
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                  ₹{amt.toLocaleString('en-IN')}.00
                </p>
              </div>
              <StatusBadge status={txn.status} />
            </div>

            {/* Customer Information */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer Information
              </h4>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-slate-900">{customer.name || txn.customer_name || 'Customer'}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-mono text-slate-800">{customer.email || txn.customer_email || '—'}</span>
                </div>
                {customer.phone && (
                  <div className="p-3 flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-mono text-slate-800">{customer.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gateway Metadata */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Gateway Metadata
              </h4>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-slate-900">
                    {METHOD_LABELS[txn.payment_method || txn.paymentMethod || 'CARD'] || 'Card'}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500">Currency</span>
                  <span className="font-mono font-semibold text-slate-900">{txn.currency || 'INR'}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-500">Created Timestamp</span>
                  <span className="text-slate-700">{fmtDateTime(txn.created_at || txn.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Failure Reason */}
            {(txn.failure_reason || txn.failureReason) && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-1 text-xs">
                <p className="font-bold text-red-900 uppercase tracking-wider text-[11px]">
                  Payment Failure Diagnostics
                </p>
                <p className="font-mono font-semibold text-red-700">
                  {txn.failure_reason || txn.failureReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Action */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          {statusStr === 'FAILED' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/recovery/${txn.recoveryCase || paymentId}`);
              }}
              className="w-full h-10 rounded-md bg-[#0c6ff9] hover:bg-[#005ad4] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <span>View in Recovery Center</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Payment settled and verified</span>
            </div>
          )}
        </div>
      </div>
    </>
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
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-4 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-[#0c6ff9] hover:border-[#0c6ff9] flex items-center gap-2 transition-all shadow-2xs"
            title="Open customer checkout portal on port 5174"
          >
            <ExternalLink size={14} className="text-[#0c6ff9]" />
            <span>Customer Store (:5174)</span>
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
