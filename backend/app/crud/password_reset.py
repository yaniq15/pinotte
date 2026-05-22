"""CRUD for password reset tokens.

Le token plain n'est jamais stocké — uniquement son hash SHA256. Au moment de
la consommation, on hash le token reçu et on cherche le matching dans la DB.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.password_reset import PasswordResetToken
from ..models.user import User


def _hash_token(token_plain: str) -> str:
    return hashlib.sha256(token_plain.encode("utf-8")).hexdigest()


def create_for_user(db: Session, user_id: int, ttl_hours: int = 24) -> str:
    """Crée un nouveau token de reset, retourne le token plain (à envoyer par mail).
    Le hash est stocké en DB, le plain n'est jamais persisté."""
    token_plain = secrets.token_urlsafe(32)  # ~256 bits d'entropie
    row = PasswordResetToken(
        user_id=user_id,
        token_hash=_hash_token(token_plain),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
    )
    db.add(row)
    db.commit()
    return token_plain


def consume(db: Session, token_plain: str) -> Optional[User]:
    """Tente de consommer un token. Retourne le User si valide (et marque used_at),
    sinon None. Causes possibles d'échec : token inconnu, déjà utilisé, expiré."""
    row = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_token(token_plain))
    )
    if not row:
        return None
    if row.used_at is not None:
        return None
    if row.expires_at < datetime.now(timezone.utc):
        return None
    row.used_at = datetime.now(timezone.utc)
    user = db.get(User, row.user_id)
    db.commit()
    return user
