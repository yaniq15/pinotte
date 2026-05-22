"""User management — OWNER-only invite flow.

Pourquoi cet endpoint existe :
  En prod `ENABLE_PUBLIC_SIGNUP=false` bloque /register pour empêcher les
  étrangers de s'inscrire. Cet endpoint permet aux OWNER d'inviter de
  nouveaux membres sans avoir à toggle le flag à chaque fois.
"""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import require_roles
from ...core.database import get_db
from ...crud import user as user_crud
from ...models.user import User
from ...schemas.auth import UserInviteIn, UserInviteOut, UserRead

router = APIRouter(prefix="/users", tags=["users"])


def _gen_temp_password(length: int = 12) -> str:
    """12 caractères alphanumériques cryptographiquement sécurisés.
    ~71 bits d'entropie — largement suffisant pour un usage temporaire."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("", response_model=UserInviteOut, status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: UserInviteIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("OWNER")),
) -> UserInviteOut:
    """Crée un nouveau user (OWNER only).

    Génère un mot de passe temporaire que l'OWNER doit partager avec l'invité
    via son canal préféré (Signal, mail perso, en personne…). Le temp password
    n'est jamais ré-affichable après cette réponse.
    """
    existing = user_crud.get_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe déjà.",
        )

    temp_pw = _gen_temp_password()
    user = user_crud.create_invited(
        db,
        name=payload.name,
        email=payload.email,
        role=payload.role,
        temp_password=temp_pw,
    )
    return UserInviteOut(
        user=UserRead.model_validate(user),
        temp_password=temp_pw,
    )


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("OWNER")),
) -> list[UserRead]:
    """Liste tous les users (OWNER only). Utile pour la page Settings."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserRead.model_validate(u) for u in users]
