import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch

from app.agents.schemas import AgentContext
from app.agents.detection_agent import DetectionAgent
from app.agents.root_cause_agent import RootCauseAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.action_agent import ActionAgent
from app.agents.llm import LLMAdapter
from app.core.config import settings


@pytest.mark.asyncio
async def test_gemini_detection_agent_live():
    """Test DetectionAgent with live Gemini reasoning."""
    context = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("45000.00"),
        currency="INR",
        failureReason="BANK_TIMEOUT",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        customerName="Hitesh Patil",
        customerEmail="hiteshpatil0205@gmail.com",
        customerLtv=Decimal("120000.00"),
        customerFailureHistory=0,
        metadata={},
    )

    agent = DetectionAgent()
    result = await agent.process(context)

    assert result.agent_name == "Detection Agent"
    assert result.decision in ["RECOVERY_QUALIFIED", "RECOVERY_EXCLUDED"]
    assert 0 <= result.confidence <= 100
    assert len(result.reasoning_summary) > 20
    assert "urgency" in result.metadata
    assert result.metadata["risk_score"] >= 10


@pytest.mark.asyncio
async def test_gemini_root_cause_agent_across_taxonomies():
    """Test RootCauseAgent across technical and financial taxonomy categories."""
    agent = RootCauseAgent()

    # 1. Technical Bank Timeout
    ctx_timeout = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("1500.00"),
        currency="INR",
        failureReason="BANK_TIMEOUT",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        metadata={},
    )
    res_timeout = await agent.process(ctx_timeout)
    assert res_timeout.decision is not None
    assert res_timeout.metadata["is_temporary"] is True

    # 2. UPI failure
    ctx_upi = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("850.00"),
        currency="INR",
        failureReason="INVALID_UPI_ID",
        paymentMethod="UPI",
        attemptCount=1,
        maxAttempts=3,
        metadata={},
    )
    res_upi = await agent.process(ctx_upi)
    assert res_upi.confidence >= 50
    assert "reasoning_summary" in res_upi.model_dump()


@pytest.mark.asyncio
async def test_gemini_strategy_agent_formulation():
    """Test StrategyAgent selects appropriate recovery action."""
    agent = StrategyAgent()

    # Regular payment
    ctx = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("5000.00"),
        currency="INR",
        failureReason="CARD_DECLINED",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        customerLtv=Decimal("45000.00"),
        metadata={},
    )
    res = await agent.process(ctx)
    assert res.recommended_strategy is not None
    assert 10 <= res.recovery_probability <= 100
    assert res.metadata["alternate_method"] in ["UPI", "NET_BANKING", "CARD", "UPI_QR", "UPI_INTENT", "SMART_LINK", "UPI_AUTOPAY"]


@pytest.mark.asyncio
async def test_gemini_vip_escalation_override():
    """Verify transactions > ₹100,000 trigger VIP Escalation strategy."""
    agent = StrategyAgent()
    ctx_vip = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("125000.00"),
        currency="INR",
        failureReason="BANK_TIMEOUT",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        metadata={},
    )
    res_vip = await agent.process(ctx_vip)
    assert res_vip.recommended_strategy == "VIP Escalation"
    assert res_vip.recovery_probability >= 80


@pytest.mark.asyncio
async def test_action_agent_bounded_autonomy_approval():
    """Test ActionAgent approves valid low-risk recovery under limit."""
    agent = ActionAgent()
    ctx = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("12000.00"),
        currency="INR",
        failureReason="BANK_TIMEOUT",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        customerFailureHistory=0,
        metadata={"strategy": "Delayed Retry"},
    )
    res = await agent.process(ctx)
    assert res.policy_passed is True
    assert res.decision == "POLICY_APPROVED"
    assert "EXECUTE_" in res.action_taken


@pytest.mark.asyncio
async def test_action_agent_bounded_autonomy_block_high_amount():
    """Test ActionAgent blocks autonomous recovery exceeding ₹150,000 threshold."""
    agent = ActionAgent()
    ctx_high = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("185000.00"),
        currency="INR",
        failureReason="BANK_TIMEOUT",
        paymentMethod="CARD",
        attemptCount=1,
        maxAttempts=3,
        customerFailureHistory=0,
        metadata={"strategy": "Delayed Retry"},
    )
    res_high = await agent.process(ctx_high)
    assert res_high.policy_passed is False
    assert res_high.decision == "BLOCKED_BY_POLICY"
    assert res_high.action_taken == "ESCALATE_TO_HUMAN"


@pytest.mark.asyncio
async def test_llm_adapter_infallible_fallback():
    """Test that LLMAdapter seamlessly falls back to heuristics if Gemini key is missing."""
    with patch.object(settings, "GEMINI_API_KEY", ""):
        with patch.object(settings, "GOOGLE_API_KEY", ""):
            res = await LLMAdapter.generate_reasoning(
                prompt_type="detection",
                context={"failure_reason": "BANK_TIMEOUT", "amount": 5000, "customer_ltv": 20000},
            )
            assert res["decision"] == "RECOVERY_QUALIFIED"
            assert res["_ai_model"] == "heuristic-taxonomy-engine"
            assert len(res["reasoning"]) > 10
