#!/usr/bin/env python3
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


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

    handler = partial(NoCacheRequestHandler, directory=args.dir)
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"MediMap dev server sans cache sur http://{args.host}:{args.port}")
    print(f"Dossier servi: {Path(args.dir).resolve()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArret du serveur.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
