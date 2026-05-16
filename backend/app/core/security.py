"""Password hashing (bcrypt) and JWT encoding/decoding."""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from .config import settings

_BCRYPT_ROUNDS = 12
# bcrypt has a hard 72-byte limit on the input. Anything longer is silently
# truncated, which is a confusing footgun. We enforce the limit ourselves with
# a clear error.
_MAX_PASSWORD_BYTES = 72


def hash_password(plain: str) -> str:
    pw = plain.encode("utf-8")
    if len(pw) > _MAX_PASSWORD_BYTES:
        raise ValueError(f"Mot de passe trop long (> {_MAX_PASSWORD_BYTES} octets)")
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pw = plain.encode("utf-8")
        if len(pw) > _MAX_PASSWORD_BYTES:
            return False
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except (ValueError, Exception):
        return False


def create_access_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
    """Encode a JWT with the user id as `sub`."""
    if expires_delta is None:
        expires_delta = timedelta(days=settings.JWT_EXPIRE_DAYS)
    now = datetime.now(timezone.utc)
    payload = {"sub": str(subject), "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
