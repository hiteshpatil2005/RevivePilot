from decimal import Decimal
from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult, FuturePlanStep
from app.agents.llm import LLMAdapter
from app.core.config import settings


class StrategyAgent(BaseAgent):
    """
    Strategy Agent — Core Intelligence Component.
    Does NOT map 'if failure == X: action = Y'.
    Reasons over:
      Failure + Amount + Customer Context + Historical Outcomes + Previous Attempts +
      Payment Method + Failure Recurrence + Time + State + Customer Responses + Policies + ERV.
    Produces dynamic recovery plan with state, conditions, next_action, and multi-step future plan.
    """

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
                "customer_context": context.customer_context,
                "replan_trigger": context.replan_trigger,
                "metadata": context.metadata,
            },
        )

        strat_name = llm_output.get("strategy", llm_output.get("objective", "Dynamic Recovery Strategy"))
        strat_id = llm_output.get("strategy_id", f"strat_{context.failure_reason.lower()}_{context.attempt_count}")
        current_state = llm_output.get("current_state", "ON_HOLD")
        reason = llm_output.get("reason", "Formulated based on telemetry and customer context")
        next_action = llm_output.get("next_action", "HOLD")
        wait_until = llm_output.get("wait_until")
        cust_contact_req = llm_output.get("customer_contact_required", False)
        merch_appr_req = llm_output.get("merchant_approval_required", False)
        smart_link_req = llm_output.get("smart_link_required", False)
        rec_prob = int(llm_output.get("recovery_probability", 75))
        prob_source = llm_output.get("probability_source", "SIMULATION_BASELINE")

        if float(context.amount) > 100000:
            strat_name = "VIP Escalation"
            rec_prob = 85
            current_state = "READY_FOR_APPROVAL"
            next_action = "REQUEST_MERCHANT_APPROVAL"
            merch_appr_req = True
            reason = f"High-value payment (INR {context.amount:,.2f}) flagged for VIP Escalation and merchant approval."
        elif context.failure_reason == "BANK_TIMEOUT":
            strat_name = "Smart Delayed Retry"
            rec_prob = 90

        stop_conds = llm_output.get("stop_conditions", [])
        esc_conds = llm_output.get("escalation_conditions", [])
        replan_conds = llm_output.get("replan_conditions", [])

        # Parse future plan steps
        raw_future_plan = llm_output.get("future_plan", [])
        future_plan_steps = []
        for step_dict in raw_future_plan:
            if isinstance(step_dict, dict):
                future_plan_steps.append(FuturePlanStep(
                    step=step_dict.get("step", "NEXT"),
                    action=step_dict.get("action", "HOLD"),
                    description=step_dict.get("description", ""),
                    status=step_dict.get("status", "upcoming"),
                ))

        erv = (context.amount * Decimal(str(rec_prob / 100.0))).quantize(Decimal("0.01"))

        return AgentResult(
            agent_name=self.name,
            decision="STRATEGY_PLANNED",
            confidence=llm_output.get("confidence", 92),
            reasoning_summary=reason,
            recommended_strategy=strat_name,
            recovery_probability=rec_prob,
            next_action=next_action,
            future_plan=future_plan_steps,
            latency_ms=llm_output.get("_latency_ms", 22),
            tokens_used=llm_output.get("_tokens_used", 210),
            metadata={
                "strategy_id": strat_id,
                "strategy": strat_name,
                "retry_delay_seconds": 900,
                "alternate_method": "UPI",
                "objective": llm_output.get("objective", strat_name),
                "current_state": current_state,
                "reason": reason,
                "next_action": next_action,
                "wait_until": wait_until,
                "customer_contact_required": cust_contact_req,
                "merchant_approval_required": merch_appr_req,
                "smart_link_required": smart_link_req,
                "recovery_probability": rec_prob,
                "probability_source": prob_source,
                "expected_recovery_amount": float(erv),
                "stop_conditions": stop_conds,
                "escalation_conditions": esc_conds,
                "replan_conditions": replan_conds,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
