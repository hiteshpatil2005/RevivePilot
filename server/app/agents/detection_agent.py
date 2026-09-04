import time
from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


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
        ltv_val = float(context.customer_ltv or 0)

        customer_tier = "ENTERPRISE" if ltv_val > 150000 else ("PRO" if ltv_val > 30000 else "STANDARD")
        urgency = "HIGH" if amount_val > 50000 or ltv_val > 100000 else ("MEDIUM" if amount_val > 10000 else "LOW")

        base_risk = int(llm_output.get("risk_score", 50))
        if amount_val > 50000:
            base_risk = max(base_risk, 80)
        elif amount_val > 10000:
            base_risk = max(base_risk, 65)

        if context.attempt_count > 1:
            base_risk += 15

        risk_score = min(99, max(10, base_risk))

        return AgentResult(
            agent_name=self.name,
            decision=llm_output.get("decision", "RECOVERY_QUALIFIED"),
            confidence=llm_output.get("confidence", 95),
            reasoning_summary=llm_output.get("reasoning", "Failure signal intercepted and qualified."),
            latency_ms=llm_output.get("_latency_ms", 15),
            tokens_used=llm_output.get("_tokens_used", 145),
            metadata={
                "urgency": urgency,
                "customer_tier": customer_tier,
                "risk_score": risk_score,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
