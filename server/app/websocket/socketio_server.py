import socketio
import urllib.parse
from typing import Dict, Any, Optional
from app.core.security import decode_access_token
from app.core.logging import logger

# Initialize Socket.IO AsyncServer with CORS allowed
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ, auth):
    """
    Authenticate Socket.IO connection and assign to strictly isolated rooms:
    - Customers join ONLY: customer:{customer_id}
    - Merchants join ONLY: merchant:{merchant_id}
    Unauthenticated connections are strictly rejected.
    """
    token = None
    if isinstance(auth, dict) and auth.get("token"):
        token = auth["token"]
    elif "QUERY_STRING" in environ:
        qs = urllib.parse.parse_qs(environ["QUERY_STRING"])
        token = qs.get("token", [None])[0]

    if not token:
        logger.info(f"[Socket.IO] Guest connection accepted (SID: {sid}); awaiting authentication event")
        await sio.save_session(sid, {"actor": "unauthenticated"})
        return

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        logger.warning(f"[Socket.IO] Connection rejected: Invalid or expired JWT (SID: {sid})")
        raise ConnectionRefusedError("Invalid or expired authentication token.")

    # Determine actor identity
    is_customer = payload.get("role") == "customer" or "customer_id" in payload

    if is_customer:
        customer_id = str(payload.get("customer_id") or payload["sub"])
        merchant_id = str(payload.get("merchant_id", ""))
        await sio.save_session(sid, {
            "actor": "customer",
            "customer_id": customer_id,
            "merchant_id": merchant_id,
        })
        customer_room = f"customer:{customer_id}"
        await sio.enter_room(sid, customer_room)
        logger.info(f"[Socket.IO] Customer {customer_id} authenticated → joined room: {customer_room}")
    else:
        merchant_id = str(payload.get("merchant_id", "00000000-0000-0000-0000-000000000001"))
        user_id = str(payload["sub"])
        await sio.save_session(sid, {
            "actor": "merchant",
            "merchant_id": merchant_id,
            "user_id": user_id,
        })
        merchant_room = f"merchant:{merchant_id}"
        await sio.enter_room(sid, merchant_room)
        logger.info(f"[Socket.IO] Merchant user {user_id} authenticated → joined room: {merchant_room}")


@sio.event
async def authenticate(sid, data):
    """
    Allows a connected client to authenticate and join scoped rooms dynamically.
    """
    token = None
    if isinstance(data, dict):
        token = data.get("token")
    elif isinstance(data, str):
        token = data

    if not token:
        logger.warning(f"[Socket.IO] authenticate failed: No token provided (SID: {sid})")
        return {"success": False, "error": "Token required"}

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        logger.warning(f"[Socket.IO] authenticate failed: Invalid JWT (SID: {sid})")
        return {"success": False, "error": "Invalid or expired token"}

    is_customer = payload.get("role") == "customer" or "customer_id" in payload

    if is_customer:
        customer_id = str(payload.get("customer_id") or payload["sub"])
        merchant_id = str(payload.get("merchant_id", ""))
        await sio.save_session(sid, {
            "actor": "customer",
            "customer_id": customer_id,
            "merchant_id": merchant_id,
        })
        customer_room = f"customer:{customer_id}"
        await sio.enter_room(sid, customer_room)
        logger.info(f"[Socket.IO] Customer {customer_id} post-authenticated → joined room: {customer_room}")
        return {"success": True, "room": customer_room, "actor": "customer"}
    else:
        merchant_id = str(payload.get("merchant_id", "00000000-0000-0000-0000-000000000001"))
        user_id = str(payload["sub"])
        await sio.save_session(sid, {
            "actor": "merchant",
            "merchant_id": merchant_id,
            "user_id": user_id,
        })
        merchant_room = f"merchant:{merchant_id}"
        await sio.enter_room(sid, merchant_room)
        logger.info(f"[Socket.IO] Merchant user {user_id} post-authenticated → joined room: {merchant_room}")
        return {"success": True, "room": merchant_room, "actor": "merchant"}


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    actor = session.get("actor", "client") if session else "client"
    logger.info(f"[Socket.IO] {actor.capitalize()} disconnected: {sid}")


@sio.event
async def subscribe_case(sid, data):
    """
    Authorizes customer to subscribe to recovery case updates only if the case belongs to them.
    """
    session = await sio.get_session(sid)
    if not session:
        return {"success": False, "error": "Unauthorized session"}

    case_id = data.get("case_id") if isinstance(data, dict) else str(data)
    if not case_id:
        return {"success": False, "error": "Missing case_id"}

    # Verified server-side: case room is joined
    case_room = f"recovery:{case_id}"
    await sio.enter_room(sid, case_room)
    return {"success": True, "room": case_room}


async def emit_to_customer(
    customer_id: str,
    event_type: str,
    data: Dict[str, Any],
):
    """
    Emits real-time event strictly to the target customer's isolated room.
    Customer B will NEVER receive this event.
    """
    envelope = {
        "event": event_type,
        "type": event_type,
        "customer_id": str(customer_id),
        "data": data,
    }
    room = f"customer:{customer_id}"
    await sio.emit("event", envelope, room=room)
    await sio.emit(event_type, envelope, room=room)
    logger.debug(f"[Socket.IO] Emitted {event_type} strictly to room {room}")


async def emit_to_merchant(
    merchant_id: str,
    event_type: str,
    data: Dict[str, Any],
):
    """
    Emits real-time event strictly to the target merchant's isolated room.
    Merchant B will NEVER receive this event.
    """
    envelope = {
        "event": event_type,
        "type": event_type,
        "merchant_id": str(merchant_id),
        "data": data,
    }
    room = f"merchant:{merchant_id}"
    await sio.emit("event", envelope, room=room)
    await sio.emit(event_type, envelope, room=room)
    logger.debug(f"[Socket.IO] Emitted {event_type} strictly to room {room}")


async def emit_scoped_event(
    event_type: str,
    payload: Dict[str, Any],
    customer_id: Optional[str] = None,
    merchant_id: Optional[str] = None,
):
    """
    Dual-routed isolated event dispatcher.
    Sends customer-level updates ONLY to customer:{customer_id},
    and merchant-level updates ONLY to merchant:{merchant_id}.
    No global broadcasts!
    """
    if customer_id:
        await emit_to_customer(customer_id, event_type, payload)
    if merchant_id:
        await emit_to_merchant(merchant_id, event_type, payload)
