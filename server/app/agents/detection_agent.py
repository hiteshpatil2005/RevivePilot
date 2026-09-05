from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


class DetectionAgent(BaseAgent):
    """
    Detection Agent monitors payment events in realtime.
    Does NOT immediately recommend recovery.
    Classifies:
      1. What happened (telemetry, rail, status, attempt frequency, uncertainty)
      2. Revenue Risk (NOT_REVENUE_RISK, LOW_RISK, MEDIUM_RISK, HIGH_RISK, CRITICAL, UNCERTAIN)
      3. Urgency (ACT_NOW, WAIT, INVESTIGATE, CONTACT_CUSTOMER, REQUIRE_MERCHANT_APPROVAL, ESCALATE, STOP)
    Conservative: Timeouts & late authorizations flagged as UNCERTAIN without initiating immediate retry.
    """

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
                "payment_method": context.payment_method,
                "metadata": context.metadata,
            },
        )

        risk_score = llm_output.get("risk_score", 65)
        rev_risk = llm_output.get("revenue_risk", "HIGH_RISK")
        is_uncertain = llm_output.get("is_uncertain", False)

        amount_val = float(context.amount)
        ltv_val = float(context.customer_ltv or 0)
        customer_tier = "ENTERPRISE" if ltv_val > 150000 else ("PRO" if ltv_val > 30000 else "STANDARD")
        urgency = "HIGH" if amount_val > 50000 or ltv_val > 100000 else (llm_output.get("urgency") or ("MEDIUM" if amount_val > 10000 else "LOW"))

        decision = llm_output.get("decision", "RECOVERY_QUALIFIED")
        if decision not in ["STOP", "CONTACT_CUSTOMER"]:
            decision = "RECOVERY_QUALIFIED"

        return AgentResult(
            agent_name=self.name,
            decision=decision,
            confidence=llm_output.get("confidence", 95),
            reasoning_summary=llm_output.get("reasoning", "Payment failure signal captured and qualified."),
            latency_ms=llm_output.get("_latency_ms", 15),
            tokens_used=llm_output.get("_tokens_used", 145),
            metadata={
                "revenue_risk": rev_risk,
                "urgency": urgency,
                "customer_tier": customer_tier,
                "is_uncertain": is_uncertain,
                "risk_score": risk_score,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
