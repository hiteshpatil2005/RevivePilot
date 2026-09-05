from decimal import Decimal
from typing import List, Dict, Any, Tuple
from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult, ActionEnum
from app.agents.llm import LLMAdapter
from app.core.config import settings

VALID_ACTION_ENUMS = {a.value for a in ActionEnum}


class ActionAgent(BaseAgent):
    """
    Action Agent executes ONLY permitted, approved actions.
    NOT the decision maker.
    Strictly validates actions against ActionEnum:
    ASK_CUSTOMER, HOLD, WAIT, RECHECK, CUSTOMER_RETRY, ALTERNATIVE_PAYMENT_METHOD,
    GENERATE_RECOVERY_LINK, REQUEST_MERCHANT_APPROVAL, ESCALATE, STOP, VERIFY_PAYMENT.
    Enforces Bounded Autonomy guardrails.
    """

    def __init__(self):
        super().__init__(name="Action Agent", agent_type="learning")

    def evaluate_policies(
        self,
        context: AgentContext,
        proposed_action: str,
    ) -> Tuple[bool, List[str], List[Dict[str, Any]]]:
        violations = []
        checks = []

        # Check 1: Action validity against strict ActionEnum
        action_valid = proposed_action in VALID_ACTION_ENUMS
        checks.append({
            "label": "Action Enum Whitelist",
            "value": proposed_action if action_valid else f"INVALID: {proposed_action}",
            "passed": action_valid,
        })
        if not action_valid:
            violations.append(f"Action '{proposed_action}' is not in permitted ActionEnum whitelist")

        # Check 2: Maximum Retries
        retries_ok = context.attempt_count < context.max_attempts or proposed_action in ["STOP", "ESCALATE", "VERIFY_PAYMENT"]
        checks.append({
            "label": "Maximum retries",
            "value": f"{context.attempt_count} / {context.max_attempts}",
            "passed": retries_ok,
        })
        if not retries_ok:
            violations.append(f"Maximum retry limit ({context.max_attempts}) reached for case")

        # Check 3: Transaction Value Cap for fully autonomous retry
        max_auto_amount = Decimal("150000.00")
        amount_ok = context.amount <= max_auto_amount or proposed_action in ["REQUEST_MERCHANT_APPROVAL", "HOLD", "ASK_CUSTOMER", "STOP", "ESCALATE"]
        checks.append({
            "label": "Autonomous Value Threshold",
            "value": f"INR {context.amount:,.2f} <= {max_auto_amount:,.2f}",
            "passed": amount_ok,
        })
        if not amount_ok:
            violations.append(f"Amount INR {context.amount:,.2f} exceeds autonomous limit of INR {max_auto_amount:,.2f}")

        # Check 4: Customer Cooldown / Fatigue
        fatigue_ok = context.customer_failure_history < 5 or proposed_action in ["STOP", "HOLD", "ESCALATE"]
        checks.append({
            "label": "Customer Cooldown",
            "value": "Satisfied" if fatigue_ok else "Customer fatigue limit exceeded",
            "passed": fatigue_ok,
        })
        if not fatigue_ok:
            violations.append("Customer fatigue limit reached (>4 recent failures)")

        passed = len(violations) == 0
        return passed, violations, checks

    async def process(self, context: AgentContext) -> AgentResult:
        strategy = context.metadata.get("strategy", "Dynamic Recovery")
        proposed_action = context.metadata.get("next_action")
        if not proposed_action:
            if "Retry" in strategy:
                proposed_action = "CUSTOMER_RETRY"
            elif "Link" in strategy:
                proposed_action = "GENERATE_RECOVERY_LINK"
            else:
                proposed_action = "HOLD"

        policy_passed, violations, checks = self.evaluate_policies(context, proposed_action)

        llm_output = await LLMAdapter.generate_reasoning(
            prompt_type="action",
            context={
                "strategy": strategy,
                "proposed_action": proposed_action,
                "amount": context.amount,
                "attempt_count": context.attempt_count,
                "violations": violations,
            },
        )

        if not policy_passed:
            decision = "BLOCKED_BY_POLICY"
            reasoning = f"Autonomous action blocked by bounded policy: {'; '.join(violations)}."
            action_enum = "STOP" if "fatigue" in str(violations) or "limit" in str(violations) else "ESCALATE"
            if "exceeds" in str(violations):
                action_taken = "ESCALATE_TO_HUMAN"
            elif "retry limit" in str(violations):
                action_taken = "STOP_RECOVERY"
            else:
                action_taken = f"EXECUTE_{action_enum}"
        else:
            decision = "POLICY_APPROVED"
            action_enum = proposed_action
            action_taken = f"EXECUTE_{action_enum}"
            reasoning = f"Policy approved. Action Agent authorized to execute '{action_enum}'."

        return AgentResult(
            agent_name=self.name,
            decision=decision,
            confidence=llm_output.get("confidence", 98 if policy_passed else 100),
            reasoning_summary=reasoning,
            policy_passed=policy_passed,
            policy_violations=violations,
            action_taken=action_taken,
            action_enum=action_enum,
            next_action=action_enum,
            latency_ms=llm_output.get("_latency_ms", 10),
            tokens_used=llm_output.get("_tokens_used", 120),
            metadata={
                "checks": checks,
                "action_enum": action_enum,
                "action": action_taken,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
