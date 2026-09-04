from decimal import Decimal
from typing import List, Dict, Any, Tuple
from app.agents.base import BaseAgent
from app.agents.schemas import AgentContext, AgentResult
from app.agents.llm import LLMAdapter
from app.core.config import settings


class ActionAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Action Agent", agent_type="learning")

    def evaluate_policies(
        self,
        context: AgentContext,
        strategy: str,
    ) -> Tuple[bool, List[str], List[Dict[str, Any]]]:
        """
        Enforces Bounded Autonomy rules:
        1. Max Retries: attempt_count < max_attempts (default 3)
        2. Transaction Value Cap: amount <= 150000 for autonomous action
        3. Fraud/Customer Fatigue: customer_failure_history < 5
        4. Stopping Rules: Hard stop if maximum retries reached
        """
        violations = []
        checks = []

        # Check 1: Maximum Retries
        retries_ok = context.attempt_count < context.max_attempts
        checks.append({
            "label": "Maximum retries",
            "value": f"{context.attempt_count} / {context.max_attempts}",
            "passed": retries_ok,
        })
        if not retries_ok:
            violations.append(f"Maximum retry limit ({context.max_attempts}) reached for case")

        # Check 2: Transaction Value Cap
        max_auto_amount = Decimal("150000.00")
        amount_ok = context.amount <= max_auto_amount
        checks.append({
            "label": "Amount limit",
            "value": f"INR {context.amount:,.2f} <= {max_auto_amount:,.2f}",
            "passed": amount_ok,
        })
        if not amount_ok:
            violations.append(f"Amount INR {context.amount:,.2f} exceeds autonomous limit of INR {max_auto_amount:,.2f}")

        # Check 3: Customer Cooldown / Fatigue
        fatigue_ok = context.customer_failure_history < 5
        checks.append({
            "label": "Cooldown period",
            "value": "Satisfied" if fatigue_ok else "Customer fatigue limit exceeded",
            "passed": fatigue_ok,
        })
        if not fatigue_ok:
            violations.append("Customer fatigue limit reached (>4 recent failures)")

        passed = len(violations) == 0
        return passed, violations, checks

    async def process(self, context: AgentContext) -> AgentResult:
        strategy = context.metadata.get("strategy", "Delayed Retry")
        policy_passed, violations, checks = self.evaluate_policies(context, strategy)

        llm_output = await LLMAdapter.generate_reasoning(
            prompt_type="action",
            context={
                "strategy": strategy,
                "amount": context.amount,
                "attempt_count": context.attempt_count,
                "customer_failure_history": context.customer_failure_history,
                "violations": violations,
            },
        )

        if not policy_passed:
            decision = "BLOCKED_BY_POLICY"
            reasoning = llm_output.get("reasoning") or f"Autonomous action blocked by bounded autonomy rules: {'; '.join(violations)}."
            action_taken = "ESCALATE_TO_HUMAN" if "exceeds autonomous limit" in str(violations) else "STOP_RECOVERY"
        else:
            decision = "POLICY_APPROVED"
            reasoning = llm_output.get("reasoning") or f"All bounded autonomy policies satisfied. Autonomous recovery strategy '{strategy}' approved for execution."
            action_taken = f"EXECUTE_{strategy.upper().replace(' ', '_')}"

        return AgentResult(
            agent_name=self.name,
            decision=decision,
            confidence=llm_output.get("confidence", 98 if policy_passed else 100),
            reasoning_summary=reasoning,
            policy_passed=policy_passed,
            policy_violations=violations,
            action_taken=action_taken,
            latency_ms=llm_output.get("_latency_ms", 10),
            tokens_used=llm_output.get("_tokens_used", 120),
            metadata={
                "checks": checks,
                "action": action_taken,
                "ai_model": llm_output.get("_ai_model", settings.GEMINI_MODEL),
            },
        )
