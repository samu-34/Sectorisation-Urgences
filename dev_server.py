#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import secrets
import time
from functools import partial
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


SESSION_COOKIE_NAME = "medimap_session"
SESSION_TTL_SECONDS = 8 * 60 * 60
PROTECTED_PATHS = {
    "/data.js",
    "/generated/sectorization-data.js",
    "/generated/montpellier_street_index.js",
}


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class SecureRequestHandler(NoCacheRequestHandler):
    auth_enabled = False
    auth_password = ""
    sessions: dict[str, float] = {}

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        if path == "/auth/login":
            self._handle_login()
            return
        if path == "/auth/logout":
            self._handle_logout()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_GET(self) -> None:
        path = urlsplit(self.path).path

        if path == "/auth/status":
            self._handle_auth_status()
            return

        if self.auth_enabled and path in PROTECTED_PATHS and not self._is_authenticated():
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Unauthorized")
            return

        super().do_GET()

    def _handle_auth_status(self) -> None:
        payload = {
            "enabled": self.auth_enabled,
            "authenticated": (not self.auth_enabled) or self._is_authenticated(),
        }
        self._send_json(HTTPStatus.OK, payload)

    def _handle_login(self) -> None:
        if not self.auth_enabled:
            self._send_json(HTTPStatus.OK, {"ok": True, "enabled": False})
            return

        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
            return

        typed_password = str(body.get("password") or "")
        if secrets.compare_digest(typed_password, self.auth_password):
            token = secrets.token_urlsafe(32)
            expiry = time.time() + SESSION_TTL_SECONDS
            self.sessions[token] = expiry
            self._purge_expired_sessions()

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header(
                "Set-Cookie",
                (
                    f"{SESSION_COOKIE_NAME}={token}; Path=/; HttpOnly; "
                    f"Max-Age={SESSION_TTL_SECONDS}; SameSite=Strict"
                ),
            )
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        self._send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "invalid_credentials"})

    def _handle_logout(self) -> None:
        token = self._get_session_token()
        if token:
            self.sessions.pop(token, None)

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict",
        )
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _send_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=True).encode("utf-8"))

    def _get_session_token(self) -> str:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return ""
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        morsel = cookie.get(SESSION_COOKIE_NAME)
        return morsel.value if morsel else ""

    def _is_authenticated(self) -> bool:
        self._purge_expired_sessions()
        token = self._get_session_token()
        if not token:
            return False
        expiry = self.sessions.get(token)
        if not expiry:
            return False
        return expiry > time.time()

    def _purge_expired_sessions(self) -> None:
        now = time.time()
        expired = [token for token, expiry in self.sessions.items() if expiry <= now]
        for token in expired:
            self.sessions.pop(token, None)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serveur statique local sans cache pour MediMap")
    parser.add_argument("--host", default="127.0.0.1", help="Hote d'ecoute, par defaut 127.0.0.1")
    parser.add_argument("--port", type=int, default=8000, help="Port d'ecoute, par defaut 8000")
    parser.add_argument(
        "--dir",
        default=str(Path(__file__).resolve().parent),
        help="Dossier a servir, par defaut le dossier du projet",
    )
    args = parser.parse_args()

    auth_password = os.environ.get("MEDIMAP_PASSWORD", "")
    auth_enabled = bool(auth_password)

    SecureRequestHandler.auth_password = auth_password
    SecureRequestHandler.auth_enabled = auth_enabled
    SecureRequestHandler.sessions = {}

    handler = partial(SecureRequestHandler, directory=args.dir)
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"MediMap dev server sans cache sur http://{args.host}:{args.port}")
    print(f"Dossier servi: {Path(args.dir).resolve()}")
    if auth_enabled:
        print("Protection activee: donnees sensibles protegees par session serveur.")
    else:
        print("Protection desactivee: definir MEDIMAP_PASSWORD pour activer l'authentification.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
