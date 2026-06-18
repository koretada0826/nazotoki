#!/usr/bin/env python3
# ナゾトキ ローカルサーバー（更新がすぐ反映されるようキャッシュ無効）
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8755
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
print(f"ナゾトキ → http://localhost:{PORT}/  (Ctrl+C で停止)")
with socketserver.TCPServer(("", PORT), H) as httpd:
    httpd.serve_forever()
