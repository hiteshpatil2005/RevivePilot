import json
import uuid
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger
from app.events.event_types import EventType
from app.events.event_schema import EventSchema

_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Retrieve or initialize the async Redis connection pool."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=2.0,
            )
        except Exception as exc:
            logger.warning(f"Could not connect to Redis: {exc}")
            _redis_client = None
    return _redis_client


async def check_redis_connection() -> bool:
    """Verify Redis reachability for health check endpoint."""
    try:
        client = await get_redis_client()
        if client:
            await client.ping()
            return True
        return False
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return False


class EventPublisher:
    """
    Decoupled Event Publisher that broadcasts canonical events to Redis channels.
    Channels are scoped by merchant: `revivepilot:merchant:{merchant_id}`.
    """

    @classmethod
    async def publish(cls, event: EventSchema) -> bool:
        channel = f"revivepilot:merchant:{event.merchant_id}"
        message = event.model_dump_json()

        try:
            client = await get_redis_client()
            if client:
                await client.publish(channel, message)
                logger.debug(f"Published event {event.event_type} to channel {channel}")
                return True
        except Exception as exc:
            logger.warning(f"Failed to publish event to Redis: {exc}")

        # In dev mode without Redis, still log the event cleanly
        logger.info(f"[DEV EVENT] {event.event_type} for merchant {event.merchant_id}")
        return False

    @classmethod
    async def publish_raw(cls, channel: str, payload: Dict[str, Any]) -> bool:
        """Publish raw JSON dictionary to a designated Redis channel."""
        try:
            client = await get_redis_client()
            if client:
                await client.publish(channel, json.dumps(payload))
                return True
        except Exception as exc:
            logger.warning(f"Failed to publish raw event to Redis: {exc}")
        return False

    @classmethod
    async def publish_event(
        cls,
        event_type: EventType,
        merchant_id: uuid.UUID,
        case_id: Optional[uuid.UUID] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> EventSchema:
        """Helper to create and publish a standard event in one call."""
        event = EventSchema(
            event_type=event_type,
            merchant_id=merchant_id,
            case_id=case_id,
            data=data or {},
        )
        await cls.publish(event)
        return event


event_publisher = EventPublisher()
