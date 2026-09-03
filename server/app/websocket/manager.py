import uuid
import json
from typing import Dict, List, Set, Any
from fastapi import WebSocket
from app.core.logging import logger
from app.websocket.socketio_server import emit_to_merchant, emit_to_customer


class ConnectionManager:
    """
    Dual WebSocket & Socket.IO Connection Manager scoping connected clients strictly by merchant ID.
    Enforces tenant isolation across all realtime gateways.
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
        """Send message strictly to active WebSocket connections and Socket.IO room for this merchant."""
        parsed_data = json.loads(data) if isinstance(data, str) else data
        event_type = parsed_data.get("type", "EVENT") if isinstance(parsed_data, dict) else "EVENT"
        payload = parsed_data.get("data", parsed_data) if isinstance(parsed_data, dict) else {"payload": parsed_data}

        # Emit to Socket.IO merchant-scoped room
        await emit_to_merchant(
            merchant_id=str(merchant_id),
            event_type=event_type,
            data=payload,
        )

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

    async def send_to_customer(self, customer_id: uuid.UUID, data: Any):
        """Send message strictly to the authenticated customer's Socket.IO room."""
        parsed_data = json.loads(data) if isinstance(data, str) else data
        event_type = parsed_data.get("type", "EVENT") if isinstance(parsed_data, dict) else "EVENT"
        payload = parsed_data.get("data", parsed_data) if isinstance(parsed_data, dict) else {"payload": parsed_data}

        await emit_to_customer(
            customer_id=str(customer_id),
            event_type=event_type,
            data=payload,
        )

    async def broadcast(self, data: Any):
        """Broadcasts only to merchants, preserving tenant isolation."""
        for merchant_id in list(self.active_connections.keys()):
            await self.send_to_merchant(merchant_id, data)


ws_manager = ConnectionManager()
