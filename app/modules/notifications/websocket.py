# app/modules/notifications/websocket.py
"""WebSocket connection manager for real-time notification push."""

import asyncio
import logging
from typing import Dict, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class NotificationConnectionManager:
    """Manages per-user WebSocket connections for live notification delivery."""

    def __init__(self):
        self._connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, []).append(websocket)
        logger.info(f"WS notification connected: user_id={user_id}")

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        conns = self._connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(user_id, None)
        logger.info(f"WS notification disconnected: user_id={user_id}")

    async def push(self, user_id: int, payload: dict) -> None:
        conns = self._connections.get(user_id, [])
        dead: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast(self, payload: dict) -> None:
        for user_id in list(self._connections.keys()):
            await self.push(user_id, payload)


notification_ws_manager = NotificationConnectionManager()
