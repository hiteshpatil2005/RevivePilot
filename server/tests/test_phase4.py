import uuid
import pytest
from decimal import Decimal
from httpx import AsyncClient

from app.agents.schemas import AgentContext
from app.agents.detection_agent import DetectionAgent
from app.agents.root_cause_agent import RootCauseAgent
from app.agents.strategy_agent import StrategyAgent
from app.agents.action_agent import ActionAgent


@pytest.mark.asyncio
async def test_detection_agent_classification():
    """Test Detection Agent risk, urgency, and tier classification."""
    agent = DetectionAgent()
    context = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("75000.00"),
        failureReason="BANK_TIMEOUT",
        customerLtv=Decimal("180000.00"),
    )

    result = await agent.execute(context)
    assert result.agent_name == "Detection Agent"
    assert result.decision == "RECOVERY_QUALIFIED"
    assert result.confidence >= 90
    assert result.metadata["urgency"] == "HIGH"
    assert result.metadata["customer_tier"] == "ENTERPRISE"
    assert result.metadata["risk_score"] >= 70
    assert result.latency_ms >= 0


@pytest.mark.asyncio
async def test_root_cause_agent_diagnosis():
    """Test Root Cause Agent technical vs financial breakdown."""
    agent = RootCauseAgent()

    # 1. Technical Bank Timeout
    ctx1 = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("12000.00"),
        failureReason="BANK_TIMEOUT",
    )
    res1 = await agent.execute(ctx1)
    assert res1.decision == "TECHNICAL_INFRASTRUCTURE"
    assert res1.metadata["is_temporary"] is True
    assert "timeout" in res1.reasoning_summary.lower()

    # 2. Financial Insufficient Funds
    ctx2 = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("5000.00"),
        failureReason="INSUFFICIENT_FUNDS",
    )
    res2 = await agent.execute(ctx2)
    assert res2.decision == "FINANCIAL_LIQUIDITY"
    assert res2.confidence >= 90


@pytest.mark.asyncio
async def test_strategy_agent_formulation():
    """Test Strategy Agent recovery approach and probability."""
    agent = StrategyAgent()

    # 1. Bank timeout -> Smart Delayed Retry
    ctx1 = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("15000.00"),
        failureReason="BANK_TIMEOUT",
    )
    res1 = await agent.execute(ctx1)
    assert res1.recommended_strategy == "Smart Delayed Retry"
    assert res1.recovery_probability == 90

    # 2. High value transaction (>100,000) -> VIP Escalation
    ctx2 = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("125000.00"),
        failureReason="CARD_DECLINED",
    )
    res2 = await agent.execute(ctx2)
    assert res2.recommended_strategy == "VIP Escalation"
    assert res2.recovery_probability == 85


@pytest.mark.asyncio
async def test_action_agent_bounded_autonomy_policies():
    """Test Action Agent policy enforcement and stopping rules."""
    agent = ActionAgent()

    # 1. Valid case within limits -> APPROVED
    ctx_ok = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("25000.00"),
        failureReason="BANK_TIMEOUT",
        attemptCount=1,
        maxAttempts=3,
        metadata={"strategy": "Delayed Retry"},
    )
    res_ok = await agent.execute(ctx_ok)
    assert res_ok.decision == "POLICY_APPROVED"
    assert res_ok.policy_passed is True
    assert len(res_ok.policy_violations) == 0

    # 2. Max attempts reached -> BLOCKED & STOP
    ctx_blocked = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("25000.00"),
        failureReason="BANK_TIMEOUT",
        attemptCount=3,
        maxAttempts=3,
        metadata={"strategy": "Delayed Retry"},
    )
    res_blocked = await agent.execute(ctx_blocked)
    assert res_blocked.decision == "BLOCKED_BY_POLICY"
    assert res_blocked.policy_passed is False
    assert any("retry limit" in v.lower() for v in res_blocked.policy_violations)

    # 3. Excessive amount (>150,000) -> BLOCKED & ESCALATE
    ctx_high = AgentContext(
        caseId=uuid.uuid4(),
        merchantId=uuid.uuid4(),
        transactionId=uuid.uuid4(),
        customerId=uuid.uuid4(),
        amount=Decimal("250000.00"),
        failureReason="BANK_TIMEOUT",
        attemptCount=1,
        maxAttempts=3,
        metadata={"strategy": "Delayed Retry"},
    )
    res_high = await agent.execute(ctx_high)
    assert res_high.policy_passed is False
    assert res_high.action_taken == "ESCALATE_TO_HUMAN"


@pytest.mark.asyncio
async def test_full_autonomous_multi_agent_pipeline(client: AsyncClient):
    """
    Test end-to-end multi-agent analysis and execution on a real RecoveryCase.
    """
    # 1. Register merchant
    reg_res = await client.post(
        "/api/auth/register",
        json={
            "businessName": "Agentic Labs Inc",
            "fullName": "Agent Admin",
            "email": "agentic@labs.com",
            "password": "securePassword123",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Emit failed payment event to create case
    ev_res = await client.post(
        "/api/payments/events",
        headers={**headers, "Idempotency-Key": f"agent_test_{uuid.uuid4().hex[:8]}"},
        json={
            "eventType": "PAYMENT_FAILED",
            "amount": 42000.0,
            "failureReason": "BANK_TIMEOUT",
            "paymentMethod": "CARD",
        },
    )
    assert ev_res.status_code == 201

    # 3. Retrieve created case
    cases_res = await client.get("/api/recovery/cases", headers=headers)
    assert cases_res.status_code == 200
    cases = cases_res.json()["cases"]
    assert len(cases) >= 1
    target_case = cases[0]
    case_id = target_case["id"]

    # 4. Trigger Autonomous Multi-Agent Analysis
    analyze_res = await client.post(
        f"/api/recovery/cases/{case_id}/analyze",
        headers=headers,
    )
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()
    assert analysis["status"] in ["APPROVED", "EXECUTING"]
    assert analysis["rootCause"] == "BANK_TIMEOUT"
    assert "Retry" in analysis["strategy"]
    assert analysis["policyPassed"] is True
    assert len(analysis["agentTraces"]) == 4

    # 5. Trigger Autonomous Action Execution
    exec_res = await client.post(
        f"/api/recovery/cases/{case_id}/execute",
        headers=headers,
    )
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["status"] == "EXECUTING"

    # 6. Verify Agent Monitor Endpoints
    status_res = await client.get("/api/agents/status", headers=headers)
    assert status_res.status_code == 200
    agents_list = status_res.json()
    assert len(agents_list) == 4
    agent_names = [a["name"] for a in agents_list]
    assert "Detection Agent" in agent_names
    assert "Root Cause Agent" in agent_names
    assert "Strategy Agent" in agent_names
    assert "Action Agent" in agent_names

    activity_res = await client.get("/api/agents/activity", headers=headers)
    assert activity_res.status_code == 200
    activities = activity_res.json()
    assert len(activities) >= 1
