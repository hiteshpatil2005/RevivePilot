from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter


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
            },
        )

        strat = llm_output["strategy"]
        prob = llm_output["recovery_probability"]

        # High value override
        if float(context.amount) > 100000:
            strat = "VIP Escalation"
            prob = 85

        return AgentResult(
            agent_name=self.name,
            decision="STRATEGY_SELECTED",
            confidence=92,
            reasoning_summary=llm_output["reasoning"],
            recommended_strategy=strat,
            recovery_probability=prob,
            latency_ms=15,
            tokens_used=160,
            metadata={
                "strategy": strat,
                "recovery_probability": prob,
                "retry_delay_seconds": llm_output.get("retry_delay_seconds", 900),
                "alternate_method": llm_output.get("alternate_method"),
            },
        )
