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
 *       AI呼び＝Cloudflare Worker（合言葉付き）／ 保存＝Worker経由でGitHubにcommit（トークンはWorker側）
 *
 * クラウド利用に必要な設定（パネルの⚙️から入力・localStorage保存）：
 *   - Worker URL（https://xxxx.workers.dev）
 *   - 合言葉（Workerの AIEP_SECRET と一致させる）
 *   （GitHubトークンはWorkerのシークレット GITHUB_TOKEN に保管。ブラウザには置かない）
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
  #aiep{position:fixed;top:0;right:0;height:100vh;width:var(--aiep-w,400px);max-width:96vw;min-width:260px;z-index:99999;background:#fff;border-left:2px solid #4f46e5;
    box-shadow:-3px 0 14px rgba(0,0,0,.12);display:flex;flex-direction:column;
    font-family:-apple-system,'Hiragino Kaku Gothic ProN',sans-serif;font-size:13px;color:#1f2937;transition:transform .25s;}
  #aiep.closed{transform:translateX(100%);}
  #aiep.resizing{transition:none;user-select:none;}
  #aiep-grip{position:absolute;top:0;left:-4px;width:10px;height:100%;cursor:ew-resize;z-index:100000;}
  #aiep-grip::before{content:"";position:absolute;top:50%;left:3px;transform:translateY(-50%);width:4px;height:46px;border-radius:3px;background:#c7d2fe;}
  #aiep-grip:hover::before{background:#4f46e5;}
  #aiep .hd{display:flex;align-items:center;gap:6px;padding:9px 11px;background:#eef2ff;border-bottom:1px solid #e2e8f0;}
  #aiep .hd b{color:#4f46e5;font-size:13px;} #aiep .hd .dot{width:9px;height:9px;border-radius:50%;background:#cbd5e1;}
  #aiep .hd .dot.on{background:#16a34a;} #aiep .hd .dot.off{background:#dc2626;}
  #aiep .bd{flex:1;overflow:auto;padding:11px;display:flex;flex-direction:column;gap:10px;}
  #aiep .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.7;color:#475569;}
  #aiep .info b{color:#1f2937;}
  #aiep .sel{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;min-height:34px;
    max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;color:#78350f;}
  #aiep .sel .ph{color:#b45309;}
  #aiep textarea{width:100%;height:140px;min-height:90px;resize:vertical;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;line-height:1.6;}
  #aiep input{width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-family:inherit;box-sizing:border-box;}
  #aiep .modelbar{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#64748b;}
  #aiep .modelbar select{flex:1;padding:4px 6px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;font-family:inherit;}
  #aiep button{border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;padding:8px 10px;}
  #aiep button:disabled{opacity:.5;cursor:default;}
  #aiep .b-edit{background:#4f46e5;color:#fff;} #aiep .b-save{background:#16a34a;color:#fff;}
  #aiep .b-reload{background:#e0e7ff;color:#3730a3;font-size:12px;padding:6px 8px;}
  #aiep .row{display:flex;gap:7px;} #aiep .row>button{flex:1;}
  #aiep .modebar{display:flex;gap:6px;}
  #aiep .mode-btn{flex:1;padding:6px 8px;border:1px solid #c7d2fe;background:#fff;color:#475569;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;}
  #aiep .mode-btn.active{background:#4f46e5;color:#fff;border-color:#4f46e5;}
  #aiep .logwrap{flex:1 1 auto;min-height:180px;overflow:auto;display:flex;flex-direction:column;gap:7px;}
  /* ℹ️ で説明・接続情報・補助UIをたたみ、回答ログを最大化 */
  #aiep.lean #aiep-meta,#aiep.lean #aiep-foot,#aiep.lean #aiep-widen{display:none;}
  #aiep.lean .logwrap{min-height:300px;}
  #aiep .m{padding:7px 10px;border-radius:10px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
  #aiep .m.me{align-self:flex-end;background:#4f46e5;color:#fff;} #aiep .m.ai{align-self:flex-start;background:#eef2ff;color:#1e1b4b;}
  #aiep .m.sys{align-self:center;background:#fef9c3;color:#854d0e;font-size:11.5px;text-align:center;}
  #aiep .hint{font-size:11px;color:#94a3b8;line-height:1.6;}
  #aiep .setbox{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;}
  #aiep .setbox label{font-size:11px;color:#64748b;}
  #aiep-tab{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:99998;background:#4f46e5;color:#fff;border:none;
    border-radius:9px 0 0 9px;padding:11px 7px;cursor:pointer;writing-mode:vertical-rl;font-weight:800;font-size:13px;letter-spacing:2px;box-shadow:-2px 0 8px rgba(0,0,0,.15);}
  @media(max-width:600px){#aiep{width:88vw;}#aiep.closed{transform:translateX(88vw);}}
  body.aiep-open{margin-right:calc(var(--aiep-w,400px) + 4px);transition:margin-right .25s;}
  body.aiep-resizing,body.aiep-resizing *{cursor:ew-resize !important;}
  @media(max-width:600px){body.aiep-open{margin-right:0;}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- パネルDOM ----------
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <button id="aiep-tab">🤖 AI編集</button>
  <div id="aiep" class="closed">
    <div id="aiep-grip" title="ドラッグで幅を調整（ダブルクリックで既定幅）"></div>
    <div class="hd"><span class="dot" id="aiep-dot"></span><b>🤖 AI編集</b><span style="flex:1"></span>
      <button class="b-reload" id="aiep-lean" title="説明・接続情報の表示/非表示">ℹ️ 説明 ▸</button>
      <button class="b-reload" id="aiep-close">閉じる ✕</button></div>
    <div class="bd">
      <div id="aiep-meta">
        <div class="info" id="aiep-info">確認中…</div>
        <div class="hint">① 直したい文を<b>ドラッグ選択</b> → ② 指示 → ③「選択をAIで直す」→ ④「💾保存」</div>
      </div>
      <div class="setbox" id="aiep-set" style="display:none">
        <label>Worker URL</label><input id="aiep-cfg-worker" placeholder="https://xxxx.workers.dev">
        <label>合言葉（AIEP_SECRET）</label><input id="aiep-cfg-secret" type="password" placeholder="合言葉">
        <button class="b-edit" id="aiep-cfg-save" style="margin-top:4px">設定を保存</button>
      </div>
      <div class="modebar" id="aiep-modebar">
        <button class="mode-btn active" id="aiep-mode-char" title="ドラッグした文字だけを直す">✏️ 文字だけ</button>
        <button class="mode-btn" id="aiep-mode-range" title="その文字を含む要素（文・カード等）ごと直す">▢ 範囲</button>
      </div>
      <div><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="font-size:11.5px;color:#64748b;">選択中：</span><span style="flex:1"></span>
          <button class="b-reload" id="aiep-sel-clear" style="padding:2px 8px;font-size:11px">✕ 選択クリア</button></div>
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
  let selText = "";                                   // ドラッグ選択した実際の文字列（「文字だけ」モード用）
  let selMode = getLS("aiep_selmode") || "char";      // "char"=文字だけ / "range"=範囲（要素ごと）
  const HKEY = "aiep_hist_" + FILE_PATH;
  let history = []; try { history = JSON.parse(getLS(HKEY) || "[]"); } catch (e) { history = []; }
  const TOO_BIG = 6000;

  function pushHist(role, text) { history.push({ role, text }); history = history.slice(-20); setLS(HKEY, JSON.stringify(history)); updHist(); }
  function updHist() { const el = $("aiep-hist"); if (el) el.textContent = "🧠 文脈 " + Math.floor(history.length / 2) + "往復を保持中"; }
  function clearHi() { if (hiEl) { hiEl.style.outline = hiEl.dataset._ao || ""; delete hiEl.dataset._ao; hiEl = null; } }
  function setHi(el) { clearHi(); hiEl = el; el.dataset._ao = el.style.outline || ""; el.style.outline = "2px solid #4f46e5"; }
  function replaceEl(el, html) { const t = document.createElement("div"); t.innerHTML = html; const n = t.firstElementChild || document.createTextNode(html); el.replaceWith(n); return n; }

  // ---------- 正本DOM側の対応要素特定（最寄りid起点＋テキスト一致／数のズレに寛容） ----------
  // qz-memo等が実行時にDOMへ要素を差し込む（注釈ラッパ <mark class="sz-*">・アイコン .sz-cm-icon・
  // 予習クローン [id^="pre_"]）ため、ライブと正本で要素やテキストがズレる。
  //  ・cleanKey: ライブ限定の注入ノードを除いた正規化テキストで比較する。
  //  ・選択要素がライブ限定要素（mark等）で正本に無い場合は、一致する最寄りの上位ブロックへ自動で昇る。
  // ライブ限定で「テキストを増やす」注入ノード（正本側には存在しない）。除去してから比較。
  //  ・button … qz-hideの隠すボタン（textContent="○"）/プレースホルダの「表示」/v4ボタン等（静的chk30-optも両側対称に除去）
  //  ・.row-hide-btn … 行非表示ボタン「○」  ・[class*="hidden-ph"] … 非表示プレースホルダ（row/tr）
  //  ・.kt-hint/.kt-caret … ことば箱の「タップで開く」「▼」  ・.sz-cm-icon … qz-memo注釈アイコン  ・[id^=pre_] … 予習クローン
  const STRIP_SEL = "button,.row-hide-btn,[class*=\"hidden-ph\"],[class*=\"hide-btn\"],.kt-hint,.kt-caret,.sz-cm-icon,[id^=\"pre_\"]";
  function cleanKey(el) {
    let t;
    try {
      const c = el.cloneNode(true);
      if (c.querySelectorAll) c.querySelectorAll(STRIP_SEL).forEach(n => n.remove());
      t = c.textContent;
    } catch (e) { t = el.textContent || ""; }
    return norm(t);
  }
  // 1要素ぶんの照合（昇格なし）。見つからなければ null。
  function matchOne(live, srcAnchor, scopeLive) {
    const tag = live.tagName, key = cleanKey(live);
    if (!key) return null;
    const sc = [...srcAnchor.querySelectorAll(tag)].filter(e => cleanKey(e) === key);
    if (sc.length === 1) return sc[0];                       // ① 同タグで一意→確定
    const lc = [...scopeLive.querySelectorAll(tag)].filter(e => cleanKey(e) === key);
    const i = lc.indexOf(live);
    if (sc.length && sc.length === lc.length && i >= 0 && sc[i]) return sc[i]; // ② 数一致なら位置合わせ
    const any = [...srcAnchor.querySelectorAll("*")].filter(e => cleanKey(e) === key);
    if (any.length === 1) return any[0];                     // ③ タグ不問で一意なら採用
    return null;
  }
  let lastDiag = "", matchedLive = null;
  function findSrcEl(live) {
    lastDiag = ""; matchedLive = live;
    if (live.id && srcDoc.getElementById(live.id)) return srcDoc.getElementById(live.id);
    const anchor = live.closest("[id]");
    const hasAnchor = anchor && anchor.id && srcDoc.getElementById(anchor.id);
    const srcAnchor = hasAnchor ? srcDoc.getElementById(anchor.id) : srcDoc.body;
    const scopeLive = hasAnchor ? anchor : document.body;
    // 選択要素から上へ、一致する最寄りブロックを探す（mark等のライブ限定要素を自動でスキップ）
    let cur = live, hops = 0;
    while (cur && cur !== scopeLive && cur !== document.body && hops < 6) {
      const m = matchOne(cur, srcAnchor, scopeLive);
      if (m) { matchedLive = cur; return m; }
      cur = cur.parentElement; hops++;
    }
    const k = cleanKey(live);
    const liveOnly = live.tagName === "MARK" || /(^|\s)sz-/.test(live.className || "");
    lastDiag = `anchor=${hasAnchor ? "#" + anchor.id : "body"}, tag=${live.tagName.toLowerCase()}` +
      (liveOnly ? "(注釈要素)" : "") + `, key="${k.slice(0, 48)}${k.length > 48 ? "…" : ""}"`;
    return null;
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
  async function ioSave(out) {
    if (LOCAL) {
      const j = await (await fetch(LOCAL_SERVER + "/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: FILE_PATH, html: out }) })).json();
      if (!j.ok) throw new Error(j.error); return "💾 ローカルに保存しました（.bak作成）";
    }
    // 保存はWorker経由でcommit（GitHubトークンはWorker側だけが持つ＝ブラウザに置かない）
    const w = getLS(K.worker), s = getLS(K.secret);
    if (!w || !s) throw new Error("⚙️でWorker URLと合言葉を設定してください");
    const g = ghInfo();
    const j = await (await fetch(w, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", path: g.path, content: out, secret: s }) })).json();
    if (!j.ok) throw new Error(j.error);
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
      else { $("aiep-info").innerHTML = "接続：<b style='color:#dc2626'>未設定 ⚠️</b><br>⚙️ で Worker URL・合言葉 を設定してください。"; $("aiep-set").style.display = "flex"; }
    }
  }

  // ---------- 操作 ----------
  // 選択中表示の更新（モードに応じて「文字だけ」or「要素ごと」を見せる）
  function renderSel() {
    const el = targetEl; if (!el) return;
    if (selMode === "char" && selText) {
      clearHi();   // 大きな枠は出さず、選んだ文字そのものを見せる
      const t = selText, tag = el.tagName.toLowerCase();
      $("aiep-sel").innerHTML = '✏️ <b>「' + (t.length > 140 ? t.slice(0, 140) + "…" : t).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])) + '」</b><span style="color:#94a3b8">（' + tag + ' 内）</span>';
    } else {
      setHi(el); const txt = (el.textContent || "").trim();
      $("aiep-sel").textContent = "<" + el.tagName.toLowerCase() + "> " + (txt.length > 120 ? txt.slice(0, 120) + "…" : txt);
    }
  }
  document.addEventListener("selectionchange", () => {
    const s = window.getSelection(); if (!s || s.rangeCount === 0) return;
    const r = s.getRangeAt(0); if (r.collapsed) return;
    let node = r.commonAncestorContainer, el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return; if ($("aiep").contains(el) || $("aiep-tab") === el) return;
    const tn = el.tagName.toLowerCase(), txt = (el.textContent || "").trim();
    if (tn === "body" || tn === "html" || tn === "main" || txt.length > TOO_BIG) {
      targetEl = null; selText = ""; clearHi(); $("aiep-sel").innerHTML = '<span class="ph">⚠️ 範囲が広すぎます。1文・1セル・1項目だけを選んでください</span>'; return;
    }
    targetEl = el; selText = norm(s.toString());
    renderSel();
  });

  $("aiep-tab").onclick = () => { const c = $("aiep").classList.toggle("closed"); document.body.classList.toggle("aiep-open", !c); };
  $("aiep-close").onclick = () => $("aiep-tab").onclick();
  // ℹ️ 説明・接続情報をたたんで回答ログを最大化（既定は畳む。ℹ️で開いた状態だけ記憶）
  const leanLabel = () => { $("aiep-lean").textContent = $("aiep").classList.contains("lean") ? "ℹ️ 説明 ▸" : "ℹ️ 説明 ▾"; };
  if (getLS("aiep_lean") !== "0") $("aiep").classList.add("lean");
  leanLabel();
  $("aiep-lean").onclick = () => { const on = $("aiep").classList.toggle("lean"); setLS("aiep_lean", on ? "1" : "0"); leanLabel(); };
  // 横幅をドラッグで微調整（保存／ダブルクリックで既定幅400pxに戻す）
  const DEF_W = 400;
  const setW = (w) => { w = Math.max(260, Math.min(w, Math.floor(window.innerWidth * 0.96))); document.documentElement.style.setProperty("--aiep-w", w + "px"); setLS("aiep_w", String(w)); };
  (function () { const sv = parseInt(getLS("aiep_w"), 10); if (sv) document.documentElement.style.setProperty("--aiep-w", Math.max(260, sv) + "px"); })();
  $("aiep-grip").addEventListener("pointerdown", (e) => {
    e.preventDefault(); $("aiep").classList.add("resizing"); document.body.classList.add("aiep-resizing");
    const move = (ev) => setW(window.innerWidth - ev.clientX);
    const up = () => { $("aiep").classList.remove("resizing"); document.body.classList.remove("aiep-resizing"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  });
  $("aiep-grip").addEventListener("dblclick", () => setW(DEF_W));
  $("aiep-rl").onclick = () => location.reload();
  // 選択モード（✏️文字だけ / ▢範囲）切替
  function applyMode() {
    $("aiep").classList.toggle("mode-range", selMode === "range");
    $("aiep-mode-char").classList.toggle("active", selMode === "char");
    $("aiep-mode-range").classList.toggle("active", selMode === "range");
    renderSel();
  }
  // 選択中をリセット
  $("aiep-sel-clear").onclick = () => {
    targetEl = null; selText = ""; clearHi();
    try { const s = window.getSelection(); s && s.removeAllRanges(); } catch (e) {}
    $("aiep-sel").innerHTML = '<span class="ph">（まだ選択されていません）</span>';
  };
  $("aiep-mode-char").onclick = () => { selMode = "char"; setLS("aiep_selmode", selMode); applyMode(); };
  $("aiep-mode-range").onclick = () => { selMode = "range"; setLS("aiep_selmode", selMode); applyMode(); };
  applyMode();
  $("aiep-gear").onclick = () => { const s = $("aiep-set"); s.style.display = s.style.display === "none" ? "flex" : "none"; };
  $("aiep-clr").onclick = () => { history = []; try { localStorage.removeItem(HKEY); } catch (e) {} updHist(); log("sys", "🧠 文脈をクリアしました"); };
  $("aiep-cfg-save").onclick = () => { setLS(K.worker, $("aiep-cfg-worker").value.trim()); setLS(K.secret, $("aiep-cfg-secret").value.trim()); log("sys", "⚙️ 設定を保存しました"); loadModels(); loadSrc(); };
  $("aiep-cfg-worker").value = getLS(K.worker); $("aiep-cfg-secret").value = getLS(K.secret);

  $("aiep-widen").onclick = () => {
    if (!targetEl) { log("sys", "⚠️ 先に本文の一部を選択してください"); return; }
    // 「文字だけ」から押した場合は範囲モードへ切替（一段広げる＝要素ごと直す操作のため）
    if (selMode === "char") { selMode = "range"; setLS("aiep_selmode", selMode); applyMode(); }
    const p = targetEl.parentElement; if (!p || p.tagName === "BODY" || p.tagName === "HTML") { log("sys", "これ以上は広げられません"); return; }
    targetEl = p; setHi(p); const txt = (p.textContent || "").trim();
    $("aiep-sel").textContent = "<" + p.tagName.toLowerCase() + "> " + (txt.length > 120 ? txt.slice(0, 120) + "…" : txt);
  };

  $("aiep-edit").onclick = async () => {
    if (!srcDoc) { log("sys", "⚠️ 未接続。設定/サーバーを確認して再読込してください"); return; }
    if (!targetEl) { log("sys", "⚠️ 先にノート本文で直したい箇所を選択してください"); return; }
    const inst = $("aiep-inp").value.trim(); if (!inst) { log("sys", "⚠️ 指示を入力してください"); return; }
    const srcEl = findSrcEl(targetEl);
    if (!srcEl) { log("sys", "⚠️ 正本側の対応箇所を特定できませんでした（" + (lastDiag || "") + "）。もう少し狭く選び直してください"); return; }
    const before = srcEl.outerHTML;
    // 「文字だけ」モード：要素全体を渡しつつ、選んだ語句以外は1文字も変えないようAIに制約
    const charMode = selMode === "char" && selText;
    const instSend = charMode
      ? ("この要素のうち、次の語句だけを対象に直してください：「" + selText + "」\n指示：" + inst +
         "\n厳守：対象の語句以外の文字・タグ・属性・空白・改行は一切変更せず、要素全体をそのまま返すこと。対象語句が複数あれば最初の1か所だけ直す。")
      : inst;
    log("me", (charMode ? "✏️「" + selText.slice(0, 40) + (selText.length > 40 ? "…" : "") + "」" : "▢ <" + targetEl.tagName.toLowerCase() + "> (" + before.length.toLocaleString() + "字)") + "\n→ " + inst);
    $("aiep-edit").disabled = true;
    const wait = document.createElement("div"); wait.className = "m ai"; wait.textContent = "AIが修正中… ⏳"; $("aiep-log").appendChild(wait); $("aiep-log").scrollTop = 1e9;
    try {
      const j = await ioAI(before, instSend, $("aiep-model").value);
      pushHist("user", "対象<" + targetEl.tagName.toLowerCase() + ">「" + norm(targetEl.textContent).slice(0, 60) + "」への指示: " + inst);
      pushHist("model", j.reply);
      const liveEl = matchedLive || targetEl;
      const frag = j.html, srcBefore = srcEl.outerHTML, liveBefore = liveEl.outerHTML;
      clearHi();
      const newSrc = replaceEl(srcEl, frag); let newLive = null; try { newLive = replaceEl(liveEl, frag); } catch (e) {}
      lastEdit = { newSrc, srcBefore, newLive, liveBefore }; dirty = true; targetEl = null; selText = "";
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

  // Ctrl+S / ⌘+S でブラウザ標準の保存ダイアログを抑止して 💾保存 を実行
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      if (!$("aiep-save").disabled) $("aiep-save").onclick();
    }
  }, true);

  loadModels(); loadSrc(); updHist();
})();
