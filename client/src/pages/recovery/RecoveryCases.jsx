import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCcw, ChevronRight, ExternalLink, Filter, Search, X
} from 'lucide-react';
import { useRecoveryCases } from '../../hooks/useRecoveryCases';
import { MOCK_CUSTOMERS } from '../../data/mockData';
import SearchInput from '../../components/common/SearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'recovered',  label: 'Recovered'  },
  { value: 'executing',  label: 'Executing'  },
  { value: 'action_required', label: 'Action Required' },
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

const HEADERS = ['Case ID', 'Customer Profile', 'Payment Value', 'Root Cause Diagnosis', 'Risk Score', 'Assigned AI Strategy', 'Lifecycle Status', 'Detected At', ''];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;
  if (diffH < 24) return diffH < 1 ? 'Just now' : `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function riskBand(score) {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export default function RecoveryCases() {
  const navigate = useNavigate();
  const { cases, loading, refresh } = useRecoveryCases();

  const [search, setSearch]       = useState('');
  const [statusF, setStatusF]     = useState('');
  const [riskF, setRiskF]         = useState('');
  const [strategyF, setStrategyF] = useState('');

  const filtered = useMemo(() => {
    return (cases || []).filter((c) => {
      const customer = MOCK_CUSTOMERS.find((cu) => cu.id === c.customerId);
      const searchMatch =
        !search ||
        c.id?.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.rootCause?.toLowerCase().includes(search.toLowerCase());
      const statusMatch  = !statusF   || c.status === statusF;
      const riskMatch    = !riskF     || riskBand(c.riskScore) === riskF;
      const stratMatch   = !strategyF || c.strategy === strategyF;
      return searchMatch && statusMatch && riskMatch && stratMatch;
    });
  }, [cases, search, statusF, riskF, strategyF]);

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-6 mx-auto animate-fade-in text-slate-900 font-sans">
      {/* ── Enterprise Header (No Simulation Buttons) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Recovery Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0c6ff9] border border-blue-200">
              Autonomous Queue
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time tracking of failed payment interventions, policy guardrails, and automated recovery executions
          </p>
        </div>

        {/* Clean Production Action Toolbar */}
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
            onClick={refresh}
            className="h-9 px-3.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Refresh recovery cases"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
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
              onChange={setSearch}
              placeholder="Search case ID, customer, root cause..."
            />
          </div>
          <FilterDropdown value={statusF}   onChange={setStatusF}   options={STATUS_OPTIONS}   className="w-44" />
          <FilterDropdown value={riskF}     onChange={setRiskF}     options={RISK_OPTIONS}     className="w-44" />
          <FilterDropdown value={strategyF} onChange={setStrategyF} options={STRATEGY_OPTIONS} className="w-48" />

          {(search || statusF || riskF || strategyF) && (
            <button
              type="button"
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-red-50 cursor-pointer transition-colors"
              onClick={() => { setSearch(''); setStatusF(''); setRiskF(''); setStrategyF(''); }}
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-slate-900">{filtered.length}</strong> active cases
        </div>
      </div>

      {/* ── Expanded Data Table Card (Pure White, Comfortable Spacing) ── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
          <SkeletonLoader.Table rows={8} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={<RefreshCcw size={24} className="text-slate-400" />}
                title="No recovery cases match your query"
                subtitle="Try resetting active filters or adjusting the search term."
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
                  {filtered.map((c) => {
                    const cust = c.customer || MOCK_CUSTOMERS.find((cu) => cu.id === c.customerId) || {};
                    const custName = cust.name || c.customerName || 'Customer';
                    const custEmail = cust.email || c.customerEmail || '—';

                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/recovery/${c.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors bg-white group"
                      >
                        {/* Case ID */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0c6ff9] text-sm group-hover:underline">
                              {c.id}
                            </span>
                            {c.isLive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Live event active" />
                            )}
                          </div>
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
                            ₹{c.amount.toLocaleString('en-IN')}.00
                          </span>
                        </td>

                        {/* Root Cause */}
                        <td className="px-6 py-4.5">
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {c.rootCause}
                          </span>
                        </td>

                        {/* Risk Band */}
                        <td className="px-6 py-4.5">
                          <RiskBadge score={c.riskScore} />
                        </td>

                        {/* Strategy */}
                        <td className="px-6 py-4.5 text-slate-800 font-medium">
                          {c.strategy}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4.5">
                          <StatusBadge status={c.status} />
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-4.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {fmtDate(c.createdAt)}
                        </td>

                        {/* Action Chevron */}
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
        </div>
      )}
    </div>
  );
}
