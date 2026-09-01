import asyncio
import json
import uuid
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger
from app.websocket.manager import ws_manager


class RedisEventSubscriber:
    """
    Background subscriber listening to merchant Redis event channels
    and piping real-time events to active WebSocket client pools.
    """

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._listen_loop())
        logger.info("Redis event subscriber background task started.")

    async def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Redis event subscriber stopped.")

    async def _listen_loop(self):
        """Subscribe to revivepilot:merchant:* channels with auto-reconnection."""
        while self._running:
            client = None
            pubsub = None
            try:
                client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=5.0,
                )
                pubsub = client.pubsub()
                await pubsub.psubscribe("revivepilot:merchant:*")
                logger.info("Subscribed to Redis pattern revivepilot:merchant:*")

                while self._running:
                    try:
                        message = await pubsub.get_message(
                            ignore_subscribe_messages=True,
                            timeout=1.0,
                        )
                        if message and message.get("type") == "pmessage":
                            channel = message.get("channel", "")
                            # Extract merchant_id from channel: revivepilot:merchant:<uuid>
                            parts = channel.split(":")
                            if len(parts) >= 3:
                                merchant_str = parts[2]
                                try:
                                    merchant_id = uuid.UUID(merchant_str)
                                    raw_data = message.get("data")
                                    if raw_data:
                                        payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                                        await ws_manager.send_to_merchant(merchant_id, payload)
                                except (ValueError, json.JSONDecodeError) as exc:
                                    logger.warning(f"Error handling Redis message on {channel}: {exc}")
                    except asyncio.CancelledError:
                        raise
                    except Exception as exc:
                        logger.warning(f"Error in Redis subscriber poll: {exc}")
                        await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Redis subscriber connection error (retrying in 5s): {exc}")
                await asyncio.sleep(5.0)
            finally:
                if pubsub:
                    try:
                        await pubsub.close()
                    except Exception:
                        pass
                if client:
                    try:
                        await client.close()
                    except Exception:
                        pass


redis_subscriber = RedisEventSubscriber()
