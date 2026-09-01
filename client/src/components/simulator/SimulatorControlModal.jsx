import { useState, useEffect } from 'react';
import { X, Play, Square, RefreshCw, Zap, ShieldAlert, CheckCircle2, Sliders } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';

const SCENARIOS = [
  {
    id: 'FAILURE_SPIKE',
    name: 'Failure Spike',
    description: 'Sudden high surge of payment failures (75% failure rate). Ideal for demonstrating AI revenue recovery.',
    badge: 'Recommended for Demo',
    badgeColor: 'var(--color-brand)',
  },
  {
    id: 'BANK_TIMEOUT',
    name: 'Bank Timeout Wave',
    description: 'Issuing bank outage where transactions fail with BANK_TIMEOUT (85% failure rate).',
    badge: 'High Recoverability',
    badgeColor: 'var(--color-success)',
  },
  {
    id: 'INSUFFICIENT_FUNDS',
    name: 'Insufficient Funds',
    description: 'Customers attempt payments with insufficient balance (85% failure rate). Triggers smart recovery nudges.',
    badge: 'Customer Nudge',
    badgeColor: 'var(--color-warning)',
  },
  {
    id: 'HIGH_VALUE_FAILURE',
    name: 'High-Value Failures',
    description: 'Transactions exceeding ₹50,000 fail. Tests VIP escalation and strict autonomy boundaries.',
    badge: 'VIP Escalation',
    badgeColor: 'var(--color-danger)',
  },
  {
    id: 'MIXED_RISK',
    name: 'Mixed Risk Patterns',
    description: 'Heterogeneous mix of card declines, mandate drops, timeouts, and network glitches.',
    badge: 'Stress Test',
    badgeColor: 'var(--color-brand)',
  },
  {
    id: 'NORMAL_TRAFFIC',
    name: 'Normal Traffic',
    description: 'Standard payment volume with baseline 85% success and occasional failure drops.',
    badge: 'Baseline',
    badgeColor: 'var(--color-text-muted)',
  },
];

export default function SimulatorControlModal({ isOpen, onClose }) {
  const [selectedScenario, setSelectedScenario] = useState('FAILURE_SPIKE');
  const [eventsPerMinute, setEventsPerMinute] = useState(15);
  const [status, setStatus] = useState({ running: false, scenario: 'FAILURE_SPIKE', totalEventsEmitted: 0 });
  const [loading, setLoading] = useState(false);
  const [singleEmitting, setSingleEmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await paymentApi.getSimulatorStatus();
      if (res) {
        setStatus(res);
        if (res.scenario) setSelectedScenario(res.scenario);
        if (res.eventsPerMinute) setEventsPerMinute(res.eventsPerMinute);
      }
    } catch {
      // ignore
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await paymentApi.startSimulator({
        scenario: selectedScenario,
        events_per_minute: Number(eventsPerMinute),
      });
      setStatus(res);
      setFeedback({ type: 'success', msg: `Simulation started: ${selectedScenario} at ${eventsPerMinute} events/min` });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to start simulator' });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await paymentApi.stopSimulator();
      setStatus(res);
      setFeedback({ type: 'info', msg: 'Simulation stopped' });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to stop simulator' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmitSingle = async () => {
    setSingleEmitting(true);
    try {
      await paymentApi.triggerSimulatorEvent({
        scenario: selectedScenario,
      });
      setFeedback({ type: 'success', msg: 'Single simulated payment event emitted!' });
      fetchStatus();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to emit event' });
    } finally {
      setSingleEmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-light text-brand">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Real-Time Payment Event Simulator
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Controlled Buildathon demo event stream • Real PostgreSQL, Redis & WebSocket pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--color-bg-hover)]"
          >
            <X size={15} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>

        {/* Safety Warning Banner */}
        <div
          className="px-6 py-2.5 flex items-center gap-2 text-[11px] font-medium"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
            color: 'var(--color-warning)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <ShieldAlert size={14} className="flex-shrink-0" />
          <span>SAFE TEST MODE: Simulated synthetic events only. No real bank accounts or money are touched.</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Indicator */}
          <div
            className="flex items-center justify-between p-3.5 rounded-xl"
            style={{
              backgroundColor: status.running ? 'var(--color-success-bg)' : 'var(--color-bg-muted)',
              border: `1px solid ${status.running ? 'var(--color-success)' : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${status.running ? 'bg-[var(--color-success)] animate-pulse' : 'bg-gray-400'}`}
              />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Status: {status.running ? `Running (${status.scenario})` : 'Idle'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Emitted: <strong className="font-mono-data text-[var(--color-text-primary)]">{status.totalEventsEmitted || 0}</strong></span>
              {status.running && (
                <span>Rate: <strong className="font-mono-data text-[var(--color-text-primary)]">{status.eventsPerMinute || eventsPerMinute}</strong>/min</span>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-[12px] flex items-center gap-2 ${
                feedback.type === 'error' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Scenarios Selection */}
          <div className="space-y-2">
            <label className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Choose Simulation Scenario
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SCENARIOS.map((scen) => {
                const isSelected = selectedScenario === scen.id;
                return (
                  <button
                    key={scen.id}
                    type="button"
                    onClick={() => setSelectedScenario(scen.id)}
                    className="p-3 rounded-xl text-left transition-all border cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                      borderColor: isSelected ? 'var(--color-brand)' : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {scen.name}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${scen.badgeColor}20`, color: scen.badgeColor }}
                      >
                        {scen.badge}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      {scen.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Generation Velocity
              </label>
              <span className="font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-brand)' }}>
                {eventsPerMinute} events / minute ({Math.round(60 / eventsPerMinute)}s interval)
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="60"
              step="1"
              value={eventsPerMinute}
              onChange={(e) => setEventsPerMinute(Number(e.target.value))}
              className="w-full cursor-pointer accent-[var(--color-brand)]"
            />
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              <span>2/min (Slow demo)</span>
              <span>15/min (Recommended)</span>
              <span>60/min (Stress test)</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
        >
          <button
            type="button"
            onClick={handleEmitSingle}
            disabled={singleEmitting || loading}
            className="btn-secondary text-[12px] px-3 py-2 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={singleEmitting ? 'animate-bounce' : ''} />
            <span>{singleEmitting ? 'Emitting…' : 'Trigger Single Event'}</span>
          </button>

          <div className="flex items-center gap-2">
            {status.running ? (
              <button
                type="button"
                onClick={handleStop}
                disabled={loading}
                className="btn-danger text-[12px] px-4 py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <Square size={13} />
                <span>Stop Simulator</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="btn-primary text-[12px] px-5 py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} />
                <span>Start Simulation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
