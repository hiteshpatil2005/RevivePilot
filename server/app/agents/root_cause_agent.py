from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


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
            decision=llm_output.get("decision", "Bank"),
            confidence=llm_output.get("confidence", 92),
            reasoning_summary=llm_output.get("reasoning", "Failure diagnostic completed."),
            latency_ms=llm_output.get("_latency_ms", 18),
            tokens_used=llm_output.get("_tokens_used", 180),
            metadata={
                "is_temporary": llm_output.get("is_temporary", True),
                "failure_reason": context.failure_reason,
                "category": llm_output.get("decision", "Bank"),
                "failure_code": llm_output.get("failure_code", "GATEWAY_ERROR"),
                "failure_source": llm_output.get("failure_source", "bank"),
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
