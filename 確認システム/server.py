#!/usr/bin/env python3
# 確認システム ローカルサーバ
# 役割: 確認HTMLを配信し、解答結果を受け取って自動でファイルに記録する。
# 起動: python3 server.py   (確認システム/ ディレクトリ内で)
# アクセス: http://localhost:8765/ （メニュー）→ 103_企業経営理論/確認_103_企業経営理論.html
import json, os, datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8765

def subj_dir(subj):
    # 科目フォルダ（例: 103_企業経営理論）があればそこへ、無ければ確認システム直下へ保存。
    for name in sorted(os.listdir(HERE)):
        full = os.path.join(HERE, name)
        if os.path.isdir(full) and name.startswith(f"{subj}_"):
            return full
    return HERE

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def log_message(self, *a):
        pass  # 静かに

    def do_POST(self):
        if self.path != "/save":
            self.send_error(404); return
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            self.send_error(400, str(e)); return

        data["saved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        subj = str(data.get("subject", "000"))

        # 1) 生ログ追記（append-only・機械可読）
        with open(os.path.join(subj_dir(subj), f"_results_{subj}.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")

        # 2) 自動記録md（最新結果でlogicごとに上書き再生成）
        self._rebuild_md(subj)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode())

    def _rebuild_md(self, subj):
        path = os.path.join(subj_dir(subj), f"_results_{subj}.jsonl")
        if not os.path.exists(path):
            return
        latest = {}  # logic -> record (最新で上書き)
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                latest[r.get("logic", "?")] = r

        out = [f"# 自動記録 — 科目{subj}", "",
               "サーバが解答結果から自動生成（最新の実施で上書き）。Claudeはこれを読んで傾向分析する。", ""]
        for logic, r in latest.items():
            items = r.get("items", [])
            o = sum(1 for it in items if it.get("mark") == "○")
            d = sum(1 for it in items if it.get("mark") == "△")
            x = sum(1 for it in items if it.get("mark") == "×")
            verdict = "✅クリア" if (x == 0 and d <= 1) else "🔁要再訪"
            out.append(f"## {r.get('topic', logic)}　【{verdict}】")
            out.append(f"- 実施: {r.get('saved_at','')} ／ ○{o} △{d} ×{x}")
            out.append("")
            out.append("| # | 設問 | 正解 | 結果 |")
            out.append("|---|---|:--:|:--:|")
            for i, it in enumerate(items, 1):
                q = str(it.get("q", "")).replace("|", "／")
                out.append(f"| {i} | {q} | {it.get('a','')} | {it.get('mark','')} |")
            out.append("")
        with open(os.path.join(subj_dir(subj), f"自動記録_{subj}.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(out))

if __name__ == "__main__":
    print(f"確認システム server → http://localhost:{PORT}/")
    print(f"例: http://localhost:{PORT}/103_企業経営理論/確認_103_企業経営理論.html")
    HTTPServer(("127.0.0.1", PORT), H).serve_forever()
