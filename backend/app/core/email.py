"""Email service — Gmail SMTP via App Password.

Pourquoi Gmail SMTP en MVP : Resend/SendGrid demandent un domaine vérifié
pour envoyer à des emails arbitraires. Gmail SMTP marche tout de suite avec
juste un App Password (Google Account → Security → 2-Step Verification →
App passwords). Limite ~500 emails/jour, largement suffisant pour Pinotte.

Migration future : quand un domaine pinotte.io sera acheté, passer à Resend
avec SPF/DKIM proprement configurés.
"""
import smtplib
from email.message import EmailMessage
from typing import Optional

from .config import settings


def send_email(to: str, subject: str, body: str, html_body: Optional[str] = None) -> None:
    """Envoie un email via Gmail SMTP. Si SMTP_USER/PASS non configurés,
    logge en console au lieu d'envoyer (utile en dev sans setup)."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        print(
            f"[email STUB — SMTP not configured]\n"
            f"  To: {to}\n  Subject: {subject}\n  Body:\n{body}"
        )
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    msg["To"] = to
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
        s.starttls()
        s.login(settings.SMTP_USER, settings.SMTP_PASS)
        s.send_message(msg)


def send_password_reset_email(to: str, name: str, reset_link: str) -> None:
    subject = "Réinitialisation de ton mot de passe Pinotte"
    body = (
        f"Bonjour {name},\n\n"
        f"Tu as demandé à réinitialiser ton mot de passe Pinotte.\n\n"
        f"Clique ce lien (valide 24h) pour choisir un nouveau mot de passe :\n\n"
        f"{reset_link}\n\n"
        f"Si tu n'es pas à l'origine de cette demande, ignore cet email — "
        f"ton mot de passe reste inchangé.\n\n"
        f"— L'équipe Pinotte"
    )
    html_body = f"""<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2c1810;">
<h2 style="color: #C5532E; font-family: 'Fraunces', Georgia, serif; margin-bottom: 16px;">Pinotte</h2>
<p>Bonjour <strong>{name}</strong>,</p>
<p>Tu as demandé à réinitialiser ton mot de passe Pinotte.</p>
<p style="margin: 28px 0;">
  <a href="{reset_link}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #C5532E, #9B3A1A); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Choisir un nouveau mot de passe</a>
</p>
<p style="color: #6b6b6b; font-size: 14px;">Le lien est valide pendant 24 heures.</p>
<p style="color: #6b6b6b; font-size: 14px;">Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe reste inchangé.</p>
<p style="margin-top: 32px; color: #6b6b6b; font-size: 13px;">— L'équipe Pinotte</p>
</body></html>"""
    send_email(to, subject, body, html_body)
