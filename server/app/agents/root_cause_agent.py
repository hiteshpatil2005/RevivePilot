from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter


class RootCauseAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Root Cause Agent", agent_type="rootcause")

    async def process(self, context: AgentContext) -> AgentResult:
        llm_output = await LLMAdapter.generate_reasoning(
            prompt_type="root_cause",
            context={
                "failure_reason": context.failure_reason,
                "amount": context.amount,
                "payment_method": context.payment_method,
                "attempt_count": context.attempt_count,
            },
        )

        return AgentResult(
            agent_name=self.name,
            decision=llm_output["decision"],
            confidence=llm_output["confidence"],
            reasoning_summary=llm_output["reasoning"],
            latency_ms=18,
            tokens_used=180,
            metadata={
                "is_temporary": llm_output.get("is_temporary", True),
                "failure_reason": context.failure_reason,
                "category": llm_output["decision"],
            },
        )
