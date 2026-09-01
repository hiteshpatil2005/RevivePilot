from typing import List
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.models.user import User
from app.agents.schemas import AgentStatus, AgentActivity
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["AI Agents"])


@router.get("/status", response_model=List[AgentStatus])
async def get_agent_statuses(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve real-time operating status and efficiency metrics for all AI agents.
    """
    return AgentService.get_agent_statuses()


@router.get("/activity", response_model=List[AgentActivity])
async def get_agent_activities(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve recent chronological activity log across all autonomous agents.
    """
    return AgentService.get_agent_activities()
