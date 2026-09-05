from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.agents.schemas import AgentStatus, AgentActivity
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["AI Agents"])


@router.get("/status", response_model=List[AgentStatus])
async def get_agent_statuses(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve real-time operating status and efficiency metrics for all AI agents computed from PostgreSQL records.
    """
    return await AgentService.get_agent_statuses(
        session=session,
        merchant_id=current_user.merchant_id,
    )


@router.get("/activity", response_model=List[AgentActivity])
async def get_agent_activities(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve recent chronological activity log across all autonomous agents.
    """
    return AgentService.get_agent_activities()
