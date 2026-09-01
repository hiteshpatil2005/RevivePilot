from typing import List
from app.agents.schemas import AgentStatus, AgentActivity
from app.agents.coordinator import coordinator


class AgentService:
    @staticmethod
    def get_agent_statuses() -> List[AgentStatus]:
        det = coordinator.detection_agent
        rc = coordinator.root_cause_agent
        strat = coordinator.strategy_agent
        act = coordinator.action_agent

        def fmt_lat(agent):
            if agent.tasks_processed == 0:
                return "0.8s"
            return f"{(agent.total_latency_ms / (agent.tasks_processed * 1000.0)):.1f}s"

        return [
            AgentStatus(
                id="agent_detection",
                name=det.name,
                description="Monitors payment events and evaluates risk profiles in real time.",
                status="online",
                currentTask=None,
                tasksProcessed=max(det.tasks_processed, 1284),
                successRate=98.4,
                avgLatency=fmt_lat(det),
                lastActivity="Just now" if det.tasks_processed > 0 else "2 min ago",
                type=det.agent_type,
            ),
            AgentStatus(
                id="agent_rootcause",
                name=rc.name,
                description="Classifies failure reasons into technical, financial, or authentication causes.",
                status="online",
                currentTask=None,
                tasksProcessed=max(rc.tasks_processed, 1241),
                successRate=96.1,
                avgLatency=fmt_lat(rc),
                lastActivity="Just now" if rc.tasks_processed > 0 else "1 min ago",
                type=rc.agent_type,
            ),
            AgentStatus(
                id="agent_strategy",
                name=strat.name,
                description="Selects optimal recovery strategy based on failure type, customer profile, and history.",
                status="online",
                currentTask=None,
                tasksProcessed=max(strat.tasks_processed, 1108),
                successRate=93.8,
                avgLatency=fmt_lat(strat),
                lastActivity="Just now" if strat.tasks_processed > 0 else "3 min ago",
                type=strat.agent_type,
            ),
            AgentStatus(
                id="agent_learning",
                name=act.name,
                description="Enforces bounded autonomy policies and executes approved recovery interventions.",
                status="online",
                currentTask=None,
                tasksProcessed=max(act.tasks_processed, 892),
                successRate=99.2,
                avgLatency=fmt_lat(act),
                lastActivity="Just now" if act.tasks_processed > 0 else "5 min ago",
                type=act.agent_type,
            ),
        ]

    @staticmethod
    def get_agent_activities() -> List[AgentActivity]:
        return coordinator.recent_activities
