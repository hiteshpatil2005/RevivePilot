import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ChevronRight, X } from 'lucide-react';
import { MOCK_TRANSACTIONS, MOCK_CUSTOMERS, MOCK_RECOVERY_CASES } from '../../data/mockData';
import SectionHeader from '../../components/common/SectionHeader';
import SearchInput from '../../components/common/SearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const METHOD_LABELS = {
  CARD:        'Card',
  UPI:         'UPI',
  NET_BANKING: 'Net Banking',
  WALLET:      'Wallet',
};

const STATUS_OPTS = [
  { value: '',         label: 'All Statuses' },
  { value: 'success',  label: 'Success'  },
  { value: 'failed',   label: 'Failed'   },
  { value: 'pending',  label: 'Pending'  },
  { value: 'refunded', label: 'Refunded' },
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
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function TransactionDrawer({ txn, onClose, navigate }) {
  if (!txn) return null;
  const customer = MOCK_CUSTOMERS.find(c => c.id === txn.customerId);
  const relatedCase = txn.recoveryCase
    ? MOCK_RECOVERY_CASES.find(c => c.id === txn.recoveryCase)
    : null;

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
              {txn.id}
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
              <p className="text-[22px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
                ₹{txn.amount.toLocaleString('en-IN')}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {METHOD_LABELS[txn.method] ?? txn.method}
              </p>
            </div>
            <StatusBadge status={txn.status} />
          </div>

          {/* Details */}
          <div className="space-y-0">
            {[
              { label: 'Payment ID',   value: txn.id                          },
              { label: 'Customer',     value: customer?.name ?? '—'           },
              { label: 'Email',        value: customer?.email ?? '—'          },
              { label: 'Method',       value: METHOD_LABELS[txn.method] ?? txn.method },
              { label: 'Status',       value: <StatusBadge status={txn.status} size="sm" /> },
              { label: 'Created',      value: fmtDateTime(txn.createdAt)      },
            ].map(d => (
              <div
                key={d.label}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{d.label}</span>
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{d.value}</span>
              </div>
            ))}
            {txn.failureReason && (
              <div
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Failure Reason</span>
                <span
                  className="text-[11px] font-mono-data font-semibold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                  }}
                >
                  {txn.failureReason}
                </span>
              </div>
            )}
          </div>

          {/* Recovery Case Link */}
          {relatedCase && (
            <div
              className="p-4 rounded-xl"
              style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Recovery Case
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-brand)' }}>
                    {relatedCase.id}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {relatedCase.strategy} · {relatedCase.strategyRecoveryProbability}% probability
                  </p>
                </div>
                <StatusBadge status={relatedCase.status} size="sm" />
              </div>
              <button
                onClick={() => { navigate(`/recovery/${relatedCase.id}`); onClose(); }}
                className="btn-primary mt-3 text-[12px]"
                style={{ padding: '8px 14px' }}
              >
                Open Recovery Case
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const HEADERS = ['Payment ID', 'Customer', 'Amount', 'Method', 'Status', 'Failure Reason', 'Created'];

export default function Transactions() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [statusF, setStatusF] = useState('');
  const [methodF, setMethodF] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filtered = useMemo(() => {
    return MOCK_TRANSACTIONS.filter(t => {
      const customer = MOCK_CUSTOMERS.find(c => c.id === t.customerId);
      const sm = !search ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.failureReason?.toLowerCase().includes(search.toLowerCase());
      const stm = !statusF || t.status === statusF;
      const mth = !methodF || t.method === methodF;
      return sm && stm && mth;
    });
  }, [search, statusF, methodF]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5 animate-fade-in">
      <SectionHeader
        title="Transactions"
        subtitle="Monitor payment activity and revenue outcomes."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search payments, customers…"
          className="w-full sm:w-64"
        />
        <FilterDropdown value={statusF} onChange={setStatusF} options={STATUS_OPTS} className="w-40" />
        <FilterDropdown value={methodF} onChange={setMethodF} options={METHOD_OPTS} className="w-40" />
        {(search || statusF || methodF) && (
          <button
            className="btn-ghost text-[12px]"
            onClick={() => { setSearch(''); setStatusF(''); setMethodF(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
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
                {filtered.map((txn, i) => {
                  const customer = MOCK_CUSTOMERS.find(c => c.id === txn.customerId);
                  return (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedTxn(txn)}
                      className="cursor-pointer transition-colors duration-100"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td className="px-5 py-4 font-mono-data text-[12px] font-semibold" style={{ color: 'var(--color-brand)' }}>
                        {txn.id}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {customer?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{txn.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {METHOD_LABELS[txn.method] ?? txn.method}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-4">
                        {txn.failureReason ? (
                          <span
                            className="text-[11px] font-mono-data font-semibold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-danger-bg)',
                              color: 'var(--color-danger)',
                            }}
                          >
                            {txn.failureReason}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[12px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDateTime(txn.createdAt)}
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
