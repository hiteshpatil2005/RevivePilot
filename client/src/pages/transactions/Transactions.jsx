import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ChevronRight, X, ChevronLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import SectionHeader from '../../components/common/SectionHeader';
import SearchInput from '../../components/common/SearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/SkeletonLoader';

const METHOD_LABELS = {
  CARD:        'Card',
  UPI:         'UPI',
  NET_BANKING: 'Net Banking',
  WALLET:      'Wallet',
};

const STATUS_OPTS = [
  { value: '',         label: 'All Statuses' },
  { value: 'SUCCESS',  label: 'Success'  },
  { value: 'FAILED',   label: 'Failed'   },
  { value: 'PENDING',  label: 'Pending'  },
  { value: 'REFUNDED', label: 'Refunded' },
];

const METHOD_OPTS = [
  { value: '',           label: 'All Methods'  },
  { value: 'CARD',       label: 'Card'         },
  { value: 'UPI',        label: 'UPI'          },
  { value: 'NET_BANKING',label: 'Net Banking'  },
  { value: 'WALLET',     label: 'Wallet'       },
];

const FAILURE_COLORS = {
  BANK_TIMEOUT:       '#ef4444',
  INSUFFICIENT_FUNDS: '#f59e0b',
  CARD_DECLINED:      '#ef4444',
  NETWORK_ERROR:      '#06b6d4',
  MANDATE_FAILED:     '#8b5cf6',
  UNKNOWN:            '#94a3b8',
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function TransactionDrawer({ txn, onClose, navigate }) {
  if (!txn) return null;
  const customer = txn.customer || {};

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-sm z-50 overflow-y-auto animate-fade-in"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
          style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Transaction Details
            </p>
            <p className="font-mono-data text-[13px] font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
              {txn.external_payment_id || txn.externalPaymentId || txn.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--color-bg-hover)' }}
            aria-label="Close"
          >
            <X size={15} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount + status */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-muted)' }}
          >
            <div>
              <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Amount
              </p>
              <p className="font-mono-data text-[22px] font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                ₹{Number(txn.amount || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <StatusBadge status={txn.status} />
          </div>

          {/* Customer */}
          <div
            className="p-4 rounded-xl space-y-2.5"
            style={{ backgroundColor: 'var(--color-bg-muted)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Customer
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {customer.name || txn.customer_name || 'Customer'}
              </span>
              <span className="font-mono-data text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {customer.externalCustomerId || customer.external_customer_id || txn.customerId || '—'}
              </span>
            </div>
            {customer.email && (
              <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                {customer.email}
              </p>
            )}
            {customer.phone && (
              <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                {customer.phone}
              </p>
            )}
          </div>

          {/* Payment meta */}
          <div
            className="p-4 rounded-xl space-y-2.5"
            style={{ backgroundColor: 'var(--color-bg-muted)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Payment Information
            </p>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--color-text-secondary)' }}>Method</span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {METHOD_LABELS[txn.payment_method || txn.paymentMethod || txn.method] || (txn.payment_method || txn.method || 'CARD')}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--color-text-secondary)' }}>Currency</span>
              <span className="font-mono-data font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {txn.currency || 'INR'}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--color-text-secondary)' }}>Created</span>
              <span style={{ color: 'var(--color-text-primary)' }}>
                {fmtDateTime(txn.created_at || txn.createdAt)}
              </span>
            </div>
          </div>

          {/* Failure reason */}
          {(txn.failure_reason || txn.failureReason) && (
            <div
              className="p-4 rounded-xl space-y-1.5"
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>
                Failure Reason
              </p>
              <p className="text-[13px] font-medium" style={{ color: 'var(--color-danger)' }}>
                {txn.failure_reason || txn.failureReason}
              </p>
            </div>
          )}

          {/* Link to Recovery if failed */}
          {String(txn.status).toUpperCase() === 'FAILED' && (
            <button
              onClick={() => {
                onClose();
                navigate('/recovery');
              }}
              className="btn-primary w-full py-2.5 text-[13px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View in Recovery Center</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const HEADERS = ['Payment ID', 'Customer', 'Amount', 'Method', 'Status', 'Failure Reason', 'Created'];

export default function Transactions() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Call real backend through hook
  const { transactions, pagination, loading, error, refresh } = useTransactions({
    page,
    limit: 20,
    status: statusF ? statusF.toUpperCase() : undefined,
    search: search ? search.trim() : undefined,
  });

  // Client-side filtering by method if needed
  const displayTxns = useMemo(() => {
    if (!methodF) return transactions;
    return transactions.filter(t => {
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

  const totalPages = pagination?.pages || Math.ceil((pagination?.total || 1) / 20) || 1;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5 animate-fade-in">
      <SectionHeader
        title="Transactions"
        subtitle="Monitor real-time payment activity and PostgreSQL revenue outcomes."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search payments, customers…"
          className="w-full sm:w-64"
        />
        <FilterDropdown value={statusF} onChange={handleStatusChange} options={STATUS_OPTS} className="w-40" />
        <FilterDropdown value={methodF} onChange={handleMethodChange} options={METHOD_OPTS} className="w-40" />
        {(search || statusF || methodF) && (
          <button
            className="btn-ghost text-[12px]"
            onClick={() => { setSearch(''); setStatusF(''); setMethodF(''); setPage(1); }}
          >
            Clear filters
          </button>
        )}
        <button
          className="btn-ghost text-[12px] ml-auto flex items-center gap-1.5"
          onClick={() => refresh()}
          title="Refresh transactions"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        <p>
          {pagination?.total || displayTxns.length} transaction{(pagination?.total || displayTxns.length) !== 1 ? 's' : ''} found
        </p>
        {totalPages > 1 && (
          <p>Page {page} of {totalPages}</p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-danger)' }}>
              {error}
            </span>
          </div>
          <button onClick={() => refresh()} className="btn-secondary text-[12px] px-3 py-1.5">
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : displayTxns.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={20} style={{ color: 'var(--color-text-muted)' }} />}
            title="No transactions found"
            subtitle="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {HEADERS.map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayTxns.map((txn, i) => {
                  const custName = txn.customer?.name || txn.customer_name || 'Customer';
                  const pMethod = txn.payment_method || txn.paymentMethod || txn.method || 'CARD';
                  const fReason = txn.failure_reason || txn.failureReason;
                  const amt = Number(txn.amount || 0);

                  return (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedTxn(txn)}
                      className="cursor-pointer transition-colors duration-100"
                      style={{ borderBottom: i < displayTxns.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td className="px-5 py-4 font-mono-data text-[12px] font-semibold" style={{ color: 'var(--color-brand)' }}>
                        {txn.external_payment_id || txn.externalPaymentId || txn.id}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {custName}
                      </td>
                      <td className="px-5 py-4 font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{amt.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {METHOD_LABELS[pMethod] ?? pMethod}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-4">
                        {fReason ? (
                          <span
                            className="text-[11px] font-mono-data font-semibold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-danger-bg)',
                              color: 'var(--color-danger)',
                            }}
                          >
                            {fReason}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[12px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDateTime(txn.created_at || txn.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
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
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-card)',
            }}
          >
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-[12px] flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Page</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{page}</span>
              <span>of</span>
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalPages}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-[12px] flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTxn && (
        <TransactionDrawer
          txn={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}
