import uuid
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_execution import AgentExecution
from app.agents.schemas import AgentStatus, AgentActivity
from app.agents.coordinator import coordinator


class AgentService:
    @staticmethod
    async def get_agent_statuses(
        session: Optional[AsyncSession] = None,
        merchant_id: Optional[uuid.UUID] = None,
    ) -> List[AgentStatus]:
        det = coordinator.detection_agent
        rc = coordinator.root_cause_agent
        strat = coordinator.strategy_agent
        act = coordinator.action_agent

        agents_config = [
            ("agent_detection", det.name, "Monitors payment events and evaluates risk profiles in real time.", "detection"),
            ("agent_rootcause", rc.name, "Classifies failure reasons into technical, financial, or authentication causes.", "rootcause"),
            ("agent_strategy", strat.name, "Selects optimal recovery strategy based on failure type, customer profile, and history.", "strategy"),
            ("agent_learning", act.name, "Enforces bounded autonomy policies and executes approved recovery interventions.", "learning"),
        ]

        result = []
        for agent_id, name, desc_text, agent_type in agents_config:
            tasks_run = 0
            avg_lat_ms = 0
            success_rate = 0.0
            last_activity = "Idle"

            if session and merchant_id:
                # Query real executions from PostgreSQL
                q = (
                    select(
                        func.count(AgentExecution.id).label("total"),
                        func.avg(AgentExecution.latency_ms).label("avg_lat"),
                        func.avg(AgentExecution.confidence).label("avg_conf"),
                        func.max(AgentExecution.created_at).label("latest"),
                    )
                    .where(
                        AgentExecution.merchant_id == merchant_id,
                        AgentExecution.agent_type == agent_type,
                    )
                )
                row = (await session.execute(q)).one_or_none()
                if row and row.total:
                    tasks_run = int(row.total)
                    avg_lat_ms = int(row.avg_lat or 0)
                    success_rate = round(float(row.avg_conf or 90.0), 1)
                    if row.latest:
                        last_activity = row.latest.strftime("%H:%M:%S")

            if tasks_run == 0:
                # Check in-memory agent
                target_agent = det if agent_type == "detection" else (rc if agent_type == "rootcause" else (strat if agent_type == "strategy" else act))
                tasks_run = target_agent.tasks_processed
                if tasks_run > 0:
                    avg_lat_ms = int(target_agent.total_latency_ms / tasks_run)
                    success_rate = round(float(target_agent.accuracy or 90.0), 1)
                    last_activity = "Just now"

            lat_str = f"{(avg_lat_ms / 1000.0):.2f}s" if tasks_run > 0 else "0.0s"

            result.append(
                AgentStatus(
                    id=agent_id,
                    name=name,
                    description=desc_text,
                    status="online",
                    currentTask=None,
                    tasksProcessed=tasks_run,
                    successRate=success_rate,
                    avgLatency=lat_str,
                    lastActivity=last_activity,
                    type=agent_type,
                )
            )

        return result

    @staticmethod
    def get_agent_activities() -> List[AgentActivity]:
        return coordinator.recent_activities

    @staticmethod
    def get_coordinator():
        return coordinator
