import asyncio
import random
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import async_session_maker
from app.payments.schemas import SimulatorConfig, SimulatorStatusResponse
from app.payments.event_service import PaymentEventService
from app.models.customer import Customer
from app.core.logging import logger


class MerchantSimulatorState:
    def __init__(self, merchant_id: uuid.UUID, config: SimulatorConfig):
        self.merchant_id = merchant_id
        self.config = config
        self.running = False
        self.paused = False
        self.task: Optional[asyncio.Task] = None
        self.total_events_emitted = 0
        self.started_at: Optional[datetime] = None


class PaymentSimulator:
    """
    Controlled background payment event simulator.
    Generates realistic payment failure spikes, bank timeouts, and normal traffic
    for live buildathon demonstrations without touching real money or cards.
    """
    _instances: Dict[uuid.UUID, MerchantSimulatorState] = {}

    SCENARIO_PROFILES = {
        "NORMAL_TRAFFIC": {
            "failure_rate": 0.15,
            "reasons": ["BANK_TIMEOUT", "CARD_DECLINED"],
            "min_amount": 1200,
            "max_amount": 25000,
        },
        "FAILURE_SPIKE": {
            "failure_rate": 0.75,
            "reasons": ["BANK_TIMEOUT", "CARD_DECLINED", "NETWORK_ERROR"],
            "min_amount": 5000,
            "max_amount": 65000,
        },
        "BANK_TIMEOUT": {
            "failure_rate": 0.85,
            "reasons": ["BANK_TIMEOUT"],
            "min_amount": 10000,
            "max_amount": 45000,
        },
        "INSUFFICIENT_FUNDS": {
            "failure_rate": 0.85,
            "reasons": ["INSUFFICIENT_FUNDS"],
            "min_amount": 2500,
            "max_amount": 22000,
        },
        "HIGH_VALUE_FAILURE": {
            "failure_rate": 0.80,
            "reasons": ["CARD_DECLINED", "LIMIT_EXCEEDED", "BANK_TIMEOUT"],
            "min_amount": 55000,
            "max_amount": 185000,
        },
        "MIXED_RISK": {
            "failure_rate": 0.65,
            "reasons": ["BANK_TIMEOUT", "CARD_DECLINED", "INSUFFICIENT_FUNDS", "MANDATE_FAILED"],
            "min_amount": 3500,
            "max_amount": 95000,
        },
    }

    PAYMENT_METHODS = ["CARD", "UPI", "NET_BANKING", "WALLET"]

    @classmethod
    def get_state(cls, merchant_id: uuid.UUID) -> MerchantSimulatorState:
        if merchant_id not in cls._instances:
            cls._instances[merchant_id] = MerchantSimulatorState(
                merchant_id, SimulatorConfig()
            )
        return cls._instances[merchant_id]

    @classmethod
    async def start(cls, merchant_id: uuid.UUID, config: SimulatorConfig) -> SimulatorStatusResponse:
        state = cls.get_state(merchant_id)
        if state.running and state.task and not state.task.done():
            # Update config on the fly
            state.config = config
            state.paused = False
            return cls.get_status(merchant_id)

        state.config = config
        state.running = True
        state.paused = False
        state.started_at = datetime.now(timezone.utc)
        state.task = asyncio.create_task(cls._run_simulation(state))
        logger.info(f"Started payment simulator for merchant {merchant_id} ({config.scenario})")
        return cls.get_status(merchant_id)

    @classmethod
    async def stop(cls, merchant_id: uuid.UUID) -> SimulatorStatusResponse:
        state = cls.get_state(merchant_id)
        state.running = False
        state.paused = False
        if state.task and not state.task.done():
            state.task.cancel()
            try:
                await state.task
            except asyncio.CancelledError:
                pass
        state.task = None
        logger.info(f"Stopped payment simulator for merchant {merchant_id}")
        return cls.get_status(merchant_id)

    @classmethod
    def pause(cls, merchant_id: uuid.UUID) -> SimulatorStatusResponse:
        state = cls.get_state(merchant_id)
        state.paused = True
        return cls.get_status(merchant_id)

    @classmethod
    def resume(cls, merchant_id: uuid.UUID) -> SimulatorStatusResponse:
        state = cls.get_state(merchant_id)
        state.paused = False
        return cls.get_status(merchant_id)

    @classmethod
    def get_status(cls, merchant_id: uuid.UUID) -> SimulatorStatusResponse:
        state = cls.get_state(merchant_id)
        is_active = state.running and bool(state.task and not state.task.done()) and not state.paused
        return SimulatorStatusResponse(
            running=is_active,
            scenario=state.config.scenario,
            eventsPerMinute=state.config.events_per_minute,
            totalEventsEmitted=state.total_events_emitted,
            startedAt=state.started_at,
        )

    _session_maker = async_session_maker

    @classmethod
    def set_session_maker(cls, session_maker):
        cls._session_maker = session_maker

    @classmethod
    async def emit_single_event(
        cls,
        merchant_id: uuid.UUID,
        scenario: Optional[str] = None,
        failure_reason: Optional[str] = None,
        amount: Optional[Decimal] = None,
        payment_method: str = "CARD",
        session: Optional[AsyncSession] = None,
    ):
        """Emit a single synthetic event on demand."""
        state = cls.get_state(merchant_id)
        scen = scenario or state.config.scenario
        profile = cls.SCENARIO_PROFILES.get(scen, cls.SCENARIO_PROFILES["NORMAL_TRAFFIC"])

        is_failure = bool(failure_reason) or (random.random() < profile["failure_rate"])
        reason = failure_reason or (random.choice(profile["reasons"]) if is_failure else None)

        if amount:
            amt = amount
        else:
            raw_amt = random.randint(profile["min_amount"], profile["max_amount"])
            amt = Decimal(str(raw_amt))

        method = payment_method or random.choice(cls.PAYMENT_METHODS)
        ev_type = "PAYMENT_FAILED" if is_failure else "PAYMENT_SUCCESS"

        if session:
            await PaymentEventService.process_payment_event(
                session=session,
                merchant_id=merchant_id,
                event_type=ev_type,
                amount=amt,
                payment_method=method,
                failure_reason=reason,
                source="SIMULATOR",
            )
        else:
            async with cls._session_maker() as sess:
                await PaymentEventService.process_payment_event(
                    session=sess,
                    merchant_id=merchant_id,
                    event_type=ev_type,
                    amount=amt,
                    payment_method=method,
                    failure_reason=reason,
                    source="SIMULATOR",
                )
        state.total_events_emitted += 1

    @classmethod
    async def _run_simulation(cls, state: MerchantSimulatorState):
        """Continuous background event emitter loop."""
        try:
            while state.running:
                if not state.paused:
                    rate = max(1, state.config.events_per_minute)
                    interval = 60.0 / rate

                    try:
                        await cls.emit_single_event(state.merchant_id)
                    except Exception as exc:
                        logger.error(f"Simulator error for merchant {state.merchant_id}: {exc}")

                    await asyncio.sleep(interval)
                else:
                    await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            pass
        finally:
            state.running = False


payment_simulator = PaymentSimulator()
