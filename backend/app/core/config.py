"""Settings — loaded from environment variables with Pydantic v2."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Pinotte"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+psycopg2://chika:chika_dev_pwd@localhost:5433/chika"

    JWT_SECRET_KEY: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # Comma-separated list, e.g. "http://localhost:5173,https://app.pinotte.io"
    CORS_ORIGINS: str = "http://localhost:5173"

    # ── Security policy ──
    # En prod, mettre ENABLE_PUBLIC_SIGNUP=false pour empêcher tout étranger
    # de créer un compte. Les nouveaux users devront être créés par un OWNER.
    ENABLE_PUBLIC_SIGNUP: bool = True
    # Min 8 caractères + au moins 1 chiffre (validation côté backend ET frontend).
    PASSWORD_MIN_LENGTH: int = 8

    # ── Google OAuth (optionnel — laisser vide pour désactiver le bouton) ──
    # Pour activer : créer un OAuth client dans Google Cloud Console et coller
    # le client ID ici. Pas besoin de client_secret pour la flow ID-token via
    # Google Identity Services côté frontend (on vérifie le token côté serveur).
    GOOGLE_OAUTH_CLIENT_ID: str = ""

    # ── Email (SMTP — pour password reset) ──
    # Gmail recommandé en MVP : créer un App Password (Google Account → Security
    # → 2-Step Verification → App passwords) et le coller dans SMTP_PASS.
    # Sans SMTP_USER ni SMTP_PASS, send_email logge en console au lieu d'envoyer.
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = ""  # fallback sur SMTP_USER si vide

    # URL publique du frontend — utilisée pour construire les liens dans les emails
    # (ex: reset password). Pas de slash final.
    FRONTEND_URL: str = "http://localhost:5173"

    # Au boot, lever une alerte si JWT_SECRET_KEY est resté à la valeur par défaut
    # ET qu'on n'est PAS en mode DEBUG (= prod).
    def assert_prod_safe(self) -> None:
        if not self.DEBUG and self.JWT_SECRET_KEY == "change-me-in-env":
            raise RuntimeError(
                "JWT_SECRET_KEY est resté à la valeur par défaut alors qu'on "
                "n'est pas en DEBUG. Génère-en un via `openssl rand -hex 32` "
                "et mets-le dans la variable d'env JWT_SECRET_KEY."
            )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
