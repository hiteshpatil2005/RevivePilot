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


from app.payments.failure_taxonomy import generate_razorpay_error_payload, get_failure_profile


class SimulatorPaymentGateway(PaymentGateway):
    """
    Controlled safe test gateway for Buildathon demonstrations.
    Produces realistic synthetic payment outcomes and authentic Razorpay error payloads
    without real financial movement.
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
        elif scenario == "NORMAL":
            status = "SUCCESS"
            failure_reason = None
        else:
            # If scenario itself is one of the failure codes
            status = "FAILED"
            failure_reason = scenario

        error_payload = None
        if status == "FAILED":
            error_payload = generate_razorpay_error_payload(
                failure_reason=failure_reason,
                payment_id="pay_simulated",
            )

        return {
            "status": status,
            "failure_reason": failure_reason,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "gateway": "RAZORPAY_SIMULATOR",
            "razorpay_error": error_payload,
        }
