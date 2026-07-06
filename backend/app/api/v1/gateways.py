import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import crud
from app.api.deps import require
from app.db.session import SessionLocal, get_db
from app.models import Gateway, User
from app.schemas.common import Paginated
from app.schemas.gateway import (
    GatewayCreate,
    GatewayCreated,
    GatewayOut,
    GatewayUpdate,
)
from app.services import audit
from app.services.gateway import GatewayConnection, registry

router = APIRouter(prefix="/gateways", tags=["gateways"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.get("", response_model=Paginated[GatewayOut])
def list_gateways(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require("gateways.read")),
):
    result = crud.list_paginated(
        db, Gateway, page=page, page_size=page_size, search=search, order_by=Gateway.name
    )
    # Отражаем реальный online-статус из реестра подключений.
    for g in result["items"]:
        g.online = registry.is_online(str(g.id))
    return result


@router.post("", response_model=GatewayCreated, status_code=201)
def create_gateway(
    body: GatewayCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("gateways.write")),
):
    raw_token = secrets.token_urlsafe(32)
    data = body.model_dump()
    data["token_hash"] = _hash_token(raw_token)
    gw = crud.create(db, Gateway, data, user=user, request=request, entity_type="gateway")
    out = GatewayCreated.model_validate(gw)
    out.token = raw_token  # показывается ОДИН раз
    return out


@router.get("/{gateway_id}", response_model=GatewayOut)
def get_gateway(
    gateway_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require("gateways.read")),
):
    gw = crud.get_or_404(db, Gateway, gateway_id)
    gw.online = registry.is_online(str(gw.id))
    return gw


@router.put("/{gateway_id}", response_model=GatewayOut)
def update_gateway(
    gateway_id: UUID,
    body: GatewayUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("gateways.write")),
):
    gw = crud.get_or_404(db, Gateway, gateway_id)
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    return crud.update(db, gw, data, user=user, request=request, entity_type="gateway")


@router.post("/{gateway_id}/regenerate-token", response_model=GatewayCreated)
def regenerate_token(
    gateway_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("gateways.write")),
):
    gw = crud.get_or_404(db, Gateway, gateway_id)
    raw_token = secrets.token_urlsafe(32)
    crud.update(
        db, gw, {"token_hash": _hash_token(raw_token)},
        user=user, request=request, entity_type="gateway",
    )
    out = GatewayCreated.model_validate(gw)
    out.token = raw_token
    return out


@router.delete("/{gateway_id}", status_code=204)
def delete_gateway(
    gateway_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require("gateways.write")),
):
    gw = crud.get_or_404(db, Gateway, gateway_id)
    crud.delete(db, gw, user=user, request=request, entity_type="gateway")


@router.websocket("/ws")
async def gateway_tunnel(websocket: WebSocket, token: str = Query(...)):
    """Туннель Edge Gateway: агент из LAN клиента держит это соединение.

    Аутентификация по токену (?token=). Облако шлёт RPC-команды, агент
    возвращает результаты; агент шлёт heartbeat и события прохода.
    """
    await websocket.accept()
    token_hash = _hash_token(token)

    # Находим gateway по хэшу токена (короткая сессия БД).
    with SessionLocal() as db:
        gw = db.scalar(select(Gateway).where(Gateway.token_hash == token_hash))
        if gw is None:
            await websocket.close(code=4401)
            return
        gateway_id = str(gw.id)
        gw.online = True
        gw.last_seen_at = datetime.now(timezone.utc)
        db.commit()

    async def send(msg: dict) -> None:
        await websocket.send_json(msg)

    conn = GatewayConnection(send)
    registry.register(gateway_id, conn)

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")
            if mtype == "result":
                conn.resolve(msg)
            elif mtype == "heartbeat":
                with SessionLocal() as db:
                    g = db.get(Gateway, UUID(gateway_id))
                    if g:
                        g.last_seen_at = datetime.now(timezone.utc)
                        db.commit()
            elif mtype == "events":
                # Проброс событий прохода от устройств за шлюзом (опционально).
                pass
    except WebSocketDisconnect:
        pass
    finally:
        registry.unregister(gateway_id)
        with SessionLocal() as db:
            g = db.get(Gateway, UUID(gateway_id))
            if g:
                g.online = False
                db.commit()
