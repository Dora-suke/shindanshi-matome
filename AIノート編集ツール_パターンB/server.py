#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
パターンB サンプル : ローカルAI編集サーバー（Gemini 無料版）
--------------------------------------------------
やること（①②をサーバー1つで担当）:
  ① AIを呼ぶ      … サーバーが APIキーを持って Gemini を代理で叩く
  ② ファイル保存  … 「保存」で実ファイルに書き戻す（.bak バックアップ付き）

使い方:
  export GEMINI_API_KEY="AIza..."            # ← aistudio.google.com で無料取得（カード不要）
  python3 server.py
  → ブラウザで  http://127.0.0.1:8780  を開く

依存ライブラリ無し（Python標準ライブラリのみ）。
"""
import os, json, re, shutil, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ---- 設定 ----------------------------------------------------------
PORT = 8780
HOST = "127.0.0.1"
BASE_DIR  = os.path.abspath(os.path.dirname(__file__))            # このフォルダ
SAFE_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))         # まとめ/ 配下のみ書込許可（安全弁）
# 画面のプルダウンから選べるモデル（許可リスト）。 値 = 出力トークン上限
MODELS = {
    "gemini-2.5-flash":      32768,
    "gemini-2.5-pro":        32768,
}
DEFAULT_MODEL = "gemini-2.5-flash"   # 未指定/不正な指定のときに使う（2.0系はlimit:0で除外）
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
# --------------------------------------------------------------------


def call_ai(current_html, instruction, model=None, fragment=False, history=None):
    """現在のHTML＋指示を Gemini に送り、(修正後HTML, 短い説明, 使用モデル) を返す。
    fragment=True のときは「選択された一部分のHTML断片」を直す前提のプロンプトにする
    （大きいノートを全文往復させず、選択箇所だけ送って出力上限を回避するため）。"""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("環境変数 GEMINI_API_KEY が未設定です（export してから起動してください）。")
    # 画面で選ばれたモデル。許可リストに無ければ既定にフォールバック（URL注入対策も兼ねる）
    model = model if model in MODELS else DEFAULT_MODEL
    max_output = MODELS[model]
    if fragment:
        system = (
            "あなたはHTML学習ノートの編集者です。"
            "渡されるのはページ全体ではなく、ユーザーがページ上で選択した『一部分のHTML断片』です。"
            "その断片を、指示に従って最小限だけ修正してください。"
            "断片の外側の構造・前後の文脈・CSSクラス名・id・data属性は壊さず維持し、"
            "余計なタグ（html/body/doctype等）を新しく足さないこと。返すのは修正後の断片だけです。"
            "【厳守】専門用語・法律用語・固有名詞・人名・条文番号・数値は勝手に別の語へ置き換えたり"
            "削除したりしない（例：『廃除』を『削除』に変える等は禁止）。意味を変えないこと。"
            "『わかりやすく』と言われても、語そのものを差し替えるのではなく、補足や言い回しの調整にとどめる。"
            "指示が曖昧なときは、元の意味を保つ最小限の変更にとどめること。"
            "必ず次の形式『だけ』で出力してください（前後に余計な文字やコードブロック記号を書かない）:\n"
            "<<<REPLY>>>\n変更点の短い日本語説明\n<<<HTML>>>\n修正後のHTML断片"
        )
        user = "【指示】\n" + instruction + "\n\n【選択されたHTML断片（この部分だけを直して返す）】\n" + current_html
    else:
        system = (
            "あなたはHTML学習ノートの編集者です。"
            "渡されたHTML全体を、ユーザーの指示に従って修正します。"
            "既存の構造・CSS・スクリプトは壊さず、指示された箇所だけを最小限に直してください。"
            "勝手に内容を削ったり作り替えたりしないこと。"
            "必ず次の形式『だけ』で出力してください（前後に余計な文字やコードブロック記号を書かない）:\n"
            "<<<REPLY>>>\n変更点の短い日本語説明\n<<<HTML>>>\n修正後の完全なHTML"
        )
        user = "【指示】\n" + instruction + "\n\n【現在のHTML（この全体を修正して全文返す）】\n" + current_html

    url = f"{API_BASE}/{model}:generateContent"
    # 直近の会話履歴（指示文と返答のみ・HTML全文は含めない）を文脈として前置きする
    contents = []
    for h in (history or [])[-20:]:
        role = "model" if h.get("role") == "model" else "user"
        txt = (h.get("text") or "").strip()
        if txt:
            contents.append({"role": role, "parts": [{"text": txt}]})
    contents.append({"role": "user", "parts": [{"text": user}]})
    body = json.dumps({
        "system_instruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_output, "temperature": 0.2},
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "content-type": "application/json",
        "x-goog-api-key": key,
    })
    with urllib.request.urlopen(req, timeout=240) as r:
        data = json.loads(r.read().decode("utf-8"))

    cands = data.get("candidates", [])
    if not cands:
        fb = data.get("promptFeedback", {})
        raise RuntimeError("AIから返答がありません（安全フィルタ等の可能性）: " + json.dumps(fb, ensure_ascii=False))
    cand = cands[0]
    finish = cand.get("finishReason", "")
    if finish == "MAX_TOKENS":
        raise RuntimeError(
            "出力が長すぎて途中で切れました（このノートには現在の上限が小さすぎます）。"
            "小さいノートで試すか、本番では『差分編集』にする必要があります。")
    parts = cand.get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts)

    # ---- 出力の取り出し（モデルが多少フォーマットを崩しても拾えるよう頑丈に） ----
    new_html = None
    reply = ""
    if "<<<HTML>>>" in text:
        before, after = text.split("<<<HTML>>>", 1)
        reply = before.replace("<<<REPLY>>>", "").strip()   # マーカー前は全部「説明」とみなす
        new_html = after.strip()
    else:  # マーカーが無い場合 → コードブロックを拾う
        cb = re.search(r"```(?:html)?\s*(.*?)```", text, re.S)
        if cb:
            new_html = cb.group(1).strip()
            reply = (text[:cb.start()]).replace("<<<REPLY>>>", "").strip()
        elif "<!doctype" in text.lower() or "<html" in text.lower():
            new_html = text.strip()                          # 丸ごとHTMLとみなす
    # HTMLの前後に残ったコードフェンスを除去
    if new_html:
        new_html = re.sub(r"^```(?:html)?\s*", "", new_html)
        new_html = re.sub(r"\s*```$", "", new_html).strip()
    if not reply:
        reply = "✅ 修正しました（説明テキストは省略されました）"
    if not new_html:
        raise RuntimeError("AIの出力からHTMLを取り出せませんでした。指示を変えて再試行してください。")
    return new_html, reply, model


def safe_path(p):
    """まとめ/ フォルダ内のファイルだけ許可（外部への書込事故を防ぐ安全弁）。"""
    if not p:
        raise RuntimeError("ファイルパスが空です。")
    ap = os.path.abspath(p)
    if not (ap == SAFE_ROOT or ap.startswith(SAFE_ROOT + os.sep)):
        raise RuntimeError("安全のため『まとめ/』フォルダ内のファイルのみ扱えます。")
    return ap


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        b = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        # ノートHTMLを別オリジン（file:// や localhost:8765）から開いた右パネルが
        # このサーバーを叩けるようにCORSを許可する。
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):   # CORSプリフライト
        self._send(204, b"")

    def _json(self, code, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False))

    # ---- GET: 画面と「ノート読込」 ----
    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html", "/editor.html"):
            with open(os.path.join(BASE_DIR, "editor.html"), encoding="utf-8") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
            return
        if u.path == "/api/models":
            self._json(200, {"ok": True, "models": list(MODELS.keys()), "default": DEFAULT_MODEL})
            return
        if u.path == "/api/note":
            q = parse_qs(u.query)
            path = (q.get("path") or [""])[0]
            try:
                ap = safe_path(path)
                with open(ap, encoding="utf-8") as f:
                    self._json(200, {"ok": True, "html": f.read(), "path": ap})
            except Exception as e:
                self._json(400, {"ok": False, "error": str(e)})
            return
        self._json(404, {"ok": False, "error": "not found"})

    # ---- POST: チャット（AI修正）と 保存 ----
    def do_POST(self):
        u = urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode("utf-8") if n else "{}"
        try:
            req = json.loads(raw)
        except Exception:
            self._json(400, {"ok": False, "error": "bad json"}); return

        if u.path == "/api/chat":
            try:
                new_html, reply, used = call_ai(req.get("html", ""), req.get("instruction", ""), req.get("model"))
                self._json(200, {"ok": True, "html": new_html, "reply": reply, "model": used})
            except urllib.error.HTTPError as e:
                msg = e.read().decode("utf-8", "ignore")
                self._json(502, {"ok": False, "error": "Gemini API エラー: " + msg})
            except Exception as e:
                self._json(500, {"ok": False, "error": str(e)})
            return

        if u.path == "/api/fragment":
            # ページ上で選択された一部分だけを直す（大きいノートでも出力上限に当たらない）
            try:
                new_html, reply, used = call_ai(req.get("html", ""), req.get("instruction", ""),
                                                req.get("model"), fragment=True, history=req.get("history"))
                self._json(200, {"ok": True, "html": new_html, "reply": reply, "model": used})
            except urllib.error.HTTPError as e:
                msg = e.read().decode("utf-8", "ignore")
                self._json(502, {"ok": False, "error": "Gemini API エラー: " + msg})
            except Exception as e:
                self._json(500, {"ok": False, "error": str(e)})
            return

        if u.path == "/api/save":
            try:
                ap = safe_path(req.get("path", ""))
                if os.path.exists(ap):
                    shutil.copy2(ap, ap + ".bak")     # 上書き前にバックアップ
                with open(ap, "w", encoding="utf-8") as f:
                    f.write(req.get("html", ""))
                self._json(200, {"ok": True, "path": ap})
            except Exception as e:
                self._json(500, {"ok": False, "error": str(e)})
            return

        self._json(404, {"ok": False, "error": "not found"})

    def log_message(self, *a):   # アクセスログ静音
        pass


if __name__ == "__main__":
    print("=" * 52)
    print("  AI編集サーバー（パターンB / Gemini無料版）起動")
    print(f"  URL        : http://{HOST}:{PORT}")
    print(f"  書込許可    : {SAFE_ROOT} 配下のみ")
    print(f"  モデル(既定) : {DEFAULT_MODEL}  ※画面のプルダウンで切替可")
    print(f"  選択肢      : {', '.join(MODELS.keys())}")
    print(f"  APIキー     : {'設定済み ✅' if os.environ.get('GEMINI_API_KEY') else '未設定 ⚠️（チャット不可）'}")
    print("  停止        : Ctrl+C")
    print("=" * 52)
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
