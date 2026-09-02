import { useState, useEffect } from 'react';
import {
  ShieldCheck, RefreshCcw, DollarSign, User, Clock,
  AlertTriangle, Timer, Repeat, FileText, CheckCircle2,
  XCircle, AlertCircle, ChevronRight, Save, ToggleLeft,
  ToggleRight, Info, Zap,
} from 'lucide-react';
import { usePolicies } from '../../hooks/usePolicies';
import {
  MOCK_POLICY_OVERVIEW,
  MOCK_POLICY_CATEGORIES,
  DEFAULT_RETRY_POLICY,
  MOCK_STOPPING_RULES,
  MOCK_ESCALATION_RULES,
} from '../../data/mockData';

// ── Formatters ────────────────────────────────────────────────────────────────
const LS_KEY = 'revivepilot-retry-policy';

// ── Card wrapper ──────────────────────────────────────────────────────────────
function SectionCard({ children, className = '', style = {} }) {
  return <div className={`card p-6 ${className}`} style={style}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{children}</h2>
      {sub && <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer"
      style={{ background: 'none', border: 'none', padding: 0 }}
      aria-pressed={checked}
    >
      {checked
        ? <ToggleRight size={22} style={{ color: 'var(--color-success)' }} />
        : <ToggleLeft size={22} style={{ color: 'var(--color-text-muted)' }} />
      }
      {label && <span className="text-[13px] font-medium" style={{ color: checked ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
        {checked ? 'ON' : 'OFF'}
      </span>}
    </button>
  );
}

// ── Category Icon Map ─────────────────────────────────────────────────────────
const ICON_MAP = {
  RefreshCcw, DollarSign, UserShield: User, Clock,
  AlertTriangle, Timer, Repeat, FileText,
};

// ── Policy Category Card ──────────────────────────────────────────────────────
function PolicyCategoryCard({ policy, active, onClick }) {
  const Icon = ICON_MAP[policy.icon] || ShieldCheck;
  return (
    <button
      onClick={() => onClick(policy.id)}
      className="card p-4 text-left w-full cursor-pointer transition-all duration-150"
      style={{
        borderColor: active ? 'var(--color-brand)' : 'var(--color-border)',
        backgroundColor: active ? 'var(--color-bg-active)' : 'var(--color-bg-card)',
        borderWidth: active ? '2px' : '1px',
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
          style={{ backgroundColor: active ? 'var(--color-brand-light)' : 'var(--color-bg-muted)' }}
        >
          <Icon size={16} style={{ color: active ? 'var(--color-brand)' : 'var(--color-text-muted)' }} />
        </div>
        <span
          className="badge"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontSize: '10px',
          }}
        >
          {policy.status}
        </span>
      </div>
      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {policy.label}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {policy.rules} rules
        </span>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          Updated {policy.updatedAt}
        </span>
      </div>
    </button>
  );
}

// ── Retry Policy Editor ───────────────────────────────────────────────────────
function RetryPolicyEditor() {
  const [policy, setPolicy] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_RETRY_POLICY;
    } catch {
      return DEFAULT_RETRY_POLICY;
    }
  });
  const [saved, setSaved] = useState(false);

  const update = (field, value) => setPolicy(p => ({ ...p, [field]: value }));

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(policy));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SectionCard>
      <SectionTitle sub="Configure automatic retry behavior for failed payments">
        Retry Policy
      </SectionTitle>

      <div className="space-y-5">
        {/* Max retry attempts */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>Maximum retry attempts</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>How many times to retry before stopping</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => update('maxRetryAttempts', Math.max(1, policy.maxRetryAttempts - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            >−</button>
            <span className="w-10 text-center text-[16px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
              {policy.maxRetryAttempts}
            </span>
            <button
              onClick={() => update('maxRetryAttempts', Math.min(10, policy.maxRetryAttempts + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
            >+</button>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        {/* Cooldown */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>Cooldown between attempts</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Minimum wait time between retries</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={policy.cooldownMinutes}
              onChange={e => update('cooldownMinutes', Number(e.target.value))}
              className="input-base"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
            >
              {[5, 10, 15, 30, 60, 120, 360, 720].map(m => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60}h`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        {/* Max amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>Maximum retry amount</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Auto-retry only below this amount</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>₹</span>
            <input
              type="number"
              value={policy.maxRetryAmountINR}
              onChange={e => update('maxRetryAmountINR', Number(e.target.value))}
              className="input-base font-mono-data"
              style={{ width: '110px', textAlign: 'right', fontSize: '14px', padding: '6px 10px' }}
            />
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        {/* Auto retry toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>Allow automatic retry</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>AI can execute retries without manual approval</p>
          </div>
          <Toggle checked={policy.allowAutoRetry} onChange={v => update('allowAutoRetry', v)} label />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          <Save size={14} />
          {saved ? 'Changes Saved' : 'Save Changes'}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Amount Limit Policy ───────────────────────────────────────────────────────
function AmountLimitPolicy() {
  const [limit, setLimit] = useState(50000);
  const [action, setAction] = useState('require_approval');
  const [saved, setSaved] = useState(false);

  const options = [
    { id: 'require_approval', label: 'Require manual approval', desc: 'Hold recovery action until merchant approves' },
    { id: 'escalate',         label: 'Escalate to review queue', desc: 'Add to escalation queue for manual review' },
    { id: 'block',            label: 'Block action entirely', desc: 'Stop recovery — no automatic action taken' },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SectionCard>
      <SectionTitle sub="What happens when recovery amount exceeds the limit?">
        Amount Limit Policy
      </SectionTitle>

      <div className="space-y-5">
        <div>
          <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Maximum automatic recovery amount
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>₹</span>
            <input
              type="number"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="input-base font-mono-data text-[18px] font-bold"
              style={{ maxWidth: '160px' }}
            />
          </div>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        <div>
          <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
            If the transaction exceeds this amount:
          </p>
          <div className="space-y-2">
            {options.map(opt => (
              <label
                key={opt.id}
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: `1px solid ${action === opt.id ? 'var(--color-brand)' : 'var(--color-border)'}`,
                  backgroundColor: action === opt.id ? 'var(--color-bg-active)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="amount_action"
                  value={opt.id}
                  checked={action === opt.id}
                  onChange={() => setAction(opt.id)}
                  style={{ marginTop: '2px', accentColor: 'var(--color-brand)' }}
                />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ width: '100%' }}>
          <Save size={14} />
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Stopping Rules ────────────────────────────────────────────────────────────
function StoppingRules() {
  const [rules, setRules] = useState(MOCK_STOPPING_RULES);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => setRules(prev =>
    prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SectionCard>
      <SectionTitle sub="Conditions under which RevivePilot automatically stops recovery">
        Stopping Rules
      </SectionTitle>

      <div className="space-y-2 mb-5">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: rule.enabled ? 'var(--color-bg-muted)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={15} style={{ color: rule.enabled ? 'var(--color-success)' : 'var(--color-text-muted)', flexShrink: 0 }} />
              <span className="text-[13px]" style={{ color: rule.enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {rule.label}
              </span>
            </div>
            <Toggle checked={rule.enabled} onChange={() => toggle(rule.id)} />
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-3 mb-4"
        style={{ backgroundColor: 'var(--color-brand-light)', border: '1px solid var(--color-brand)' + '40' }}
      >
        <p className="text-[12px]" style={{ color: 'var(--color-brand)' }}>
          <strong>Bounded Autonomy:</strong> Stopping rules prevent unbounded AI behavior. RevivePilot always stops when conditions are met.
        </p>
      </div>

      <button onClick={handleSave} className="btn-primary" style={{ width: '100%' }}>
        <Save size={14} />
        {saved ? 'Saved' : 'Save Stopping Rules'}
      </button>
    </SectionCard>
  );
}

// ── Escalation Rules ──────────────────────────────────────────────────────────
function EscalationRules() {
  const [rules, setRules] = useState(MOCK_ESCALATION_RULES);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => setRules(prev =>
    prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SectionCard>
      <SectionTitle sub="When should RevivePilot escalate to manual review?">
        Escalation Rules
      </SectionTitle>

      <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Escalate when:
      </p>

      <div className="space-y-2 mb-5">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{
              border: `1px solid ${rule.enabled ? 'var(--color-warning)' : 'var(--color-border)'}`,
              backgroundColor: rule.enabled ? 'var(--color-warning-bg)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={14} style={{ color: rule.enabled ? 'var(--color-warning)' : 'var(--color-text-muted)', flexShrink: 0 }} />
              <span className="text-[13px]" style={{ color: rule.enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {rule.label}
              </span>
            </div>
            <Toggle checked={rule.enabled} onChange={() => toggle(rule.id)} />
          </div>
        ))}
      </div>

      <button onClick={handleSave} className="btn-primary" style={{ width: '100%' }}>
        <Save size={14} />
        {saved ? 'Saved' : 'Save Escalation Rules'}
      </button>
    </SectionCard>
  );
}

// ── Policy Simulator ──────────────────────────────────────────────────────────
function PolicySimulator() {
  const [inputs, setInputs] = useState({ amount: 25000, retryCount: 1, aiConfidence: 94, recoveryProbability: 91 });
  const [result, setResult] = useState(null);

  const update = (field, value) => setInputs(p => ({ ...p, [field]: value }));

  const simulate = () => {
    const { amount, retryCount, aiConfidence, recoveryProbability } = inputs;
    const checks = [
      { label: 'Amount', value: `₹${amount.toLocaleString('en-IN')}`, pass: amount <= 50000, note: amount <= 50000 ? 'Within ₹50,000 limit' : 'Exceeds ₹50,000 limit' },
      { label: 'Retry count', value: `${retryCount}/3`, pass: retryCount < 3, note: retryCount < 3 ? 'Under maximum' : 'Maximum retries reached' },
      { label: 'AI confidence', value: `${aiConfidence}%`, pass: aiConfidence >= 70, note: aiConfidence >= 70 ? 'Above 70% threshold' : 'Below 70% threshold' },
      { label: 'Recovery probability', value: `${recoveryProbability}%`, pass: recoveryProbability >= 40, note: recoveryProbability >= 40 ? 'Above 40% threshold' : 'Below 40% threshold' },
    ];

    const blockedChecks = checks.filter(c => !c.pass);
    let decision, type;

    if (blockedChecks.length === 0) {
      decision = 'AUTOMATIC ACTION APPROVED';
      type = 'approved';
    } else if (amount > 50000 && blockedChecks.length === 1) {
      decision = 'MANUAL APPROVAL REQUIRED';
      type = 'manual';
    } else {
      decision = 'ACTION BLOCKED';
      type = 'blocked';
    }

    setResult({ checks, decision, type, blockedChecks });
  };

  const decisionStyle = {
    approved: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success)', icon: CheckCircle2 },
    manual:   { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning)', icon: AlertCircle },
    blocked:  { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  border: 'var(--color-danger)',  icon: XCircle },
  };

  return (
    <SectionCard>
      <SectionTitle sub="Test policy decisions before deployment">
        Policy Decision Preview
      </SectionTitle>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { key: 'amount', label: 'Amount (₹)', type: 'number', min: 100, max: 500000 },
          { key: 'retryCount', label: 'Retry Count', type: 'number', min: 0, max: 10 },
          { key: 'aiConfidence', label: 'AI Confidence (%)', type: 'number', min: 0, max: 100 },
          { key: 'recoveryProbability', label: 'Recovery Probability (%)', type: 'number', min: 0, max: 100 },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={inputs[field.key]}
              min={field.min}
              max={field.max}
              onChange={e => update(field.key, Number(e.target.value))}
              className="input-base font-mono-data"
              style={{ fontSize: '14px' }}
            />
          </div>
        ))}
      </div>

      <button onClick={simulate} className="btn-primary mb-5">
        <Zap size={14} />
        Simulate Policy Decision
      </button>

      {result && (
        <div className="animate-fade-in">
          {/* Decision banner */}
          {(() => {
            const s = decisionStyle[result.type];
            const Icon = s.icon;
            return (
              <div
                className="flex items-center gap-3 p-4 rounded-xl mb-4"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.border}40` }}
              >
                <Icon size={20} style={{ color: s.color, flexShrink: 0 }} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: s.color, opacity: 0.7 }}>
                    Policy Result
                  </p>
                  <p className="text-[15px] font-bold" style={{ color: s.color }}>
                    {result.decision}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Check breakdown */}
          <div>
            <p className="text-[12px] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Why was this decision made?
            </p>
            <div className="space-y-1.5">
              {result.checks.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ backgroundColor: c.pass ? 'var(--color-success-bg)' : 'var(--color-danger-bg)' }}
                >
                  <div className="flex items-center gap-2">
                    {c.pass
                      ? <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                      : <XCircle size={13} style={{ color: 'var(--color-danger)' }} />
                    }
                    <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {c.label}: {c.value}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: c.pass ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {c.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Policies Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Policies() {
  const [activeCategory, setActiveCategory] = useState('retry');
  const {
    policies,
    loading,
    saving,
    updateRetry,
    updateAmount,
    updateStopping,
    updateEscalation,
    evaluate,
  } = usePolicies();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Policy Center
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Control how RevivePilot's AI agents can act on revenue recovery cases.
          </p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
          <ShieldCheck size={15} />
          Create Policy
        </button>
      </div>

      {/* ── Bounded Autonomy Banner ────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand)18, var(--color-brand)08)',
          border: '1px solid var(--color-brand)30',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-brand-light)' }}
          >
            <ShieldCheck size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Bounded Autonomy
            </p>
            <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              AI actions are always evaluated against your merchant policies before execution.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'AI recommends.', color: 'var(--color-info)' },
                { label: 'Policies authorize.', color: 'var(--color-warning)' },
                { label: 'Actions execute.', color: 'var(--color-success)' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
                  <span
                    className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Policy Overview Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Policies',    value: MOCK_POLICY_OVERVIEW.activePolicies,    color: 'var(--color-success)', icon: CheckCircle2 },
          { label: 'Actions Restricted', value: MOCK_POLICY_OVERVIEW.actionsRestricted, color: 'var(--color-warning)', icon: AlertCircle },
          { label: 'Pending Review',     value: MOCK_POLICY_OVERVIEW.pendingReview,     color: 'var(--color-info)',    icon: Info },
          { label: 'Violations Today',   value: MOCK_POLICY_OVERVIEW.violationsToday,   color: 'var(--color-success)', icon: ShieldCheck },
        ].map((m, idx) => (
          <div key={idx} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {m.label}
              </p>
              <m.icon size={14} style={{ color: m.color }} />
            </div>
            <p className="text-[28px] font-bold font-mono-data" style={{ color: m.color }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Policy Categories ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Policy Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {MOCK_POLICY_CATEGORIES.map(cat => (
            <PolicyCategoryCard
              key={cat.id}
              policy={cat}
              active={activeCategory === cat.id}
              onClick={setActiveCategory}
            />
          ))}
        </div>
      </div>

      {/* ── Editors & Simulator ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RetryPolicyEditor />
        <AmountLimitPolicy />
        <StoppingRules />
        <EscalationRules />
      </div>

      {/* Policy Simulator — full width */}
      <PolicySimulator />
    </div>
  );
}
