import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, ChevronRight } from 'lucide-react';
import { MOCK_RECOVERY_CASES, MOCK_CUSTOMERS } from '../../data/mockData';
import SectionHeader from '../../components/common/SectionHeader';
import SearchInput from '../../components/common/SearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import EmptyState from '../../components/common/EmptyState';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'recovered',  label: 'Recovered'  },
  { value: 'executing',  label: 'Executing'  },
  { value: 'pending',    label: 'Pending'    },
  { value: 'analyzing',  label: 'Analyzing'  },
  { value: 'failed',     label: 'Failed'     },
  { value: 'escalated',  label: 'Escalated'  },
];

const RISK_OPTIONS = [
  { value: '',       label: 'All Risk Levels' },
  { value: 'critical', label: 'Critical (85+)'  },
  { value: 'high',     label: 'High (65–84)'    },
  { value: 'medium',   label: 'Medium (45–64)'  },
  { value: 'low',      label: 'Low (<45)'        },
];

const STRATEGY_OPTIONS = [
  { value: '',                   label: 'All Strategies'      },
  { value: 'Delayed Retry',      label: 'Delayed Retry'       },
  { value: 'Recovery Email',     label: 'Recovery Email'      },
  { value: 'Alt Payment Link',   label: 'Alt Payment Link'    },
  { value: 'SMS Nudge + UPI',    label: 'SMS Nudge + UPI'     },
  { value: 'Manual Review',      label: 'Manual Review'       },
  { value: 'Re-mandate Request', label: 'Re-mandate Request'  },
];

const HEADERS = ['Case', 'Customer', 'Amount', 'Root Cause', 'Risk', 'Strategy', 'Status', 'Created', ''];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;
  if (diffH < 24) return diffH < 1 ? 'Just now' : `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function riskBand(score) {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export default function RecoveryCases() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [riskF, setRiskF]       = useState('');
  const [strategyF, setStrategyF] = useState('');

  const filtered = useMemo(() => {
    return MOCK_RECOVERY_CASES.filter(c => {
      const customer = MOCK_CUSTOMERS.find(cu => cu.id === c.customerId);
      const searchMatch = !search ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.rootCause?.toLowerCase().includes(search.toLowerCase());
      const statusMatch  = !statusF   || c.status === statusF;
      const riskMatch    = !riskF     || riskBand(c.riskScore) === riskF;
      const stratMatch   = !strategyF || c.strategy === strategyF;
      return searchMatch && statusMatch && riskMatch && stratMatch;
    });
  }, [search, statusF, riskF, strategyF]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5 animate-fade-in">
      <SectionHeader
        title="Recovery Cases"
        subtitle="Monitor and manage revenue recovery opportunities."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search cases, customers…"
          className="w-full sm:w-64"
        />
        <FilterDropdown value={statusF}   onChange={setStatusF}   options={STATUS_OPTIONS}   className="w-40" />
        <FilterDropdown value={riskF}     onChange={setRiskF}     options={RISK_OPTIONS}     className="w-44" />
        <FilterDropdown value={strategyF} onChange={setStrategyF} options={STRATEGY_OPTIONS} className="w-48" />
        {(search || statusF || riskF || strategyF) && (
          <button
            className="btn-ghost text-[12px]"
            onClick={() => { setSearch(''); setStatusF(''); setRiskF(''); setStrategyF(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        {filtered.length} case{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<RefreshCcw size={20} style={{ color: 'var(--color-text-muted)' }} />}
            title="No recovery cases found"
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const customer = MOCK_CUSTOMERS.find(cu => cu.id === c.customerId);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/recovery/${c.id}`)}
                      className="cursor-pointer transition-colors duration-100"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono-data text-[12px] font-bold" style={{ color: 'var(--color-brand)' }}>
                          {c.id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {customer?.name ?? '—'}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {customer?.email ?? ''}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          ₹{c.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="text-[12px] font-mono-data font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)' }}
                        >
                          {c.rootCause}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge score={c.riskScore} />
                      </td>
                      <td className="px-5 py-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {c.strategy}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 text-[12px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtDate(c.createdAt)}
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
    </div>
  );
}
