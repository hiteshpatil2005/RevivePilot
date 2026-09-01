import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, ShieldAlert, CheckCircle2, XCircle, ArrowRight,
  RefreshCcw, AlertTriangle, Play, Sparkles, User, DollarSign, Info, Sliders, Webhook,
} from 'lucide-react';
import { paymentApi, TEST_SCENARIOS } from '../../services/paymentApi';
import { recoveryApi } from '../../services/recoveryApi';
import { MOCK_CUSTOMERS } from '../../data/mockData';
import { useRealtimeContext } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import TestModeBanner from '../../components/common/TestModeBanner';
import SimulatorControlModal from '../../components/simulator/SimulatorControlModal';

const AMOUNT_PRESETS = [5000, 15000, 25000, 45000, 85000];

export default function TestPayment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { triggerDemoEvent } = useRealtimeContext();

  const [customerId, setCustomerId] = useState(MOCK_CUSTOMERS[0].id);
  const [amount, setAmount] = useState(25000);
  const [scenario, setScenario] = useState('BANK_TIMEOUT');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId) || MOCK_CUSTOMERS[0];
  const activeScenario = TEST_SCENARIOS.find((s) => s.id === scenario);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // 1. Call Payment API (FastAPI backend or demo fallback)
      const res = await paymentApi.createTestPayment({
        customerId,
        amount: amount * 100, // in paise
        scenario,
        description: `Test transaction (${scenario}) for ${selectedCustomer.name}`,
      });

      setResult(res);

      // 2. Broadcast events into the real-time event pipeline for instantaneous UI sync
      if (scenario === 'SUCCESS') {
        toast.success(`Test payment of ₹${amount.toLocaleString('en-IN')} succeeded!`);
      } else {
        toast.warning(
          `Payment failed (${scenario}). Recovery Case ${res.caseId} created automatically.`
        );

        // Inject simulated pipeline steps for real-time demonstration
        triggerDemoEvent({
          type: 'PAYMENT_FAILED',
          caseId: res.caseId,
          data: {
            amount: amount * 100,
            failureCode: scenario,
            detail: `₹${amount.toLocaleString('en-IN')} payment failed (${scenario}) — Case ${res.caseId} generated`,
          },
        });

        setTimeout(() => {
          triggerDemoEvent({
            type: 'RECOVERY_CASE_CREATED',
            caseId: res.caseId,
            data: {
              amount: amount * 100,
              detail: `Case ${res.caseId} created and dispatched to AI Detection Agent`,
            },
          });
        }, 600);

        setTimeout(() => {
          triggerDemoEvent({
            type: 'AGENT_STARTED',
            caseId: res.caseId,
            data: {
              agent: 'Detection Agent',
              detail: `AI Detection Agent analyzing risk profile for ${res.caseId}`,
            },
          });
        }, 1400);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to initiate test payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    try {
      setLoading(true);
      toast.info('Emitting HMAC-SHA256 signed Razorpay webhook (payment.failed)...');
      await recoveryApi.simulateWebhook({
        event_type: 'payment.failed',
        amount: Number(amount),
        failure_reason: scenario,
      });
      toast.success('Razorpay webhook verified & ingested! Real-time case created.');
    } catch (err) {
      toast.error(err.message || 'Webhook simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* ── Test Mode Notice Banner ── */}
      <TestModeBanner />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Create Test Payment
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Simulate controlled payment scenarios to observe RevivePilot’s real-time detection,
            risk classification, and autonomous recovery pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleSimulateWebhook}
            disabled={loading}
            className="btn-secondary text-[13px] px-3.5 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Webhook size={14} style={{ color: 'var(--color-warning)' }} />
            <span>Simulate Webhook</span>
          </button>
          <button
            type="button"
            onClick={() => setSimulatorOpen(true)}
            className="btn-secondary text-[13px] px-4 py-2 flex items-center gap-2 flex-shrink-0 cursor-pointer"
          >
            <Sliders size={15} style={{ color: 'var(--color-brand)' }} />
            <span>Launch Simulator</span>
          </button>
        </div>
      </div>

      <SimulatorControlModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Payment Form (2 cols) ── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <div className="card p-6 space-y-5">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              1. Customer & Amount
            </h2>

            {/* Customer select */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Target Customer
              </label>
              <div className="relative">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="input-base text-[14px]"
                >
                  {MOCK_CUSTOMERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email}) — LTV: ₹{(c.lifetimeValue || 50000).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Presets */}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Transaction Amount (INR)
              </label>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[16px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max="500000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="input-base font-mono-data text-[18px] font-bold"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2">
                {AMOUNT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className="px-3 py-1 text-[12px] rounded-lg font-medium cursor-pointer transition-colors"
                    style={{
                      backgroundColor: amount === p ? 'var(--color-brand)' : 'var(--color-bg-muted)',
                      color: amount === p ? '#ffffff' : 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    ₹{p.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            <hr style={{ borderColor: 'var(--color-border)' }} />

            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              2. Controlled Payment Scenario
            </h2>

            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEST_SCENARIOS.map((s) => {
                const isSelected = scenario === s.id;
                const isSuccess = s.id === 'SUCCESS';
                return (
                  <div
                    key={s.id}
                    onClick={() => setScenario(s.id)}
                    className="p-3.5 rounded-xl cursor-pointer transition-all border text-left"
                    style={{
                      borderColor: isSelected
                        ? isSuccess
                          ? 'var(--color-success)'
                          : 'var(--color-danger)'
                        : 'var(--color-border)',
                      backgroundColor: isSelected
                        ? isSuccess
                          ? 'var(--color-success-bg)'
                          : 'var(--color-danger-bg)'
                        : 'var(--color-bg-card)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[13px] font-bold"
                        style={{
                          color: isSelected
                            ? isSuccess
                              ? 'var(--color-success)'
                              : 'var(--color-danger)'
                            : 'var(--color-text-primary)',
                        }}
                      >
                        {s.label}
                      </span>
                      {isSelected && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: isSuccess ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        />
                      )}
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {s.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <RefreshCcw size={16} className="animate-spin-slow" />
                  <span>Processing through Gateway...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Simulate Test Payment (₹{amount.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Pipeline Preview & Results Sidebar (1 col) ── */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: 'var(--color-brand)' }} />
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Recovery Flow Expected
              </h3>
            </div>

            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              When a payment fails in <strong>{scenario}</strong>, the RevivePilot autonomous loop is triggered:
            </p>

            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-[var(--color-brand-light)] text-[var(--color-brand)] flex-shrink-0">
                  1
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <strong>Failure Ingestion:</strong> Webhook registered & Case initialized.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-[var(--color-brand-light)] text-[var(--color-brand)] flex-shrink-0">
                  2
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <strong>Agent Diagnosis:</strong> Root cause diagnosed ({scenario}).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-[var(--color-brand-light)] text-[var(--color-brand)] flex-shrink-0">
                  3
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <strong>Policy Check:</strong> Bounded autonomy & merchant limits applied.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-[var(--color-brand-light)] text-[var(--color-brand)] flex-shrink-0">
                  4
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <strong>Intervention:</strong> Dynamic smart retry scheduled.
                </span>
              </div>
            </div>
          </div>

          {/* Result card if submitted */}
          {result && (
            <div
              className="card p-5 animate-fade-in border-2 space-y-3"
              style={{
                borderColor: result.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-warning)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Result Status
                </span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: result.status === 'COMPLETED' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                    color: result.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                >
                  {result.status}
                </span>
              </div>

              <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {result.message}
              </p>

              {result.caseId && (
                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/recovery/${result.caseId}`)}
                    className="btn-primary w-full text-[13px] flex items-center justify-center gap-1.5 py-2"
                  >
                    <span>Inspect Case {result.caseId}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
