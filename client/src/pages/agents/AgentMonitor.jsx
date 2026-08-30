import { Bot, Activity, Brain, Zap, TrendingUp } from 'lucide-react';
import { MOCK_AGENTS, MOCK_AGENT_ACTIVITY } from '../../data/mockData';
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
          { label: 'Processed',   value: agent.tasksProcessed.toLocaleString() },
          { label: 'Success',     value: `${agent.successRate}%`               },
          { label: 'Avg Latency', value: agent.avgLatency                       },
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
        Last activity: {agent.lastActivity}
      </p>
    </div>
  );
}

function AgentActivityRow({ log }) {
  const agent = MOCK_AGENTS.find(a => a.id === log.agentId);
  const Icon = AGENT_ICONS[agent?.type] || Bot;
  const color = AGENT_COLORS[agent?.type] || 'var(--color-brand)';

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}1a` }}
      >
        <Icon size={13} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {agent?.name ?? log.agentId}
        </p>
        <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          {log.action}
          {log.caseId && (
            <span className="ml-1 font-mono-data" style={{ color: 'var(--color-brand)' }}>
              — {log.caseId}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={log.status} size="sm" />
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {log.ts}
        </span>
      </div>
    </div>
  );
}

export default function AgentMonitor() {
  const activeCount = MOCK_AGENTS.filter(a => a.status === 'online' || a.status === 'processing').length;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        title="AI Agents"
        subtitle="Monitor the autonomous recovery intelligence pipeline."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)' }}>
            <LiveIndicator label={`${activeCount} Active`} size="sm" />
          </div>
        }
      />

      {/* Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {MOCK_AGENTS.map(agent => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Pipeline overview */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Recovery Pipeline
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            How RevivePilot's agents collaborate
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-0">
            {[
              { icon: Activity, label: 'Detection',  desc: 'Identify failures', color: 'var(--color-danger)'  },
              { icon: Brain,    label: 'Root Cause',  desc: 'Classify reasons', color: 'var(--color-brand)'   },
              { icon: Bot,      label: 'Strategy',    desc: 'Select approach',  color: 'var(--color-success)'  },
              { icon: Zap,      label: 'Execution',   desc: 'Run recovery',     color: 'var(--color-warning)'  },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center p-4 w-28">
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
            Agent Activity
          </p>
          <LiveIndicator />
        </div>
        {MOCK_AGENT_ACTIVITY.map((log, i) => (
          <AgentActivityRow
            key={i}
            log={log}
          />
        ))}
      </div>
    </div>
  );
}
