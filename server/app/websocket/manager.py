import uuid
import json
from typing import Dict, List, Set, Any
from fastapi import WebSocket
from app.core.logging import logger


class ConnectionManager:
    """
    WebSocket Connection Manager scoping connected clients by merchant ID.
    Enables targeted merchant notifications and broadcasts.
    """

    def __init__(self):
        # Map merchant_id -> Set of active WebSocket connections
        self.active_connections: Dict[uuid.UUID, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, merchant_id: uuid.UUID):
        await websocket.accept()
        if merchant_id not in self.active_connections:
            self.active_connections[merchant_id] = set()
        self.active_connections[merchant_id].add(websocket)
        logger.info(f"WebSocket connected: merchant {merchant_id} ({len(self.active_connections[merchant_id])} active)")

    def disconnect(self, websocket: WebSocket, merchant_id: uuid.UUID):
        if merchant_id in self.active_connections:
            self.active_connections[merchant_id].discard(websocket)
            if not self.active_connections[merchant_id]:
                del self.active_connections[merchant_id]
        logger.info(f"WebSocket disconnected: merchant {merchant_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_to_merchant(self, merchant_id: uuid.UUID, data: Any):
        """Send message only to active connections for a specific merchant."""
        if merchant_id in self.active_connections:
            message = json.dumps(data) if not isinstance(data, str) else data
            dead_connections = []
            for connection in self.active_connections[merchant_id]:
                try:
                    await connection.send_text(message)
                except Exception as exc:
                    logger.warning(f"Error sending WebSocket message: {exc}")
                    dead_connections.append(connection)

            # Cleanup broken sockets
            for dead in dead_connections:
                self.active_connections[merchant_id].discard(dead)

    async def broadcast(self, data: Any):
        """Broadcast message to all connected clients."""
        message = json.dumps(data) if not isinstance(data, str) else data
        for merchant_id in list(self.active_connections.keys()):
            await self.send_to_merchant(merchant_id, message)


ws_manager = ConnectionManager()
