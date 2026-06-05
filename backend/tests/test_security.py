from app.core.crypto import decrypt, encrypt
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_verify_roundtrip():
    h = hash_password("hello world")
    assert verify_password("hello world", h)
    assert not verify_password("wrong", h)


def test_jwt_access_token_roundtrip():
    token = create_access_token("sub-id-123")
    payload = decode_token(token)
    assert payload["sub"] == "sub-id-123"
    assert payload["type"] == "access"


def test_jwt_refresh_token_marked():
    token = create_refresh_token("sub-id-123")
    payload = decode_token(token)
    assert payload["type"] == "refresh"


def test_fernet_roundtrip():
    assert decrypt(encrypt("secret-device-password")) == "secret-device-password"


def test_fernet_empty():
    assert encrypt("") == ""
    assert decrypt("") == ""
