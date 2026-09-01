import { useState, useEffect, useCallback } from 'react';
import { Bot, Activity, Brain, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import { MOCK_AGENTS, MOCK_AGENT_ACTIVITY } from '../../data/mockData';
import { agentApi } from '../../services/agentApi';
import { useRealtime } from '../../context/RealtimeContext';
import SectionHeader from '../../components/common/SectionHeader';
import StatusBadge from '../../components/common/StatusBadge';
import LiveIndicator from '../../components/common/LiveIndicator';

const AGENT_ICONS = {
  detection: Activity,
  rootcause: Brain,
  strategy:  Bot,
  learning:  TrendingUp,
};

const AGENT_COLORS = {
  detection: 'var(--color-danger)',
  rootcause: 'var(--color-brand)',
  strategy:  'var(--color-success)',
  learning:  'var(--color-warning)',
};

function AgentStatusCard({ agent }) {
  const Icon = AGENT_ICONS[agent.type] || Bot;
  const color = AGENT_COLORS[agent.type] || 'var(--color-brand)';

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Name + Description */}
      <div>
        <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {agent.name}
        </p>
        <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
          {agent.description}
        </p>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div
          className="px-3 py-2 rounded-lg text-[12px]"
          style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)' }}
        >
          <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Current: </span>
          {agent.currentTask}
        </div>
      )}

      {/* Stats */}
      <div
        className="grid grid-cols-3 gap-2 pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {[
          { label: 'Processed',   value: (agent.tasksProcessed || agent.tasks_processed || 0).toLocaleString() },
          { label: 'Success',     value: `${agent.successRate || agent.success_rate || 98}%`                   },
          { label: 'Avg Latency', value: agent.avgLatency || agent.avg_latency || '0.8s'                       },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[13px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
              {s.value}
            </p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Last activity */}
      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Last activity: {agent.lastActivity || agent.last_activity || 'Just now'}
      </p>
    </div>
  );
}

function AgentActivityRow({ log }) {
  const agentType = log.agentType || log.agent_type || 'detection';
  const Icon = AGENT_ICONS[agentType] || Bot;
  const color = AGENT_COLORS[agentType] || 'var(--color-brand)';
  const agentName = log.agentName || log.agent_name || 'Autonomous Agent';
  const detail = log.detail || log.action || 'Processed task';
  const ts = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : (log.ts || 'Just now');

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}1a` }}
      >
        <Icon size={14} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {agentName}
          </span>
          {log.caseId && (
            <span
              className="text-[11px] font-mono-data px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-brand)' }}
            >
              {log.caseId.slice(0, 10)}
            </span>
          )}
        </div>
        <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {detail}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        <span
          className="badge text-[10px]"
          style={{
            backgroundColor: log.status === 'success' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
            color: log.status === 'success' ? 'var(--color-success)' : 'var(--color-warning)',
          }}
        >
          {log.status || 'success'}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {ts}
        </span>
      </div>
    </div>
  );
}

export default function AgentMonitor() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [activities, setActivities] = useState(MOCK_AGENT_ACTIVITY);
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
      if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value) && activityRes.value.length > 0) {
        setActivities(activityRes.value);
      }
    } catch {
      // fallback to existing
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeCount = agents.filter(a => a.status === 'online' || a.status === 'processing').length;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        title="AI Agents"
        subtitle="Monitor the autonomous recovery intelligence pipeline in real time."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)' }}
            >
              <LiveIndicator label={`${activeCount} Active`} size="sm" />
            </div>
          </div>
        }
      />

      {/* Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {agents.map(agent => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Pipeline overview */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Autonomous Recovery Pipeline
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Sequential multi-agent collaborative reasoning workflow
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-0">
            {[
              { icon: Activity, label: 'Detection Agent',  desc: 'Risk & Urgency Classification', color: 'var(--color-danger)'  },
              { icon: Brain,    label: 'Root Cause Agent',  desc: 'Failure Reason Diagnosis',       color: 'var(--color-brand)'   },
              { icon: Bot,      label: 'Strategy Agent',    desc: 'Optimal Strategy Formulation',   color: 'var(--color-success)' },
              { icon: Zap,      label: 'Action & Policy',   desc: 'Bounded Autonomy & Execution',   color: 'var(--color-warning)' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center p-4 w-32">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${step.color}1a` }}
                  >
                    <step.icon size={18} style={{ color: step.color }} />
                  </div>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{step.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{step.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="text-[18px] px-1" style={{ color: 'var(--color-border-strong)' }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Activity Log */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Live Agent Activity Stream
          </p>
          <LiveIndicator label={isConnected ? 'Connected' : 'Offline'} />
        </div>
        {activities.map((log, i) => (
          <AgentActivityRow
            key={log.id || i}
            log={log}
          />
        ))}
      </div>
    </div>
  );
}
