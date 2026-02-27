#!/usr/bin/env python3
"""Dev server with no-cache headers to prevent stale modules."""
import http.server, functools, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

print("Serving at http://localhost:9091 (no-cache)")
http.server.HTTPServer(('', 9091), NoCacheHandler).serve_forever()
