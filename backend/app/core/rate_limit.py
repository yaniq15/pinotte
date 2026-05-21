"""Rate limiter partagé (slowapi) — utilisé sur les routes sensibles
(/auth/login, /auth/register, /auth/google) pour bloquer les bruteforce et
l'inondation de comptes.

Limites par défaut : 5 requêtes / 5 min par IP. En in-memory pour MVP — pour
scaler en multi-process, switcher sur `storage_uri="redis://..."`.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],  # pas de limite par défaut, on opt-in route par route
)
