/* ============================================================================
 * aiep.js — AIノート編集パネル（汎用・1行で各ノートに追加）
 * 使い方：各ノートの </body> 直前にこの1行を入れるだけ
 *     <script src="../aiep.js"></script>      （NNN_科目/ 配下の1階層深いノート）
 *     <script src="aiep.js"></script>         （リポジトリ直下の index.html 等）
 *
 * 環境を自動判定して動作を切り替える：
 *   ● ローカル（file:// もしくは 127.0.0.1:8780 = server.py）
 *       AI呼び＝server.py /api/fragment ／ 保存＝server.py /api/save（実ファイルに書込）
 *   ● クラウド（github.io 等）
 *       AI呼び＝Cloudflare Worker（合言葉付き）／ 保存＝GitHubにcommit（PAT）
 *
 * クラウド利用に必要な設定（パネルの⚙️から入力・localStorage保存）：
 *   - Worker URL（https://xxxx.workers.dev）
 *   - 合言葉（Workerの AIEP_SECRET と一致させる）
 *   - GitHub PAT（Contents:write もしくは repo スコープ）
 * ========================================================================== */
(function () {
  if (window.__aiepLoaded) return; window.__aiepLoaded = true;

  // ---------- 環境判定 ----------
  const LOCAL = location.protocol === "file:" || /^(127\.0\.0\.1|localhost)/.test(location.hostname);
  const LOCAL_SERVER = "http://127.0.0.1:8780";
  const K = { worker: "aiep_worker_url", secret: "aiep_worker_secret", pat: "aiep_gh_pat", model: "aieditor_model" };
  const getLS = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ローカル保存先（file://なら自分の絶対パス）
  const FILE_PATH = decodeURIComponent(location.pathname);
  // クラウド保存先（project pages 前提： https://<owner>.github.io/<repo>/<path...> ）
  function ghInfo() {
    const owner = (location.hostname.split(".")[0] || "");
    const segs = location.pathname.split("/").filter(Boolean);
    const repo = segs[0] || "";
    const path = segs.slice(1).map(decodeURIComponent).join("/");
    return { owner, repo, path, branch: "main" };
  }

  // ---------- スタイル ----------
  const css = `
  #aiep{position:fixed;top:0;right:0;height:100vh;width:340px;z-index:99999;background:#fff;border-left:2px solid #4f46e5;
    box-shadow:-3px 0 14px rgba(0,0,0,.12);display:flex;flex-direction:column;
    font-family:-apple-system,'Hiragino Kaku Gothic ProN',sans-serif;font-size:13px;color:#1f2937;transition:transform .25s;}
  #aiep.closed{transform:translateX(340px);}
  #aiep .hd{display:flex;align-items:center;gap:6px;padding:9px 11px;background:#eef2ff;border-bottom:1px solid #e2e8f0;}
  #aiep .hd b{color:#4f46e5;font-size:13px;} #aiep .hd .dot{width:9px;height:9px;border-radius:50%;background:#cbd5e1;}
  #aiep .hd .dot.on{background:#16a34a;} #aiep .hd .dot.off{background:#dc2626;}
  #aiep .bd{flex:1;overflow:auto;padding:11px;display:flex;flex-direction:column;gap:10px;}
  #aiep .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;color:#475569;}
  #aiep .info b{color:#1f2937;}
  #aiep .sel{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;min-height:34px;
    max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;color:#78350f;}
  #aiep .sel .ph{color:#b45309;}
  #aiep textarea{width:100%;height:58px;resize:vertical;padding:7px 9px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;line-height:1.5;}
  #aiep input{width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-family:inherit;box-sizing:border-box;}
  #aiep .modelbar{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#64748b;}
  #aiep .modelbar select{flex:1;padding:4px 6px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-family:inherit;}
  #aiep button{border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;padding:8px 10px;}
  #aiep button:disabled{opacity:.5;cursor:default;}
  #aiep .b-edit{background:#4f46e5;color:#fff;} #aiep .b-save{background:#16a34a;color:#fff;}
  #aiep .b-reload{background:#e0e7ff;color:#3730a3;font-size:12px;padding:6px 8px;}
  #aiep .row{display:flex;gap:7px;} #aiep .row>button{flex:1;}
  #aiep .logwrap{flex:1;min-height:60px;overflow:auto;display:flex;flex-direction:column;gap:7px;}
  #aiep .m{padding:7px 10px;border-radius:10px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
  #aiep .m.me{align-self:flex-end;background:#4f46e5;color:#fff;} #aiep .m.ai{align-self:flex-start;background:#eef2ff;color:#1e1b4b;}
  #aiep .m.sys{align-self:center;background:#fef9c3;color:#854d0e;font-size:11.5px;text-align:center;}
  #aiep .hint{font-size:11px;color:#94a3b8;line-height:1.6;}
  #aiep .setbox{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;}
  #aiep .setbox label{font-size:11px;color:#64748b;}
  #aiep-tab{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:99998;background:#4f46e5;color:#fff;border:none;
    border-radius:9px 0 0 9px;padding:11px 7px;cursor:pointer;writing-mode:vertical-rl;font-weight:800;font-size:13px;letter-spacing:2px;box-shadow:-2px 0 8px rgba(0,0,0,.15);}
  @media(max-width:600px){#aiep{width:88vw;}#aiep.closed{transform:translateX(88vw);}}
  body.aiep-open{margin-right:344px;transition:margin-right .25s;}
  @media(max-width:600px){body.aiep-open{margin-right:0;}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- パネルDOM ----------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <button id="aiep-tab">🤖 AI編集</button>
  <div id="aiep" class="closed">
    <div class="hd"><span class="dot" id="aiep-dot"></span><b>🤖 AI編集</b><span style="flex:1"></span>
      <button class="b-reload" id="aiep-close">閉じる ✕</button></div>
    <div class="bd">
      <div class="info" id="aiep-info">確認中…</div>
      <div class="setbox" id="aiep-set" style="display:none">
        <label>Worker URL</label><input id="aiep-cfg-worker" placeholder="https://xxxx.workers.dev">
        <label>合言葉（AIEP_SECRET）</label><input id="aiep-cfg-secret" type="password" placeholder="合言葉">
        <label>GitHub PAT（保存用・Contents:write）</label><input id="aiep-cfg-pat" type="password" placeholder="github_pat_...">
        <button class="b-edit" id="aiep-cfg-save" style="margin-top:4px">設定を保存</button>
      </div>
      <div class="hint">① 直したい文を<b>ドラッグ選択</b> → ② 指示 → ③「選択をAIで直す」→ ④「💾保存」</div>
      <div><div style="font-size:11.5px;color:#64748b;margin-bottom:3px;">選択中：</div>
        <div class="sel" id="aiep-sel"><span class="ph">（まだ選択されていません）</span></div></div>
      <div class="modelbar"><span>🧠</span><select id="aiep-model"></select></div>
      <textarea id="aiep-inp" placeholder="例：この文をやさしく言い換えて／『廃除』は変えずに下へ意味を1行補足"></textarea>
      <button class="b-reload" id="aiep-widen" style="width:100%">🔼 対象を一段広げる（カードごと直す時）</button>
      <button class="b-edit" id="aiep-edit">選択をAIで直す</button>
      <div class="row"><button class="b-reload" id="aiep-undo">↩ 元に戻す</button>
        <button class="b-save" id="aiep-save">💾 保存</button>
        <button class="b-reload" id="aiep-rl">↻ 再読込</button></div>
      <div class="modelbar"><span id="aiep-hist">🧠 文脈 0往復を保持中</span><span style="flex:1"></span>
        <button class="b-reload" style="padding:3px 8px;font-size:11px" id="aiep-clr">文脈クリア</button>
        <button class="b-reload" style="padding:3px 8px;font-size:11px" id="aiep-gear">⚙️</button></div>
      <div class="logwrap" id="aiep-log"></div>
      <div class="hint" id="aiep-foot"></div>
    </div>
  </div>`;
  document.body.appendChild(wrap);

  const $ = id => document.getElementById(id);
  const dot = s => { $("aiep-dot").className = "dot " + (s || ""); };
  const log = (cls, t) => { const d = document.createElement("div"); d.className = "m " + cls; d.textContent = t; $("aiep-log").appendChild(d); $("aiep-log").scrollTop = 1e9; };
  const norm = s => (s || "").replace(/\s+/g, " ").trim();

  // ---------- 状態 ----------
  let srcText = null, srcDoc = null, targetEl = null, dirty = false, lastEdit = null, hiEl = null;
  const HKEY = "aiep_hist_" + FILE_PATH;
  let history = []; try { history = JSON.parse(getLS(HKEY) || "[]"); } catch (e) { history = []; }
  const TOO_BIG = 6000;

  function pushHist(role, text) { history.push({ role, text }); history = history.slice(-20); setLS(HKEY, JSON.stringify(history)); updHist(); }
  function updHist() { const el = $("aiep-hist"); if (el) el.textContent = "🧠 文脈 " + Math.floor(history.length / 2) + "往復を保持中"; }
  function clearHi() { if (hiEl) { hiEl.style.outline = hiEl.dataset._ao || ""; delete hiEl.dataset._ao; hiEl = null; } }
  function setHi(el) { clearHi(); hiEl = el; el.dataset._ao = el.style.outline || ""; el.style.outline = "2px solid #4f46e5"; }
  function replaceEl(el, html) { const t = document.createElement("div"); t.innerHTML = html; const n = t.firstElementChild || document.createTextNode(html); el.replaceWith(n); return n; }

  // ---------- 正本DOM側の対応要素特定（最寄りid起点＋タグ＋テキスト一致） ----------
  function findSrcEl(live) {
    if (live.id && srcDoc.getElementById(live.id)) return srcDoc.getElementById(live.id);
    const anchor = live.closest("[id]");
    let srcAnchor, scopeLive;
    if (anchor && anchor.id && srcDoc.getElementById(anchor.id)) { srcAnchor = srcDoc.getElementById(anchor.id); scopeLive = anchor; }
    else { srcAnchor = srcDoc.body; scopeLive = document.body; }
    if (!srcAnchor) return null;
    const tag = live.tagName, key = norm(live.textContent);
    const lc = [...scopeLive.querySelectorAll(tag)].filter(e => norm(e.textContent) === key);
    const sc = [...srcAnchor.querySelectorAll(tag)].filter(e => norm(e.textContent) === key);
    const i = lc.indexOf(live);
    if (i < 0 || sc.length !== lc.length || !sc[i]) return null;
    return sc[i];
  }

  // ---------- IO（環境で切替） ----------
  async function ioModels() {
    if (LOCAL) { const j = await (await fetch(LOCAL_SERVER + "/api/models")).json(); return j; }
    const w = getLS(K.worker); if (!w) return { ok: false };
    return await (await fetch(w)).json();
  }
  async function ioGetSrc() {
    if (LOCAL) { const j = await (await fetch(LOCAL_SERVER + "/api/note?path=" + encodeURIComponent(FILE_PATH))).json(); if (!j.ok) throw new Error(j.error); return j.html; }
    const r = await fetch(location.href, { cache: "no-store" }); if (!r.ok) throw new Error("ページ取得失敗 " + r.status); return await r.text();
  }
  async function ioAI(before, inst, model) {
    if (LOCAL) {
      const j = await (await fetch(LOCAL_SERVER + "/api/fragment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: before, instruction: inst, model, history }) })).json();
      if (!j.ok) throw new Error(j.error); return j;
    }
    const w = getLS(K.worker), s = getLS(K.secret);
    if (!w || !s) throw new Error("⚙️でWorker URLと合言葉を設定してください");
    const j = await (await fetch(w, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: before, instruction: inst, model, history, secret: s }) })).json();
    if (!j.ok) throw new Error(j.error); return j;
  }
  function b64utf8(str) { return btoa(unescape(encodeURIComponent(str))); }
  async function ioSave(out) {
    if (LOCAL) {
      const j = await (await fetch(LOCAL_SERVER + "/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: FILE_PATH, html: out }) })).json();
      if (!j.ok) throw new Error(j.error); return "💾 ローカルに保存しました（.bak作成）";
    }
    const pat = getLS(K.pat); if (!pat) throw new Error("⚙️でGitHub PATを設定してください");
    const g = ghInfo();
    const api = `https://api.github.com/repos/${g.owner}/${g.repo}/contents/${g.path.split("/").map(encodeURIComponent).join("/")}`;
    const head = { "Authorization": "token " + pat, "Accept": "application/vnd.github+json" };
    let sha = null;
    const cur = await fetch(api + "?ref=" + g.branch, { headers: head });
    if (cur.ok) sha = (await cur.json()).sha;
    const put = await fetch(api, { method: "PUT", headers: head, body: JSON.stringify({ message: "aiep: edit " + g.path, content: b64utf8(out), sha, branch: g.branch }) });
    if (!put.ok) throw new Error("GitHub保存失敗: " + (await put.text()));
    return "💾 GitHubにcommitしました（Pagesに反映されるまで数十秒）";
  }

  // ---------- 起動 ----------
  async function loadModels() {
    try {
      const j = await ioModels(); if (!j || !j.ok) return;
      const sel = $("aiep-model"); sel.innerHTML = ""; const saved = getLS(K.model);
      j.models.forEach(m => { const o = document.createElement("option"); o.value = m; o.textContent = m + (m === j.default ? "（既定）" : ""); sel.appendChild(o); });
      sel.value = (saved && j.models.includes(saved)) ? saved : j.default;
      sel.onchange = () => setLS(K.model, sel.value);
    } catch (e) {}
  }
  async function loadSrc() {
    try {
      srcText = await ioGetSrc();
      srcDoc = new DOMParser().parseFromString(srcText, "text/html");
      dot("on");
      const tabs = (srcText.match(/class="tab-content"/g) || []).length;
      $("aiep-info").innerHTML = "接続：<b>OK ✅</b>（" + (LOCAL ? "ローカル" : "クラウド/GitHub保存") + "）<br>ファイル：<b>" +
        (LOCAL ? FILE_PATH.split("/").pop() : ghInfo().path.split("/").pop()) + "</b><br>文字数：<b>" + srcText.length.toLocaleString() + "</b>　タブ数：<b>" + tabs + "</b>";
      $("aiep-foot").textContent = LOCAL ? "保存→同じ場所に.bak。大きな変更はターミナルのClaudeで。" : "保存→GitHubにcommit（公開反映）。Mac側はgit pullで同期。";
    } catch (e) {
      dot("off");
      if (LOCAL) $("aiep-info").innerHTML = "接続：<b style='color:#dc2626'>未接続 ⚠️</b><br>ターミナルで server.py を起動してください。";
      else { $("aiep-info").innerHTML = "接続：<b style='color:#dc2626'>未設定 ⚠️</b><br>⚙️ で Worker URL・合言葉・PAT を設定してください。"; $("aiep-set").style.display = "flex"; }
    }
  }

  // ---------- 操作 ----------
  document.addEventListener("selectionchange", () => {
    const s = window.getSelection(); if (!s || s.rangeCount === 0) return;
    const r = s.getRangeAt(0); if (r.collapsed) return;
    let node = r.commonAncestorContainer, el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return; if ($("aiep").contains(el) || $("aiep-tab") === el) return;
    const tn = el.tagName.toLowerCase(), txt = (el.textContent || "").trim();
    if (tn === "body" || tn === "html" || tn === "main" || txt.length > TOO_BIG) {
      targetEl = null; clearHi(); $("aiep-sel").innerHTML = '<span class="ph">⚠️ 範囲が広すぎます。1文・1セル・1項目だけを選んでください</span>'; return;
    }
    targetEl = el; setHi(el); $("aiep-sel").textContent = "<" + tn + "> " + (txt.length > 120 ? txt.slice(0, 120) + "…" : txt);
  });

  $("aiep-tab").onclick = () => { const c = $("aiep").classList.toggle("closed"); document.body.classList.toggle("aiep-open", !c); };
  $("aiep-close").onclick = () => $("aiep-tab").onclick();
  $("aiep-rl").onclick = () => location.reload();
  $("aiep-gear").onclick = () => { const s = $("aiep-set"); s.style.display = s.style.display === "none" ? "flex" : "none"; };
  $("aiep-clr").onclick = () => { history = []; try { localStorage.removeItem(HKEY); } catch (e) {} updHist(); log("sys", "🧠 文脈をクリアしました"); };
  $("aiep-cfg-save").onclick = () => { setLS(K.worker, $("aiep-cfg-worker").value.trim()); setLS(K.secret, $("aiep-cfg-secret").value.trim()); setLS(K.pat, $("aiep-cfg-pat").value.trim()); log("sys", "⚙️ 設定を保存しました"); loadModels(); loadSrc(); };
  $("aiep-cfg-worker").value = getLS(K.worker); $("aiep-cfg-secret").value = getLS(K.secret); $("aiep-cfg-pat").value = getLS(K.pat);

  $("aiep-widen").onclick = () => {
    if (!targetEl) { log("sys", "⚠️ 先に本文の一部を選択してください"); return; }
    const p = targetEl.parentElement; if (!p || p.tagName === "BODY" || p.tagName === "HTML") { log("sys", "これ以上は広げられません"); return; }
    targetEl = p; setHi(p); const txt = (p.textContent || "").trim();
    $("aiep-sel").textContent = "<" + p.tagName.toLowerCase() + "> " + (txt.length > 120 ? txt.slice(0, 120) + "…" : txt);
  };

  $("aiep-edit").onclick = async () => {
    if (!srcDoc) { log("sys", "⚠️ 未接続。設定/サーバーを確認して再読込してください"); return; }
    if (!targetEl) { log("sys", "⚠️ 先にノート本文で直したい箇所を選択してください"); return; }
    const inst = $("aiep-inp").value.trim(); if (!inst) { log("sys", "⚠️ 指示を入力してください"); return; }
    const srcEl = findSrcEl(targetEl);
    if (!srcEl) { log("sys", "⚠️ 正本側の対応箇所を特定できませんでした。もう少し狭く選び直してください"); return; }
    const before = srcEl.outerHTML;
    log("me", "<" + targetEl.tagName.toLowerCase() + "> (" + before.length.toLocaleString() + "字)\n→ " + inst);
    $("aiep-edit").disabled = true;
    const wait = document.createElement("div"); wait.className = "m ai"; wait.textContent = "AIが修正中… ⏳"; $("aiep-log").appendChild(wait); $("aiep-log").scrollTop = 1e9;
    try {
      const j = await ioAI(before, inst, $("aiep-model").value);
      pushHist("user", "対象<" + targetEl.tagName.toLowerCase() + ">「" + norm(targetEl.textContent).slice(0, 60) + "」への指示: " + inst);
      pushHist("model", j.reply);
      const frag = j.html, srcBefore = srcEl.outerHTML, liveBefore = targetEl.outerHTML;
      clearHi();
      const newSrc = replaceEl(srcEl, frag); let newLive = null; try { newLive = replaceEl(targetEl, frag); } catch (e) {}
      lastEdit = { newSrc, srcBefore, newLive, liveBefore }; dirty = true; targetEl = null;
      wait.textContent = "✅ " + j.reply + "（" + j.model + "）\n※「💾保存」で反映／間違いは「↩ 元に戻す」";
      $("aiep-inp").value = ""; $("aiep-sel").innerHTML = '<span class="ph">（まだ選択されていません）</span>';
    } catch (e) { wait.textContent = "⚠️ " + e.message; }
    $("aiep-edit").disabled = false;
  };

  $("aiep-undo").onclick = () => {
    if (!lastEdit) { log("sys", "取り消せる編集がありません（直前の1手のみ）"); return; }
    try { if (lastEdit.newSrc) replaceEl(lastEdit.newSrc, lastEdit.srcBefore); } catch (e) {}
    try { if (lastEdit.newLive) replaceEl(lastEdit.newLive, lastEdit.liveBefore); } catch (e) {}
    lastEdit = null; dirty = true; log("sys", "↩ 直前の編集を取り消しました");
  };

  $("aiep-save").onclick = async () => {
    if (!srcDoc) { log("sys", "⚠️ 未接続"); return; }
    if (!dirty) { log("sys", "保存する変更がありません"); return; }
    $("aiep-save").disabled = true;
    try { const out = "<!DOCTYPE html>\n" + srcDoc.documentElement.outerHTML; const msg = await ioSave(out); srcText = out; dirty = false; log("sys", msg + "。最新表示は「↻ 再読込」"); }
    catch (e) { log("sys", "⚠️ " + e.message); }
    $("aiep-save").disabled = false;
  };

  loadModels(); loadSrc(); updHist();
})();
