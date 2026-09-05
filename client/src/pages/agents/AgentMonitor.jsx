import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Activity, Brain, Zap, TrendingUp, RefreshCw,
  ExternalLink, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import { MOCK_AGENTS, MOCK_AGENT_ACTIVITY } from '../../data/mockData';
import { agentApi } from '../../services/agentApi';
import { useRealtime } from '../../context/RealtimeContext';
import StatusBadge from '../../components/common/StatusBadge';
import LiveIndicator from '../../components/common/LiveIndicator';

const AGENT_CONFIGS = {
  detection: {
    icon: Activity,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    tag: 'Signal Ingestion & Risk Scoring',
  },
  rootcause: {
    icon: Brain,
    color: '#0c6ff9',
    bg: 'rgba(12, 111, 249, 0.08)',
    tag: 'Bayesian Failure Diagnosis',
  },
  strategy: {
    icon: Bot,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    tag: 'Priority Recovery Strategy',
  },
  learning: {
    icon: TrendingUp,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    tag: 'Adaptive Weight Calibration',
  },
};

function AgentStatusCard({ agent }) {
  const conf = AGENT_CONFIGS[agent.type] || AGENT_CONFIGS.detection;
  const Icon = conf.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: conf.bg }}
          >
            <Icon size={20} style={{ color: conf.color }} />
          </div>
          <StatusBadge status={agent.status} />
        </div>

        {/* Title & Role */}
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {agent.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {agent.description}
          </p>
        </div>

        {/* Active Task Box */}
        {agent.currentTask && (
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Active Task: </span>
            <span className="text-slate-600 font-mono">{agent.currentTask}</span>
          </div>
        )}
      </div>

      {/* 3-Column Performance Stats */}
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 rounded bg-slate-50/60">
          <p className="text-sm font-bold font-mono text-slate-900">
            {(agent.tasksProcessed ?? agent.tasks_processed ?? 0).toLocaleString()}
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
            Tasks Run
          </p>
        </div>
        <div className="p-1.5 rounded bg-slate-50/60">
          <p className="text-sm font-bold font-mono text-emerald-700">
            {agent.successRate ?? agent.success_rate ?? 0}%
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
            Accuracy
          </p>
        </div>
        <div className="p-1.5 rounded bg-slate-50/60">
          <p className="text-sm font-bold font-mono text-cyan-700">
            {agent.avgLatency ?? agent.avg_latency ?? '0.0s'}
          </p>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">
            Avg Latency
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentActivityRow({ log }) {
  const agentType = log.agentType || log.agent_type || 'detection';
  const conf = AGENT_CONFIGS[agentType] || AGENT_CONFIGS.detection;
  const Icon = conf.icon;
  const agentName = log.agentName || log.agent_name || 'Autonomous Agent';
  const detail = log.detail || log.action || 'Processed task';
  const ts = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : (log.ts || 'Just now');

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0 text-xs">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: conf.bg }}
        >
          <Icon size={16} style={{ color: conf.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {agentName}
            </span>
            {log.caseId && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#0c6ff9] border border-blue-200 font-semibold">
                {log.caseId.slice(0, 12)}
              </span>
            )}
          </div>
          <p className="text-slate-600 truncate mt-0.5">
            {detail}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 text-right">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          {log.status || 'Resolved'}
        </span>
        <span className="font-mono text-slate-500 text-[11px]">
          {ts}
        </span>
      </div>
    </div>
  );
}

export default function AgentMonitor() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { connectionStatus } = useRealtime();
  const isConnected = connectionStatus === 'connected';

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [statusesRes, activityRes] = await Promise.allSettled([
        agentApi.getStatuses(),
        agentApi.getActivity(),
      ]);

      if (statusesRes.status === 'fulfilled' && Array.isArray(statusesRes.value) && statusesRes.value.length > 0) {
        setAgents(statusesRes.value);
      }
      if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value)) {
        setActivities(activityRes.value);
      }
    } catch {
      // Keep real states
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeCount = agents.filter(a => a.status === 'online' || a.status === 'processing').length;

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-7 mx-auto animate-fade-in text-slate-900 font-sans">
      {/* ── Enterprise Header (Razorpay White Theme, No Simulation) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Autonomous AI Agents
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0c6ff9] border border-blue-200">
              Multi-Agent Mesh
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time multi-agent collaborative reasoning pipeline, decision telemetry, and autonomous execution states
          </p>
        </div>

        {/* Clean Production Toolbar */}
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
            onClick={loadData}
            disabled={refreshing}
            className="h-9 px-3.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh agent states"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Mesh</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200">
            <LiveIndicator label={`${activeCount} Agents Active`} size="sm" />
          </div>
        </div>
      </div>

      {/* ── 4 Expanded Agent Status Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map(agent => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* ── Multi-Agent Reasoning Pipeline Visualizer ── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-bold text-slate-900">
            Autonomous Collaborative Recovery Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end consensus flow: from sub-second failure detection to bounded action dispatch
          </p>
        </div>

        <div className="p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {[
              {
                step: '01',
                icon: Activity,
                title: 'Detection Agent',
                tag: 'Sub-Second Ingestion',
                desc: 'Captures payment.failed webhooks, classifies issuer bank degradation, and scores recovery urgency.',
                color: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.08)',
              },
              {
                step: '02',
                icon: Brain,
                title: 'Root Cause Agent',
                tag: 'Diagnostic Consensus',
                desc: 'Cross-correlates bank timeouts, customer LTV, gateway status codes, and transient routing drops.',
                color: '#0c6ff9',
                bg: 'rgba(12, 111, 249, 0.08)',
              },
              {
                step: '03',
                icon: Bot,
                title: 'Strategy Agent',
                tag: 'Intervention Optimizer',
                desc: 'Evaluates prioritized recovery methods: Smart Link, Delayed Retry, UPI Intent, or SMS Nudge.',
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.08)',
              },
              {
                step: '04',
                icon: ShieldCheck,
                title: 'Policy & Action Engine',
                tag: 'Bounded Autonomy',
                desc: 'Enforces retry limits, cooldown periods, and maximum amount caps before executing recovery.',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.08)',
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="p-5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      STAGE {p.step}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: p.bg }}
                    >
                      <Icon size={16} style={{ color: p.color }} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {p.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#0c6ff9] mt-0.5 uppercase tracking-wide">
                      {p.tag}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Expanded Live Agent Activity Stream ── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live Agent Execution Stream
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of agent decisions, tool calls, and automated recovery actions
            </p>
          </div>
          <LiveIndicator label={isConnected ? 'Telemetry Stream Active' : 'Polling Active'} />
        </div>

        <div className="divide-y divide-slate-100 bg-white">
          {activities.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No recent agent execution logs. Live agent decisions will appear here automatically.
            </div>
          ) : (
            activities.map((log, i) => (
              <AgentActivityRow key={log.id || i} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
