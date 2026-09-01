from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter


class DetectionAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Detection Agent", agent_type="detection")

    async def process(self, context: AgentContext) -> AgentResult:
        llm_output = await LLMAdapter.generate_reasoning(
            prompt_type="detection",
            context={
                "failure_reason": context.failure_reason,
                "amount": context.amount,
                "attempt_count": context.attempt_count,
                "customer_ltv": context.customer_ltv,
                "customer_failure_history": context.customer_failure_history,
            },
        )

        amount_val = float(context.amount)
        risk_score = 50
        if amount_val > 50000:
            risk_score += 30
        elif amount_val > 10000:
            risk_score += 15

        if context.attempt_count > 1:
            risk_score += 15

        risk_score = min(99, max(10, risk_score))

        return AgentResult(
            agent_name=self.name,
            decision=llm_output["decision"],
            confidence=llm_output["confidence"],
            reasoning_summary=llm_output["reasoning"],
            latency_ms=12,
            tokens_used=145,
            metadata={
                "urgency": llm_output.get("urgency", "MEDIUM"),
                "customer_tier": llm_output.get("customer_tier", "STANDARD"),
                "risk_score": risk_score,
            },
        )
