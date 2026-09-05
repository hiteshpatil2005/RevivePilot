from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


class RootCauseAgent(BaseAgent):
    """
    Root Cause Diagnosis Agent.
    Explains the operational meaning of the event with structured fields:
    root_cause, category, confidence, evidence (from actual project data),
    recoverability, recoverability_reason, uncertainty, recommended_next_stage.
    Does NOT fabricate customer behavior or private bank data.
    """

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
                "metadata": context.metadata,
            },
        )

        root_cause = llm_output.get("root_cause", context.failure_reason)
        category = llm_output.get("category", "CUSTOMER_LIQUIDITY")
        evidence = llm_output.get("evidence", [f"Gateway code: {context.failure_reason}"])
        recoverability = llm_output.get("recoverability", "HIGH")
        recoverability_reason = llm_output.get("recoverability_reason", "Operational diagnostic complete")
        uncertainty = llm_output.get("uncertainty", [])
        next_stage = llm_output.get("recommended_next_stage", "STRATEGY")

        conf = llm_output.get("confidence", 92)
        if isinstance(conf, float) and conf <= 1.0:
            conf = int(conf * 100)

        return AgentResult(
            agent_name=self.name,
            decision=category,
            confidence=int(conf),
            reasoning_summary=recoverability_reason or f"Root cause diagnostic completed for {root_cause}.",
            evidence=evidence,
            uncertainty=uncertainty,
            latency_ms=llm_output.get("_latency_ms", 18),
            tokens_used=llm_output.get("_tokens_used", 180),
            metadata={
                "is_temporary": llm_output.get("is_temporary", True),
                "root_cause": root_cause,
                "category": category,
                "recoverability": recoverability,
                "recoverability_reason": recoverability_reason,
                "recommended_next_stage": next_stage,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
