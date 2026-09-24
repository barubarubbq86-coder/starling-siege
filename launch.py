"""Serve the offline game to this computer only, with a stable save origin."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
from urllib.parse import urlsplit
import sys
import webbrowser


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8765
URL = f"http://{HOST}:{PORT}/"
ASSETS = frozenset(
    "/assets/enemies/" + path.name
    for path in (ROOT / "assets" / "enemies").glob("*.png")
)
ALLOWED = frozenset(("/", "/index.html", "/game.js")) | ASSETS
CSP = (
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; "
    "img-src 'self' blob: data:; connect-src 'none'; font-src 'none'; "
    "media-src 'none'; object-src 'none'; frame-src 'none'; "
    "worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'"
)


class GameHandler(SimpleHTTPRequestHandler):
    """Only expose game files on the loopback interface."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _serve_allowed(self, method):
        if urlsplit(self.path).path not in ALLOWED:
            self.send_error(404, "File not found")
            return
        method()

    def do_GET(self):
        self._serve_allowed(super().do_GET)

    def do_HEAD(self):
        self._serve_allowed(super().do_HEAD)

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    try:
        server = ThreadingHTTPServer((HOST, PORT), GameHandler)
    except OSError as exc:
        print(f"Could not open {URL}: {exc}", file=sys.stderr)
        print("Close the other app using port 8765, then try again.", file=sys.stderr)
        return 1

    with server:
        print("Starling Siege is running only on this computer.")
        print("Open this address if the browser does not appear:", URL)
        print("Keep this window open while playing. Press Ctrl+C to stop.")
        Timer(0.4, lambda: webbrowser.open(URL)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nGame stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
