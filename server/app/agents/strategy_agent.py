from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


class StrategyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Strategy Agent", agent_type="strategy")

    async def process(self, context: AgentContext) -> AgentResult:
        llm_output = await LLMAdapter.generate_reasoning(
            prompt_type="strategy",
            context={
                "failure_reason": context.failure_reason,
                "amount": context.amount,
                "customer_ltv": context.customer_ltv,
                "payment_method": context.payment_method,
                "attempt_count": context.attempt_count,
            },
        )

        strat = llm_output.get("strategy", "Delayed Retry")
        prob = llm_output.get("recovery_probability", 75)
        retry_delay = llm_output.get("retry_delay_seconds", 900)
        alternate_method = llm_output.get("alternate_method", "UPI")

        # High value override: VIP Escalation for transactions > ₹100,000
        if float(context.amount) > 100000:
            strat = "VIP Escalation"
            prob = 85
            retry_delay = 0

        return AgentResult(
            agent_name=self.name,
            decision="STRATEGY_SELECTED",
            confidence=llm_output.get("confidence", 92),
            reasoning_summary=llm_output.get("reasoning", "Optimal recovery strategy selected."),
            recommended_strategy=strat,
            recovery_probability=prob,
            latency_ms=llm_output.get("_latency_ms", 15),
            tokens_used=llm_output.get("_tokens_used", 160),
            metadata={
                "strategy": strat,
                "recovery_probability": prob,
                "retry_delay_seconds": retry_delay,
                "alternate_method": alternate_method,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
