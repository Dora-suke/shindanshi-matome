/**
 * AIノート編集 — Cloudflare Worker（AI中継・合言葉付き）
 * ---------------------------------------------------------------
 * 役割：github.io 等の公開ページから安全に Gemini を呼ぶための中継。
 *   - Gemini APIキーは Worker のシークレット(環境変数)に置く（ページには出さない）
 *   - 合言葉(SECRET)が一致しないリクエストは拒否（URLのタダ乗り防止）
 *   - CORS を許可（github.io から fetch できるように）
 *
 * 【デプロイ手順】
 *   1. https://dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. このコードを貼り付けてデプロイ
 *   3. 設定 → Variables and Secrets で2つ登録（Encrypt推奨）:
 *        GEMINI_API_KEY = AIza...（aistudioの無料キー）
 *        AIEP_SECRET    = 自分で決めた合言葉（推測されにくい文字列）
 *   4. 発行された https://xxxx.workers.dev を aiep.js / パネル設定に登録
 */

const MODELS = {
  "gemini-2.0-flash-lite": 8192,
  "gemini-2.0-flash":      8192,
  "gemini-2.5-flash":      32768,
  "gemini-2.5-pro":        32768,
};
const DEFAULT_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 保存先リポジトリ（固定。クライアントには触らせない＝書込先の悪用防止）
const GH_OWNER = "Dora-suke";
const GH_REPO = "shindanshi-matome";
const GH_BRANCH = "main";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

// UTF-8文字列 → base64（GitHub APIはbase64で受け取る）
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// GitHubへcommitして保存（トークンはWorker側だけが持つ）
async function ghSave(env, path, content) {
  if (!env.GITHUB_TOKEN) throw new Error("Worker側に GITHUB_TOKEN が未設定です");
  if (!path) throw new Error("保存パスが空です");
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const head = {
    "Authorization": "token " + env.GITHUB_TOKEN,
    "Accept": "application/vnd.github+json",
    "User-Agent": "aiep-worker",   // GitHub APIはUser-Agent必須
  };
  let sha = null;
  const cur = await fetch(url + "?ref=" + GH_BRANCH, { headers: head });
  if (cur.ok) sha = (await cur.json()).sha;
  const put = await fetch(url, {
    method: "PUT", headers: head,
    body: JSON.stringify({ message: "aiep: edit " + path, content: b64utf8(content), sha, branch: GH_BRANCH }),
  });
  if (!put.ok) throw new Error("GitHub保存失敗: " + (await put.text()));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method === "GET")
      return json({ ok: true, models: Object.keys(MODELS), default: DEFAULT_MODEL });
    if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

    let req;
    try { req = await request.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

    // 合言葉チェック（タダ乗り防止）
    if (!env.AIEP_SECRET || req.secret !== env.AIEP_SECRET)
      return json({ ok: false, error: "合言葉が違います（設定を確認してください）" }, 401);

    // 保存（commit）。GitHubトークンはWorkerのみが保持＝ブラウザに置かない
    if (req.action === "save") {
      try { await ghSave(env, req.path, req.content); return json({ ok: true, msg: "GitHubにcommitしました" }); }
      catch (e) { return json({ ok: false, error: String(e.message || e) }, 502); }
    }

    if (!env.GEMINI_API_KEY)
      return json({ ok: false, error: "Worker側に GEMINI_API_KEY が未設定です" }, 500);

    const model = MODELS[req.model] ? req.model : DEFAULT_MODEL;
    const maxOut = MODELS[model];

    const system =
      "あなたはHTML学習ノートの編集者です。" +
      "渡されるのはページ全体ではなく、ユーザーがページ上で選択した『一部分のHTML断片』です。" +
      "その断片を、指示に従って最小限だけ修正してください。" +
      "断片の外側の構造・前後の文脈・CSSクラス名・id・data属性は壊さず維持し、" +
      "余計なタグ（html/body/doctype等）を新しく足さないこと。返すのは修正後の断片だけです。" +
      "【厳守】専門用語・法律用語・固有名詞・人名・条文番号・数値は勝手に別の語へ置き換えたり" +
      "削除したりしない（例：『廃除』を『削除』に変える等は禁止）。意味を変えないこと。" +
      "『わかりやすく』と言われても、語そのものを差し替えるのではなく、補足や言い回しの調整にとどめる。" +
      "指示が曖昧なときは、元の意味を保つ最小限の変更にとどめること。" +
      "必ず次の形式『だけ』で出力してください（前後に余計な文字やコードブロック記号を書かない）:\n" +
      "<<<REPLY>>>\n変更点の短い日本語説明\n<<<HTML>>>\n修正後のHTML断片";

    const user = "【指示】\n" + (req.instruction || "") +
      "\n\n【選択されたHTML断片（この部分だけを直して返す）】\n" + (req.html || "");

    const contents = [];
    for (const h of (req.history || []).slice(-20)) {
      const role = h.role === "model" ? "model" : "user";
      const txt = (h.text || "").trim();
      if (txt) contents.push({ role, parts: [{ text: txt }] });
    }
    contents.push({ role: "user", parts: [{ text: user }] });

    const r = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxOut, temperature: 0.2 },
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ ok: false, error: "Gemini API エラー: " + JSON.stringify(data) }, 502);

    const cand = (data.candidates || [])[0];
    if (!cand) return json({ ok: false, error: "AIから返答がありません（安全フィルタ等の可能性）" }, 502);
    if (cand.finishReason === "MAX_TOKENS")
      return json({ ok: false, error: "出力が長すぎて途中で切れました。もっと狭い範囲を選んでください。" }, 502);

    const text = (cand.content?.parts || []).map(p => p.text || "").join("");
    let newHtml = null, reply = "";
    if (text.includes("<<<HTML>>>")) {
      const [before, after] = text.split("<<<HTML>>>");
      reply = before.replace("<<<REPLY>>>", "").trim();
      newHtml = after.trim();
    } else {
      const cb = text.match(/```(?:html)?\s*([\s\S]*?)```/);
      if (cb) { newHtml = cb[1].trim(); reply = text.slice(0, cb.index).replace("<<<REPLY>>>", "").trim(); }
      else if (/<!doctype|<html|<\w/i.test(text)) newHtml = text.trim();
    }
    if (newHtml) newHtml = newHtml.replace(/^```(?:html)?\s*/, "").replace(/\s*```$/, "").trim();
    if (!reply) reply = "✅ 修正しました（説明テキストは省略されました）";
    if (!newHtml) return json({ ok: false, error: "AIの出力からHTMLを取り出せませんでした。指示を変えて再試行してください。" }, 502);

    return json({ ok: true, html: newHtml, reply, model });
  },
};
