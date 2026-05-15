import asyncio
import json
import redis.asyncio as redis
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import os

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)

    async def broadcast_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()

async def redis_listener():
    """
    Background task that listens to Redis Pub/Sub and broadcasts to connected clients.
    """
    r = redis.from_url(manager.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe("analysis_updates")
    
    print("WebSocket Manager: Listening for Redis updates...")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                # In a real app, we would verify which user owns this analysis_id 
                # before broadcasting to them. For now, we broadcast to all 
                # (or we could store user_id in the message).
                
                # Simplified: Broadcast to everyone or implement user-specific routing
                for user_id in manager.active_connections:
                    await manager.broadcast_to_user(user_id, data)
    except Exception as e:
        print(f"Redis Listener Error: {e}")
    finally:
        await pubsub.unsubscribe("analysis_updates")
