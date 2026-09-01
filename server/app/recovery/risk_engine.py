from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, NamedTuple


class RiskEvaluationResult(NamedTuple):
    risk_score: int
    recovery_probability: float
    expected_recovery_amount: Decimal
    recommended_strategy: str
    qualifies_for_recovery: bool


class DeterministicRiskEngine:
    """
    Deterministic revenue risk evaluation engine.
    Calculates leakage risk, recovery probability, and strategy based on financial
    and gateway failure parameters without relying on external LLM calls.
    """

    REASON_PROFILES: Dict[str, Dict[str, Any]] = {
        "BANK_TIMEOUT": {
            "base_risk": 75,
            "base_prob": 0.90,
            "strategy": "Delayed Retry",
            "qualifies": True,
        },
        "CARD_DECLINED": {
            "base_risk": 85,
            "base_prob": 0.65,
            "strategy": "Smart Alternative Link",
            "qualifies": True,
        },
        "INSUFFICIENT_FUNDS": {
            "base_risk": 65,
            "base_prob": 0.75,
            "strategy": "Delayed Retry + Balance Nudge",
            "qualifies": True,
        },
        "NETWORK_ERROR": {
            "base_risk": 60,
            "base_prob": 0.90,
            "strategy": "Instant Network Retry",
            "qualifies": True,
        },
        "MANDATE_FAILED": {
            "base_risk": 75,
            "base_prob": 0.70,
            "strategy": "Mandate Re-presentation",
            "qualifies": True,
        },
        "LIMIT_EXCEEDED": {
            "base_risk": 80,
            "base_prob": 0.60,
            "strategy": "Alternative Payment Method",
            "qualifies": True,
        },
        "AUTHENTICATION_FAILED": {
            "base_risk": 70,
            "base_prob": 0.70,
            "strategy": "Authentication Re-prompt",
            "qualifies": True,
        },
        "UNKNOWN_FAILURE": {
            "base_risk": 80,
            "base_prob": 0.40,
            "strategy": "Manual Review",
            "qualifies": True,
        },
    }

    @classmethod
    def evaluate(
        cls,
        amount: Decimal,
        failure_reason: Optional[str] = None,
        previous_attempts: int = 0,
        customer_failure_count: int = 0,
    ) -> RiskEvaluationResult:
        reason_key = (failure_reason or "UNKNOWN_FAILURE").upper()
        profile = cls.REASON_PROFILES.get(
            reason_key,
            cls.REASON_PROFILES["UNKNOWN_FAILURE"],
        )

        risk_score = profile["base_risk"]
        recovery_prob = profile["base_prob"]
        strategy = profile["strategy"]

        # Factor 1: High Transaction Value Adjustments
        # Higher transaction amounts carry greater revenue leakage risk
        if amount >= Decimal("100000.00"):
            risk_score = min(98, risk_score + 15)
            strategy = "VIP Escalation"
        elif amount >= Decimal("50000.00"):
            risk_score = min(95, risk_score + 10)
            if risk_score > 85:
                strategy = "VIP Escalation"
        elif amount <= Decimal("2000.00"):
            risk_score = max(30, risk_score - 15)

        # Factor 2: Repeated failure attempts penalize recovery probability
        if previous_attempts > 0:
            recovery_prob = max(0.15, recovery_prob - (previous_attempts * 0.15))
            risk_score = min(99, risk_score + (previous_attempts * 5))

        # Factor 3: Customer failure history
        if customer_failure_count > 2:
            recovery_prob = max(0.10, recovery_prob - 0.10)
            risk_score = min(99, risk_score + 8)

        recovery_prob = round(recovery_prob, 2)

        # Calculate expected recovery amount using exact Decimal arithmetic
        expected_amount = (amount * Decimal(str(recovery_prob))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        return RiskEvaluationResult(
            risk_score=risk_score,
            recovery_probability=recovery_prob,
            expected_recovery_amount=expected_amount,
            recommended_strategy=strategy,
            qualifies_for_recovery=profile["qualifies"],
        )
