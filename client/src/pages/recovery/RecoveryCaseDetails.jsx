import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  User, CreditCard, TrendingUp,
} from 'lucide-react';
import {
  MOCK_RECOVERY_CASES, MOCK_CUSTOMERS, MOCK_TRANSACTIONS,
} from '../../data/mockData';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import AIRecoveryTimeline from '../../components/recovery/AIRecoveryTimeline';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-[12px] font-medium text-right" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

function PolicyCheck({ check }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2">
        {check.passed
          ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
          : <XCircle size={14} style={{ color: 'var(--color-danger)' }} />
        }
        <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{check.label}</span>
      </div>
      <span
        className="text-[11px] font-mono-data font-semibold"
        style={{ color: check.passed ? 'var(--color-success)' : 'var(--color-danger)' }}
      >
        {check.value}
      </span>
    </div>
  );
}

export default function RecoveryCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const caseData = MOCK_RECOVERY_CASES.find(c => c.id === caseId);

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12">
        <AlertTriangle size={32} style={{ color: 'var(--color-warning)' }} className="mb-4" />
        <p className="text-[16px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Recovery case not found
        </p>
        <p className="text-[13px] mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Case ID: {caseId}
        </p>
        <button className="btn-ghost" onClick={() => navigate('/recovery')}>
          ← Back to Recovery Cases
        </button>
      </div>
    );
  }

  const customer = MOCK_CUSTOMERS.find(c => c.id === caseData.customerId);
  const txn = MOCK_TRANSACTIONS.find(t => t.id === caseData.paymentId);

  const fmtDate = iso => iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/recovery')}
          className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer transition-colors duration-100"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <ArrowLeft size={14} />
          Recovery Cases
        </button>
        <span style={{ color: 'var(--color-border-strong)' }}>/</span>
        <span className="text-[13px] font-semibold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
          {caseData.id}
        </span>
      </div>

      {/* Case Header Card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Recovery Case
            </p>
            <h2 className="text-[24px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
              {caseData.id}
            </h2>
            <p className="text-[15px] mt-1 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {customer?.name ?? '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={caseData.status} />
            <p className="text-[28px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
              ₹{caseData.amount.toLocaleString('en-IN')}
            </p>
            <RiskBadge score={caseData.riskScore} />
          </div>
        </div>

        {/* Quick details strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {[
            { label: 'Payment ID',   value: caseData.paymentId },
            { label: 'Customer',     value: customer?.name ?? '—' },
            { label: 'Created',      value: fmtDate(caseData.createdAt) },
            { label: 'Resolved',     value: fmtDate(caseData.resolvedAt) },
          ].map(d => (
            <div key={d.label}>
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{d.label}</p>
              <p className="text-[12px] font-medium font-mono-data" style={{ color: 'var(--color-text-primary)' }}>{d.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left col: Timeline */}
        <div className="xl:col-span-1">
          <AIRecoveryTimeline timeline={caseData.timeline} />
        </div>

        {/* Right col: Decision cards */}
        <div className="xl:col-span-2 space-y-5">
          {/* Row 1: Root Cause + Strategy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Root Cause Analysis */}
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Root Cause Analysis
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Primary Cause</p>
                  <span
                    className="text-[15px] font-bold font-mono-data"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    {caseData.rootCause}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Confidence</span>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {caseData.rootCauseConfidence}%
                  </span>
                </div>
                <div className="flex items-start justify-between py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Category</span>
                  <span className="text-[12px] font-medium text-right max-w-[60%]" style={{ color: 'var(--color-text-primary)' }}>
                    {caseData.rootCauseCategory}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Strategy Recommendation */}
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                AI Recommendation
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Strategy</p>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--color-brand)' }}>
                    {caseData.strategy}
                  </p>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Recovery Probability</span>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--color-success)' }}>
                    {caseData.strategyRecoveryProbability}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Expected Recovery</span>
                  <span className="text-[13px] font-semibold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
                    ₹{caseData.expectedRecovery.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Policy Decision + Recovery Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Policy Decision */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  Policy Decision
                </p>
                {caseData.policyPassed === true && (
                  <span className="badge badge-success">Approved</span>
                )}
                {caseData.policyPassed === false && (
                  <span className="badge badge-danger">Blocked</span>
                )}
                {caseData.policyPassed === null && (
                  <span className="badge badge-warning">Pending</span>
                )}
              </div>

              {caseData.policyChecks.length > 0 ? (
                <div className="space-y-0">
                  {caseData.policyChecks.map(ch => (
                    <PolicyCheck key={ch.label} check={ch} />
                  ))}
                </div>
              ) : (
                <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                  Policy evaluation pending…
                </p>
              )}

              {caseData.policyPassed === false && (
                <div
                  className="mt-4 p-3 rounded-lg text-[12px]"
                  style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                >
                  <strong>Action Blocked.</strong> Maximum retry limit reached for this case.
                </div>
              )}
            </div>

            {/* Recovery Outcome / Action */}
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Recovery Outcome
              </p>
              {caseData.status === 'recovered' ? (
                <div className="space-y-3">
                  <div
                    className="flex flex-col items-center py-4 rounded-xl"
                    style={{ backgroundColor: 'var(--color-success-bg)' }}
                  >
                    <CheckCircle2 size={28} style={{ color: 'var(--color-success)' }} className="mb-2" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-success)' }}>
                      Recovery Successful
                    </p>
                    <p className="text-[22px] font-bold font-mono-data mt-1" style={{ color: 'var(--color-success)' }}>
                      ₹{caseData.actualRecovered?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <DetailRow label="Recovery Time" value={`${caseData.recoveryTime}s`} />
                  <DetailRow label="Attempts Used" value={`${caseData.attempts} / ${caseData.maxAttempts}`} />
                  <DetailRow label="Efficiency" value={`${Math.round((caseData.actualRecovered / caseData.amount) * 100)}%`} />
                </div>
              ) : caseData.status === 'failed' ? (
                <div>
                  <div
                    className="flex flex-col items-center py-4 rounded-xl mb-3"
                    style={{ backgroundColor: 'var(--color-danger-bg)' }}
                  >
                    <XCircle size={28} style={{ color: 'var(--color-danger)' }} className="mb-2" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>
                      Recovery Failed
                    </p>
                  </div>
                  <DetailRow label="Attempts Used" value={`${caseData.attempts} / ${caseData.maxAttempts}`} />
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <div className="animate-pulse-live">
                    <TrendingUp size={28} style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <p className="text-[13px] font-medium mt-3" style={{ color: 'var(--color-text-primary)' }}>
                    Recovery in progress
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Attempt {caseData.attempts} of {caseData.maxAttempts}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Context */}
          {customer && (
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Customer Context
              </p>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
                >
                  {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {customer.name}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                {[
                  { label: 'Total Payments', value: customer.totalPayments },
                  { label: 'Success Rate',   value: `${customer.successRate}%` },
                  { label: 'Failed',         value: customer.failedPayments },
                  { label: 'Lifetime Value', value: `₹${(customer.lifetimeValue / 100).toLocaleString('en-IN')}` },
                ].map(d => (
                  <div key={d.label}>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{d.label}</p>
                    <p className="text-[14px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
