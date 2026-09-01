import time
from abc import ABC, abstractmethod
from app.agents.schemas import AgentContext, AgentResult
from app.core.logging import logger


class BaseAgent(ABC):
    def __init__(self, name: str, agent_type: str):
        self.name = name
        self.agent_type = agent_type
        self.tasks_processed = 0
        self.total_latency_ms = 0

    @abstractmethod
    async def process(self, context: AgentContext) -> AgentResult:
        """Core reasoning implementation for this agent."""
        pass

    async def execute(self, context: AgentContext) -> AgentResult:
        """Executes agent with latency tracking and metric recording."""
        start_time = time.perf_counter()
        try:
            result = await self.process(context)
        except Exception as e:
            logger.error(f"[{self.name}] Agent execution failed: {e}", exc_info=True)
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            result = AgentResult(
                agent_name=self.name,
                decision="ERROR",
                confidence=0,
                reasoning_summary=f"Execution error: {str(e)}",
                latency_ms=elapsed_ms,
                metadata={"error": str(e)},
            )

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        result.latency_ms = max(result.latency_ms, elapsed_ms)
        self.tasks_processed += 1
        self.total_latency_ms += result.latency_ms
        return result
