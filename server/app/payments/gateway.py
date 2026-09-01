from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from decimal import Decimal


class PaymentGateway(ABC):
    """
    Abstract payment gateway interface.
    Decouples payment processing and event ingestion from specific provider adapters.
    """

    @abstractmethod
    async def simulate_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method: str,
        scenario: str = "NORMAL",
        failure_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Simulate or authorize a payment event."""
        pass


class SimulatorPaymentGateway(PaymentGateway):
    """
    Controlled safe test gateway for Buildathon demonstrations.
    Produces realistic synthetic payment outcomes without real financial movement.
    """

    async def simulate_payment(
        self,
        amount: Decimal,
        currency: str = "INR",
        payment_method: str = "CARD",
        scenario: str = "NORMAL",
        failure_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        if failure_reason:
            status = "FAILED"
        elif scenario == "FAILURE_SPIKE":
            status = "FAILED"
            failure_reason = failure_reason or "BANK_TIMEOUT"
        elif scenario == "BANK_TIMEOUT":
            status = "FAILED"
            failure_reason = "BANK_TIMEOUT"
        elif scenario == "INSUFFICIENT_FUNDS":
            status = "FAILED"
            failure_reason = "INSUFFICIENT_FUNDS"
        else:
            status = "SUCCESS"
            failure_reason = None

        return {
            "status": status,
            "failure_reason": failure_reason,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "gateway": "SIMULATOR",
        }
