"""Auth routes — login email/password, register (gated), Google OAuth, /me.

Sécurité :
- /register peut être désactivé en prod via `ENABLE_PUBLIC_SIGNUP=false`
- Rate limit slowapi : 5 tentatives / 5 min / IP sur login, register, google
- Password policy : ≥ 8 chars + 1 chiffre (validée côté serveur)
- Google OAuth : on vérifie le `id_token` côté serveur via la lib google-auth
  → impossible de forger un token (la signature est validée par Google)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.rate_limit import limiter
from ...core.security import create_access_token, hash_password, validate_password_strength, verify_password
from ...crud import user as user_crud
from ...models.user import User
from ...schemas.auth import ChangePasswordIn, TokenResponse, UserLogin, UserRead, UserRegister
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginPayload(BaseModel):
    id_token: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/5minutes")
def register(
    request: Request,  # noqa: ARG001 — requis par slowapi pour key_func
    payload: UserRegister,
    db: Session = Depends(get_db),
) -> TokenResponse:
    # Désactivation de l'inscription publique en prod
    if not settings.ENABLE_PUBLIC_SIGNUP:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="L'inscription publique est désactivée. Demande à un administrateur de créer ton compte.",
        )
    # Policy mot de passe
    try:
        validate_password_strength(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    # Unicité email
    if user_crud.get_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà avec cet email",
        )
    user = user_crud.create(db, payload)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/5minutes")
def login(
    request: Request,  # noqa: ARG001
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> TokenResponse:
    user = user_crud.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/5minutes")
def google_login(
    request: Request,  # noqa: ARG001
    payload: GoogleLoginPayload,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Sign in with Google : reçoit l'id_token issu de Google Identity Services
    côté frontend, le vérifie cryptographiquement contre les clés publiques
    Google, puis find-or-create l'utilisateur dans notre BDD.
    """
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Connexion Google non configurée sur ce serveur",
        )

    # Vérif signature + audience + expiration via lib officielle Google
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
    try:
        info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token Google invalide : {e}",
        )

    if not info.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email Google non vérifié",
        )

    email = info["email"].lower()
    name = info.get("name") or info.get("given_name") or email.split("@")[0]

    user = user_crud.get_by_email(db, email)
    if user is None:
        # Création auto seulement si l'inscription publique est ouverte.
        # En prod fermée, l'OWNER doit pré-créer le compte (l'email Google doit
        # déjà exister dans la table users).
        if not settings.ENABLE_PUBLIC_SIGNUP:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cet email n'a pas accès à Pinotte. Demande une invitation.",
            )
        user = user_crud.create_oauth_user(db, email=email, name=name)

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Compte désactivé",
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current)


@router.patch("/me/password")
@limiter.limit("5/5minutes")
def change_password(
    request: Request,  # noqa: ARG001 — required by slowapi
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    """Permet à l'utilisateur connecté de changer son propre mot de passe.

    Workflow attendu :
    - User reçoit un temp password (via invite OWNER ou self-register)
    - Se connecte avec ce temp password
    - Va dans Settings → Sécurité → change pour son propre password
    """
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect",
        )
    try:
        validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    if verify_password(payload.new_password, current.password_hash):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nouveau mot de passe doit être différent de l'actuel",
        )
    current.password_hash = hash_password(payload.new_password)
    current.must_change_password = False
    db.commit()
    return {"status": "ok"}


@router.get("/config")
def auth_config() -> dict:
    """Public config endpoint — le frontend appelle ça pour savoir quels boutons
    afficher (signup ouvert ? Google OAuth disponible ?).
    """
    return {
        "public_signup_enabled": settings.ENABLE_PUBLIC_SIGNUP,
        "google_oauth_enabled": bool(settings.GOOGLE_OAUTH_CLIENT_ID),
        "google_oauth_client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "password_min_length": settings.PASSWORD_MIN_LENGTH,
    }
