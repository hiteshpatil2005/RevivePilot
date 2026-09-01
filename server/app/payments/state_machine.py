from typing import Dict, Set, Optional
from fastapi import HTTPException, status


class PaymentStateMachine:
    """
    Strict transaction state machine preventing arbitrary or corrupting state changes.
    """
    VALID_TRANSITIONS: Dict[str, Set[str]] = {
        "CREATED": {"PENDING", "FAILED", "CANCELLED", "SUCCESS"},
        "PENDING": {"SUCCESS", "FAILED", "CANCELLED"},
        "FAILED": {"PENDING", "REFUNDED", "FAILED"},  # FAILED -> PENDING allowed on retry intervention
        "SUCCESS": {"REFUNDED"},
        "CANCELLED": set(),
        "REFUNDED": set(),
    }

    @classmethod
    def can_transition(cls, current_status: Optional[str], new_status: str) -> bool:
        if not current_status:
            return True
        curr = current_status.upper()
        target = new_status.upper()
        if curr == target:
            return True
        allowed = cls.VALID_TRANSITIONS.get(curr, set())
        return target in allowed

    @classmethod
    def validate_transition(cls, current_status: Optional[str], new_status: str):
        if not cls.can_transition(current_status, new_status):
            curr = current_status.upper() if current_status else "NONE"
            target = new_status.upper()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Illegal payment transition from {curr} to {target}. Not permitted by transaction state machine.",
            )
