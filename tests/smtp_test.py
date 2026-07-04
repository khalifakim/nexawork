"""
NexaWork — Test SMTP Phase 0 (mode diagnostic).

Version enrichie avec logs détaillés pour isoler la cause de l'erreur 535
"Username and Password not accepted" côté Gmail.

Usage :
    cd D:\\memoire-master\\nexawork
    python tests/smtp_test.py
"""

import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from pathlib import Path


def _hex_dump(s: str) -> str:
    """Retourne la représentation hex de chaque caractère pour repérer les
    caractères invisibles (BOM, espaces zéro-width, CR, LF, tabs, etc.)."""
    return " ".join(f"{ord(c):02x}({c!r})" for c in s)


def load_env(env_path: Path) -> None:
    """Charge le .env avec logs détaillés du parsing."""
    if not env_path.exists():
        print(f"[ERREUR] fichier .env introuvable à {env_path}", file=sys.stderr)
        sys.exit(1)

    # Lire les bytes bruts pour détecter un éventuel BOM UTF-8
    raw_bytes = env_path.read_bytes()
    print(f"[.env] taille : {len(raw_bytes)} octets")
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        print("[.env] ⚠️  BOM UTF-8 détecté en tête du fichier !")
    else:
        print("[.env] pas de BOM en tête.")

    # Parser normalement
    text = raw_bytes.decode("utf-8-sig")  # utf-8-sig ignore le BOM s'il existe
    for lineno, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        # NE PAS strip la valeur ici — on veut voir les espaces cachés
        os.environ[key] = value


def require(var: str) -> str:
    value = os.environ.get(var)
    if not value:
        print(f"[ERREUR] variable {var} manquante dans .env", file=sys.stderr)
        sys.exit(2)
    return value


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    print(f"[env] chargement de {project_root / '.env'}")
    load_env(project_root / ".env")

    smtp_host = require("SMTP_HOST")
    smtp_port_raw = require("SMTP_PORT")
    smtp_user = require("SMTP_USERNAME")
    smtp_pass = require("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)

    # ─── LOGS DE DIAGNOSTIC ───────────────────────────────────────────────
    print("\n─── Diagnostic des variables lues ───")
    print(f"SMTP_HOST     : {smtp_host!r}")
    print(f"                hex : {_hex_dump(smtp_host)}")
    print(f"SMTP_PORT     : {smtp_port_raw!r}")
    print(f"SMTP_USERNAME : {smtp_user!r}")
    print(f"                len = {len(smtp_user)}")
    print(f"                hex : {_hex_dump(smtp_user)}")
    print(f"SMTP_PASSWORD : {'*' * len(smtp_pass)}  (masqué)")
    print(f"                len = {len(smtp_pass)}   (attendu : 16)")
    print(f"                premier char : {smtp_pass[0]!r}  hex : {ord(smtp_pass[0]):02x}")
    print(f"                dernier char : {smtp_pass[-1]!r}  hex : {ord(smtp_pass[-1]):02x}")
    # Détecter espaces / caractères non-imprimables
    non_printable = [(i, c) for i, c in enumerate(smtp_pass) if not c.isalnum()]
    if non_printable:
        print(f"                ⚠️  {len(non_printable)} caractères non-alphanumériques dans le password :")
        for i, c in non_printable:
            print(f"                    position {i} : {c!r} (hex {ord(c):02x})")
    else:
        print("                ✓ tous les caractères sont alphanumériques")
    print(f"SMTP_FROM     : {smtp_from!r}")
    print("─────────────────────────────────────\n")

    # Nettoyage préventif : strip whitespace des credentials
    smtp_user_clean = smtp_user.strip()
    smtp_pass_clean = smtp_pass.strip()
    if smtp_user_clean != smtp_user:
        print(f"[strip] SMTP_USERNAME nettoyé ({len(smtp_user)} → {len(smtp_user_clean)} chars)")
    if smtp_pass_clean != smtp_pass:
        print(f"[strip] SMTP_PASSWORD nettoyé ({len(smtp_pass)} → {len(smtp_pass_clean)} chars)")

    smtp_port = int(smtp_port_raw.strip())

    msg = EmailMessage()
    msg["Subject"] = "[NexaWork] Test SMTP Phase 0"
    msg["From"] = smtp_from.strip()
    msg["To"] = smtp_user_clean
    msg.set_content(
        "Configuration Gmail SMTP validée depuis .env.\n\n"
        "Phase 0 : OK.\n"
    )

    print(f"→ Connexion à {smtp_host}:{smtp_port} (STARTTLS)…")
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.set_debuglevel(1)  # ← LOG COMPLET du dialogue SMTP
        print("→ EHLO…")
        server.ehlo()
        print("→ STARTTLS…")
        server.starttls(context=context)
        print("→ EHLO post-TLS…")
        server.ehlo()
        print(f"→ LOGIN avec user={smtp_user_clean!r} pass=***({len(smtp_pass_clean)} chars)…")
        server.login(smtp_user_clean, smtp_pass_clean)
        print("→ SEND…")
        server.send_message(msg)

    print(f"\nOK — email envoyé à {smtp_user_clean}")
    print("→ Vérifie ta boîte de réception (peut arriver en 5-30 sec).")


if __name__ == "__main__":
    try:
        main()
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n[535 AUTH FAILED] {e}", file=sys.stderr)
        print(
            "\nPistes de résolution :\n"
            "  1. Vérifier que 2FA est activée sur klf.pourtest@gmail.com "
            "(https://myaccount.google.com/security)\n"
            "  2. Regénérer un app password et vérifier qu'il apparaît dans la "
            "liste (https://myaccount.google.com/apppasswords)\n"
            "  3. Vérifier que le compte n'est pas verrouillé (Google peut "
            "bloquer les logins depuis une nouvelle IP) — se connecter au "
            "webmail depuis le même réseau pour débloquer.\n"
            "  4. Vérifier que la longueur du password affichée ci-dessus est "
            "bien 16, sans caractères non-alphanumériques.\n",
            file=sys.stderr,
        )
        sys.exit(3)
    except (smtplib.SMTPException, ConnectionError, OSError) as e:
        print(f"\n[ERREUR SMTP] {type(e).__name__} : {e}", file=sys.stderr)
        sys.exit(4)
