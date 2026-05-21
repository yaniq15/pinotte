import secrets
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.security import hash_password, verify_password
from ..models.user import User
from ..schemas.auth import UserRegister


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(select(User).where(User.email == email.lower()))


def get_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.get(User, user_id)


def create(db: Session, payload: UserRegister) -> User:
    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="OWNER",
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_oauth_user(db: Session, *, email: str, name: str) -> User:
    """Crée un user via OAuth (Google) — pas de mot de passe choisi par l'user.
    On stocke un hash aléatoire dans password_hash (le user ne s'en servira jamais
    pour se connecter — il passera toujours par Google ou un reset password
    futur). password_hash est NOT NULL en BDD, donc on doit y mettre QUELQUE CHOSE.
    """
    random_pw = secrets.token_urlsafe(32)
    user = User(
        name=name.strip()[:100],
        email=email.lower(),
        password_hash=hash_password(random_pw),
        role="OWNER",
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = get_by_email(db, email)
    if not user or not user.active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
