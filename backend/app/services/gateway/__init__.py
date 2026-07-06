"""Edge Gateway — маршрутизация вызовов драйвера через агента в LAN клиента.

Решает проблему NAT: устройства в локальной сети клиента, платформа в
облаке. Агент (edge/agent.py) держит исходящий WS-туннель к облаку и
выполняет RPC-команды локальными драйверами.
"""
from app.services.gateway.registry import GatewayConnection, GatewayRegistry, registry
from app.services.gateway.remote import RemoteDriver

__all__ = ["GatewayConnection", "GatewayRegistry", "registry", "RemoteDriver"]
