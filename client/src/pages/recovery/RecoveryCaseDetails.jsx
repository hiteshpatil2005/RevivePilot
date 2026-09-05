import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  User, CreditCard, RefreshCw, Zap, Play, ShieldCheck, Brain,
  Link2, Copy, ExternalLink, Activity, Check, Terminal, MessageSquare,
  Clock, Send, HelpCircle, ChevronRight, ThumbsUp, ThumbsDown, Calculator, Mail
} from 'lucide-react';
import { useRecoveryCaseDetails } from '../../hooks/useRecoveryCases';
import { recoveryApi } from '../../services/recoveryApi';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import AIRecoveryTimeline from '../../components/recovery/AIRecoveryTimeline';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function RecoveryCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { caseData, loading, error, refresh } = useRecoveryCaseDetails(caseId);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'agent',
      text: 'RevivePilot Agent ready. You can ask why this strategy was chosen, what facts are known or unknown, or what happens next.',
      time: 'Now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Agent executions drawer
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState([]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleAnalyze = async () => {
    try {
      setActionLoading(true);
      setActionMsg('Multi-agent engine executing root cause & dynamic strategy analysis...');
      await recoveryApi.analyzeCase(caseId);
      setActionMsg('Multi-agent analysis completed!');
      setTimeout(() => setActionMsg(null), 3500);
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Analysis failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setActionMsg('Authorizing AI recovery recommendation...');
      await recoveryApi.approveStrategy(caseId, 'Merchant authorized execution');
      setActionMsg('Strategy approved! Action Agent authorized to execute.');
      setTimeout(() => setActionMsg(null), 3500);
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Specify reason for rejecting this strategy (optional):');
    try {
      setActionLoading(true);
      setActionMsg('Rejecting recommendation & triggering Strategy Agent replanning...');
      await recoveryApi.rejectStrategy(caseId, reason || 'Merchant rejected strategy');
      setActionMsg('Strategy rejected. Strategy Agent successfully replanned!');
      setTimeout(() => setActionMsg(null), 3500);
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setActionLoading(true);
      await recoveryApi.stopCase(caseId, { reason: 'Merchant manual stop' });
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Failed to stop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setActionLoading(true);
      await recoveryApi.escalateCase(caseId, { reason: 'Merchant manual escalation' });
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Failed to escalate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setActionLoading(true);
      setActionMsg('Generating signed smart recovery link...');
      await recoveryApi.generatePaymentLink(caseId);
      setActionMsg('Smart link generated successfully (valid 24h)!');
      setTimeout(() => setActionMsg(null), 3000);
      refresh();
    } catch (err) {
      setActionMsg(err.message || 'Failed to generate link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCustomerEmail = async () => {
    try {
      setActionLoading(true);
      setActionMsg(`Agent dispatching 24-hour secure recovery link email to ${customer.email}...`);
      const res = await recoveryApi.sendCustomerEmail(caseId);
      const deliveryNote = res.delivery_mode === 'SMTP_DELIVERED' ? 'delivered via SMTP' : 'dispatched';
      setActionMsg(`Recovery email successfully ${deliveryNote} to ${res.customer_email || customer.email}! Valid for 24 hours.`);
      setTimeout(() => setActionMsg(null), 6000);
      refresh();
    } catch (err) {
      setActionMsg(err.response?.data?.detail || err.message || 'Failed to send recovery email');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendChat = async (presetText = null) => {
    const query = presetText || chatInput;
    if (!query.trim()) return;

    const userMsg = { sender: 'merchant', text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');

    try {
      setChatLoading(true);
      const res = await recoveryApi.merchantChat(caseId, query);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: res.reply,
          suggestion: res.actionable_suggestion,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: 'Unable to reach agent right now. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFetchExecutions = async () => {
    setShowExecutions(!showExecutions);
    if (!showExecutions && executions.length === 0) {
      try {
        const data = await recoveryApi.getAgentExecutions(caseId);
        setExecutions(data);
      } catch (err) {
        console.error('Failed to load executions:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-6 mx-auto">
        <SkeletonLoader.MetricGrid count={3} />
        <SkeletonLoader.Table rows={4} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="w-full max-w-[1720px] px-6 lg:px-10 py-16 space-y-4 mx-auto text-center">
        <div className="p-8 bg-white border border-slate-200 rounded max-w-md mx-auto shadow-2xs">
          <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Recovery Case Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
            Case <code className="font-mono-data text-slate-700">{caseId}</code> does not exist in your live database or was removed.
          </p>
          <button
            onClick={() => navigate('/recovery')}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Recovery Cases
          </button>
        </div>
      </div>
    );
  }

  const activeCase = caseData;
  const customer = {
    name: activeCase.customer_name || activeCase.customerName || 'Customer',
    email: activeCase.customer_email || activeCase.customerEmail || '—',
  };

  const amountVal = Number(activeCase.amount || activeCase.expected_recovery_amount || 0);
  const probVal = activeCase.recovery_probability || activeCase.recoveryProbability || 75;
  const ervVal = (amountVal * (probVal / 100.0)).toFixed(2);
  const isPendingApproval = activeCase.merchant_approval_required && activeCase.merchant_approval_status !== 'APPROVED';

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const effectiveLink = activeCase.smart_link_token
    ? `http://localhost:3001/pay/recover?token=${activeCase.smart_link_token}`
    : `http://localhost:3001/pay/${activeCase.id}`;

  const futurePlanSteps = activeCase.future_plan && activeCase.future_plan.length > 0
    ? activeCase.future_plan
    : [
        { step: 'NOW', action: 'Investigate Failure', description: `Qualify ${activeCase.root_cause || 'failure'} risk`, status: 'completed' },
        { step: 'NEXT', action: 'Plan Strategy', description: activeCase.strategy_reason || 'Evaluate safe recovery rails', status: 'current' },
        { step: 'THEN', action: 'Execute Bounded Action', description: activeCase.next_action || 'Proceed under policy', status: 'upcoming' },
        { step: 'IF_SUCCESS', action: 'Verify Settlement', description: 'Confirm funds capture & update revenue', status: 'conditional' },
      ];

  const custContext = activeCase.customer_context || {};
  const statedTime = custContext.stated_retry_time || custContext.expected_time || activeCase.customer_expected_retry_at;

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-6 mx-auto animate-fade-in text-slate-900">
      {/* ── Top Navigation Command Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/recovery')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-[#0078d4] font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Recovery Operations</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-mono-data font-bold text-slate-900">{activeCase.id}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={actionLoading}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Brain size={13} className="text-[#0078d4]" />
            <span>Re-run AI Diagnosis</span>
          </button>

          <button
            type="button"
            onClick={handleFetchExecutions}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal size={13} />
            <span>{showExecutions ? 'Hide Agent Telemetry' : 'Agent Audit Logs'}</span>
          </button>

          <button
            type="button"
            onClick={() => refresh()}
            className="btn-secondary p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Refresh live data"
          >
            <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* In-Flight Status Notification Banner */}
      {actionMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-center gap-2 font-medium animate-fade-in">
          <Activity size={15} className="text-[#0078d4] animate-spin" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* ── Merchant Approval Request Banner (When Strategy Requires Approval) ── */}
      {isPendingApproval && (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                  Merchant Authorization Required
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  Recommended Action: {activeCase.next_action || 'SEND_SMART_LINK'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                AI Recommendation: {activeCase.current_strategy || activeCase.recommended_strategy}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                {activeCase.strategy_reason || 'The multi-agent system has qualified this recovery action. Policy governance requires merchant approval before customer communication.'}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Expected Recoverable Value</span>
              <span className="text-xl font-bold font-mono-data text-emerald-800">₹{Number(ervVal).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-500 block">Confidence: {probVal}%</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3 border-t border-amber-200/60">
            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Authorize Action</span>
            </button>

            <button
              type="button"
              onClick={handleReject}
              disabled={actionLoading}
              className="btn-secondary text-xs py-2 px-4 text-red-700 hover:bg-red-50 border-red-200 cursor-pointer disabled:opacity-50"
            >
              <XCircle size={14} />
              <span>Reject (Trigger Replan)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendChat('Why did the agent choose this strategy over an instant retry?')}
              className="btn-secondary text-xs py-2 px-3 text-slate-700 flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <HelpCircle size={13} className="text-[#0078d4]" />
              <span>Ask Agent Why</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Case Header Intelligence Strip ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono-data text-xl font-bold text-slate-900">{activeCase.id}</span>
              <StatusBadge status={activeCase.status} />
              <RiskBadge score={activeCase.risk_score || activeCase.riskScore} />
              {activeCase.strategy_version > 1 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  Replanned (v{activeCase.strategy_version})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customer: <strong className="text-slate-800">{customer.name}</strong> ({customer.email}) • Method: <span className="font-mono text-slate-700">{activeCase.payment_method || 'CARD'}</span>
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Payment Value
            </span>
            <span className="text-2xl font-bold font-mono-data text-slate-900">
              ₹{amountVal.toLocaleString('en-IN')}.00
            </span>
            {activeCase.actual_recovered_amount > 0 && (
              <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                Recovered Revenue: ₹{Number(activeCase.actual_recovered_amount).toLocaleString('en-IN')}.00
              </span>
            )}
          </div>
        </div>

        {/* 4 Telemetric KPI Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
          <div className="p-3.5 px-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Root Cause Failure
            </span>
            <span className="font-mono-data font-semibold text-red-600 mt-0.5 block truncate">
              {activeCase.root_cause || activeCase.rootCause || 'BANK_TIMEOUT'}
            </span>
          </div>

          <div className="p-3.5 px-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Current Strategy
            </span>
            <span className="font-semibold text-[#0078d4] mt-0.5 block truncate">
              {activeCase.current_strategy || activeCase.recommended_strategy || 'Dynamic Strategy'}
            </span>
          </div>

          <div className="p-3.5 px-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Next Actionable Step
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block truncate font-mono">
              {activeCase.next_action || 'HOLD'}
            </span>
          </div>

          <div className="p-3.5 px-5">
            {activeCase.status === 'RECOVERED' || Number(activeCase.actual_recovered_amount || 0) > 0 ? (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
                  Recovered Settlement (100%)
                </span>
                <span className="font-bold font-mono-data text-emerald-700 mt-0.5 block text-sm">
                  ₹{Number(activeCase.actual_recovered_amount || amountVal).toLocaleString('en-IN')}.00
                </span>
                <span className="text-[10px] text-emerald-600 block font-medium mt-0.5">
                  Paid in full · ₹0 remaining
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Forecast Pipeline Value (ERV)
                </span>
                <span className="font-bold font-mono-data text-emerald-700 mt-0.5 block">
                  ₹{Number(ervVal).toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">({probVal}% odds)</span>
                </span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                  On recovery: Full ₹{amountVal.toLocaleString('en-IN')}.00
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Operations Layout (7 Columns Left / 5 Columns Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Intelligence, Explainability & Future Plan Stepper */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 40: "Why This Strategy?" Factual Explainability Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-[#0078d4]" />
                <h3 className="font-bold text-sm text-slate-900">Why This Strategy? (AI Explainability)</h3>
              </div>
              <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0078d4] px-2 py-0.5 rounded border border-blue-200 font-mono">
                Source: {activeCase.probability_source || 'SIMULATION_BASELINE'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs leading-relaxed space-y-2 text-slate-800">
              <p>
                {activeCase.strategy_reason || (
                  `The payment failed due to ${activeCase.root_cause || 'telemetry decline'}. RevivePilot does NOT claim to monitor private customer bank accounts. The system is operating under bounded autonomy to prevent repeated failure penalties.`
                )}
              </p>

              {/* Factual Categorization Chips */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="font-bold text-blue-700 font-mono">[KNOWN]</span> Failure reason: {activeCase.root_cause || 'DECLINED'}
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="font-bold text-purple-700 font-mono">[INFERRED]</span> Recovery probability: {probVal}%
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="font-bold text-amber-700 font-mono">[CUSTOMER-PROVIDED]</span> {statedTime ? `Expected retry: ${statedTime}` : 'Awaiting customer response'}
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="font-bold text-slate-600 font-mono">[UNKNOWN]</span> Customer private balance (strictly confidential)
                </div>
              </div>

              {/* ERV Mathematical Breakdown & AI Decision Explanation */}
              <div className="mt-3 p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Calculator size={13} className="text-[#0078d4]" />
                    <span>How Expected Recovery is Decided</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    ERV: ₹{Number(ervVal).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200 text-[11px] space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gross Purchase Value:</span>
                    <strong className="text-slate-900">₹{amountVal.toLocaleString('en-IN')}.00</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">AI Recovery Probability:</span>
                    <strong className="text-blue-700">{probVal}% ({probVal >= 75 ? 'High Confidence' : probVal >= 50 ? 'Moderate' : 'Risk-Constrained'})</strong>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-bold text-emerald-700">
                    <span>Expected Recovery Value (ERV):</span>
                    <span>₹{amountVal.toLocaleString('en-IN')} × {probVal}% = ₹{Number(ervVal).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 leading-relaxed bg-white/80 p-2 rounded border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Why does the AI estimate {probVal}% for this transaction?</strong>
                  {activeCase.root_cause === 'RISK_FRAUD_DECLINE' ? (
                    <span>
                      This ₹{amountVal.toLocaleString('en-IN')} transaction was blocked by risk/fraud rules. Automated re-billing is strictly halted to prevent chargeback penalties and network fines. The AI estimates <strong>{probVal}%</strong> because true fraud cannot and should not be recovered, while legitimate false-positives can be salvaged via manual merchant authorization and 3DS step-up verification. <em>Important: Once authorized and settled, the <strong>full ₹{amountVal.toLocaleString('en-IN')}.00</strong> is recovered, not just ₹{Number(ervVal).toLocaleString('en-IN')}.</em>
                    </span>
                  ) : activeCase.root_cause === 'INSUFFICIENT_FUNDS' ? (
                    <span>
                      Customer liquidity shortfall. Blind retries will fail and cause debit fatigue. Once the customer indicates funds will be available, recovery probability is estimated at <strong>{probVal}%</strong>.
                    </span>
                  ) : activeCase.root_cause === 'CARD_EXPIRED' ? (
                    <span>
                      Card expiration date has passed. Retrying the existing card has 0% chance, but issuing a smart credential update link achieves a historical <strong>{probVal}%</strong> recovery rate.
                    </span>
                  ) : (
                    <span>
                      Based on telemetry for {activeCase.root_cause || 'this gateway failure'}, bank switch health, and customer history, the AI assigns an expected recovery baseline of <strong>{probVal}%</strong>.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {statedTime && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[#0078d4]" />
                  <div>
                    <span className="font-bold block">Next Decision Point: {fmtDate(activeCase.next_evaluation_at) || statedTime}</span>
                    <span className="text-[11px] text-blue-700">Subject to customer readiness confirmation before execution.</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                  ON HOLD
                </span>
              </div>
            )}
          </div>

          {/* Real-Time Live Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Activity size={16} className="text-[#0078d4]" />
              <span>Real-Time Audit &amp; Event Stream</span>
            </h3>
            <AIRecoveryTimeline timeline={activeCase.timeline || []} />
          </div>
        </div>

        {/* RIGHT COLUMN: Merchant ↔ Agent Case Chat & Smart Link Execution */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 19 & 32: Case-Scoped Merchant ↔ Agent Intelligence Chat */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#0078d4]" />
                <h3 className="font-bold text-xs text-slate-900">Merchant ↔ Agent Intelligence Chat</h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                Case Scoped
              </span>
            </div>

            {/* Prompt Quick Chips — Top Common Questions */}
            <div className="p-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => handleSendChat('Is it safe to email the recovery link to this customer?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Safe to email link?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('How long is this recovery link valid before closing?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Link validity &amp; timespan?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('Will we get the full payment amount upon recovery?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Will we get full ₹{amountVal > 0 ? (amountVal >= 1000 ? `${Math.round(amountVal/1000)}k` : amountVal) : 'amount'}?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('What is this customer payment history?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Customer history?
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('How is the recovery probability & ERV calculated?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Explain ERV
              </button>
              <button
                type="button"
                onClick={() => handleSendChat('Why was this payment held or stopped?')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 cursor-pointer shadow-2xs font-medium"
              >
                Why stopped/held?
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
              {chatMessages.map((msg, idx) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-slate-400 font-mono mb-0.5">
                      {isAgent ? 'RevivePilot Agent' : 'You'} • {msg.time}
                    </span>
                    <div
                      className={`p-3 rounded-xl max-w-[90%] leading-relaxed whitespace-pre-line ${
                        isAgent
                          ? 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200'
                          : 'bg-[#0078d4] text-white rounded-tr-xs shadow-xs'
                      }`}
                    >
                      {msg.text}
                      {msg.suggestion && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium">
                          💡 Suggestion: {msg.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                  <Brain size={13} className="animate-spin text-[#0078d4]" />
                  <span>Agent analyzing case context...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask agent about this case..."
                className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#0078d4]"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-lg cursor-pointer disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Section 17: AI Recovery Link & Customer Email Center */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#0078d4]" />
                <span>AI Recovery Link &amp; Customer Email Center</span>
              </h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                activeCase.status === 'RECOVERED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeCase.smart_link_status === 'SENT_TO_CUSTOMER'
                  ? 'bg-blue-50 text-[#0078d4] border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {activeCase.status === 'RECOVERED'
                  ? 'Payment Settled'
                  : activeCase.smart_link_status === 'SENT_TO_CUSTOMER'
                  ? 'Dispatched to Customer'
                  : 'Prepared by Agent'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 space-y-1.5">
              <p>
                The AI Agent generated this tokenized recovery link with a strict <strong>24-hour expiration timespan</strong>.
                Verify with the agent in the chat above before sending. When authorized, the agent dispatches the secure link email directly to the customer.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium pt-0.5">
                <span>Recipient: <strong className="text-slate-900">{customer.name}</strong> ({customer.email})</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <Clock size={12} />
                  <span>Timespan: 24h Window</span>
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Secure Customer Recovery URL</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={effectiveLink}
                  className="w-full text-xs font-mono-data bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(effectiveLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  Token: {activeCase.smart_link_token ? `${activeCase.smart_link_token.slice(0, 14)}...` : 'Assigned on authorization'}
                </span>
                <a
                  href={effectiveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0078d4] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Test Portal (:3001)</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Primary Action Button: Dispatch Recovery Email */}
            <div className="pt-1">
              {activeCase.status === 'RECOVERED' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Payment of ₹{amountVal.toLocaleString('en-IN')}.00 has been successfully recovered! Link session closed.</span>
                </div>
              ) : activeCase.smart_link_status === 'SENT_TO_CUSTOMER' ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-[#0078d4]" />
                      <span>Recovery email dispatched to <strong>{customer.email}</strong>. Link active for 24 hours.</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-blue-200 text-blue-900 px-2 py-0.5 rounded">Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCustomerEmail}
                    disabled={actionLoading}
                    className="w-full btn-secondary text-xs py-2 px-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
                    <span>Resend Recovery Email to Customer</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCustomerEmail}
                  disabled={actionLoading}
                  className="w-full btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer shadow-sm font-semibold disabled:opacity-50"
                >
                  <Mail size={15} />
                  <span>Send Recovery Email to Customer ({customer.email})</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleStop}
              disabled={actionLoading || activeCase.status === 'STOPPED'}
              className="btn-secondary text-xs py-2 px-3 text-red-700 hover:bg-red-50 border-red-200 cursor-pointer disabled:opacity-50"
            >
              <span>Halt Recovery</span>
            </button>

            <button
              type="button"
              onClick={handleEscalate}
              disabled={actionLoading || activeCase.status === 'ESCALATED'}
              className="btn-secondary text-xs py-2 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <span>Escalate Case</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Optional Agent Executions Drawer (Real Records from DB) ── */}
      {showExecutions && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3 font-mono text-xs border border-slate-800 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-emerald-400 flex items-center gap-2">
              <Terminal size={14} />
              <span>Persisted PostgreSQL Agent Executions (agent_executions)</span>
            </span>
            <span className="text-slate-500 text-[11px]">{executions.length} recorded events</span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto space-y-2 pt-1">
            {executions.length === 0 ? (
              <p className="text-slate-500 py-3">No recorded executions for this case yet.</p>
            ) : (
              executions.map((ex, i) => (
                <div key={i} className="pt-2 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span className="text-blue-400">{ex.agent_name} ({ex.agent_type})</span>
                    <span>Decision: <strong className="text-emerald-400">{ex.decision}</strong></span>
                    <span className="text-slate-500">{ex.latency_ms}ms • {ex.tokens_used} tokens</span>
                  </div>
                  <p className="text-slate-400 text-[10px] truncate">{ex.input_summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
