"""Open and serve the static demo without retaining stale JavaScript modules."""

import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    webpage_directory = Path(__file__).resolve().parent
    handler = partial(NoCacheRequestHandler, directory=webpage_directory)
    server = ThreadingHTTPServer(("", 5137), handler)
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"Fourier Signal Bench: {url}", flush=True)
    webbrowser.open(url)
    server.serve_forever()


if __name__ == "__main__":
    main()
