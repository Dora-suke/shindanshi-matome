# 模試HTMLへの評価ボタン追加 — 開発メモ

対象ファイル例: `模試/模試_財務会計_2026_m.html`

---

## 追加した機能の概要

各問題に3段階の復習優先度ラベルを付けられるシステム。

| ラベル | キー | 色 |
|---|---|---|
| 必ず確認 | `must` | 🔴 赤 `#ef4444` |
| 確認 | `check` | 🔵 青 `#3b82f6` |
| できれば | `easy` | 🟢 緑 `#22c55e` |

ラジオ式（選択済みをもう一度押すと解除）。localStorage に保存。

---

## UI 変更箇所（4箇所）

### 1. 問題ヘッダー — 評価ボタン行の追加

`kkBtn` / `doneBtn` の直後に挿入する：

```html
<div style="width:100%;display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px">
  <span style="font-size:10px;color:#94a3b8;min-width:36px">評価：</span>
  <button id="evalMust"  onclick="setEval('must')"  style="border:1px solid #fecaca;border-radius:14px;padding:3px 9px;font-size:10px;cursor:pointer;font-weight:bold;transition:all .2s;background:#fef2f2;color:#94a3b8">必ず確認</button>
  <button id="evalCheck" onclick="setEval('check')" style="border:1px solid #dbeafe;border-radius:14px;padding:3px 9px;font-size:10px;cursor:pointer;font-weight:bold;transition:all .2s;background:#f8fafc;color:#94a3b8">確認</button>
  <button id="evalEasy"  onclick="setEval('easy')"  style="border:1px solid #bbf7d0;border-radius:14px;padding:3px 9px;font-size:10px;cursor:pointer;font-weight:bold;transition:all .2s;background:#f0fdf4;color:#94a3b8">できれば</button>
</div>
```

### 2. ダッシュボード — 評価バッジ行の追加

`dashKk` / `dashDone` の `</div>` 直後（一覧▾ボタンの前）に挿入する：

```html
<div style="display:flex;align-items:center;gap:5px;margin-bottom:10px;flex-wrap:wrap">
  <div id="dashMust"   style="background:#fef2f2;border:1px solid #fecaca;border-radius:20px;padding:3px 9px;font-size:10px;color:#dc2626;font-weight:bold">🔴 必ず確認 0/N</div>
  <div id="dashCheck2" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:3px 9px;font-size:10px;color:#2563eb;font-weight:bold">🔵 確認 0/N</div>
  <div id="dashEasy"   style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:3px 9px;font-size:10px;color:#15803d;font-weight:bold">🟢 できれば 0/N</div>
  <button onclick="document.getElementById('dashGrid').classList.toggle('dash-open')" style="background:none;border:1px solid #cbd5e1;border-radius:6px;padding:3px 9px;font-size:11px;color:#64748b;cursor:pointer;margin-left:auto">一覧 ▾</button>
</div>
```

※ 一覧▾ボタンをここに統合するため、元の単独 `<button>` タグを削除する。

### 3. 一覧グリッドのセル — 評価カラーの下ボーダー

`refreshDashboard()` の `cell.style.cssText` 設定部分を以下に変更：

```js
const EVAL_BORDER = { must:'#ef4444', check:'#3b82f6', easy:'#22c55e' };
const evalBorder = st.eval ? '3px solid ' + EVAL_BORDER[st.eval] : '3px solid transparent';
cell.style.cssText = 'background:' + color + ';color:' + textColor
  + ';border-radius:6px;padding:4px 2px;text-align:center;font-size:11px;font-weight:bold;cursor:pointer;transition:all .2s;border-bottom:' + evalBorder;
```

### 4. 問題番号ドット — 3個目に評価色を追加

`updateBtnDots()` の末尾（`dots.appendChild(d2)` の後）に追加：

```js
const EVAL_COLORS = { must:'#ef4444', check:'#3b82f6', easy:'#22c55e' };
const d3 = document.createElement('div');
d3.style.cssText = 'width:5px;height:5px;border-radius:50%;background:' + (st.eval ? EVAL_COLORS[st.eval] : '#e2e8f0');
dots.appendChild(d3);
```

---

## JS 追加関数

### `setEval(level)` — 評価を保存（ラジオ式）

```js
function setEval(level) {
  const q = filteredQs[currentIdx];
  if (!q) return;
  const st = getStatus(q.num);
  st.eval = (st.eval === level) ? null : level;
  saveStatus(q.num, st);
  updateStatusUI(q.num);
  updateBtnDots(q.num);
  refreshDashboard();
}
```

### `updateStatusUI()` への追記 — ボタン色の更新

`if / else` ブロック（done判定）の末尾に追加：

```js
const BASE_EVAL = 'border-radius:14px;padding:3px 9px;font-size:10px;cursor:pointer;font-weight:bold;transition:all .2s;';
const EVAL_CFG = {
  must:  { id:'evalMust',  on:'background:#ef4444;color:#fff;border:none', off:'background:#fef2f2;color:#94a3b8;border:1px solid #fecaca' },
  check: { id:'evalCheck', on:'background:#3b82f6;color:#fff;border:none', off:'background:#f8fafc;color:#94a3b8;border:1px solid #dbeafe' },
  easy:  { id:'evalEasy',  on:'background:#22c55e;color:#fff;border:none', off:'background:#f0fdf4;color:#94a3b8;border:1px solid #bbf7d0' }
};
Object.entries(EVAL_CFG).forEach(([level, cfg]) => {
  const btn = document.getElementById(cfg.id);
  if (btn) btn.style.cssText = BASE_EVAL + (st.eval === level ? cfg.on : cfg.off);
});
```

### `refreshDashboard()` への追記 — カウント集計

```js
// カウント変数の初期化に追加
let mustCount = 0, chkCount = 0, easyCount = 0;

// forEach 内の集計に追加
if (inScope && st.eval === 'must') mustCount++;
if (inScope && st.eval === 'check') chkCount++;
if (inScope && st.eval === 'easy')  easyCount++;

// 表示更新に追加
if (el('dashMust'))   el('dashMust').textContent   = '🔴 必ず確認 ' + mustCount + '/' + total;
if (el('dashCheck2')) el('dashCheck2').textContent = '🔵 確認 ' + chkCount + '/' + total;
if (el('dashEasy'))   el('dashEasy').textContent   = '🟢 できれば ' + easyCount + '/' + total;
```

---

## 他科目への適用チェックリスト

- [ ] HTML: 評価ボタン行を `doneBtn` 直後に追加（#1）
- [ ] HTML: 評価バッジ行を `dashKk/dashDone div` 直後に追加（#2）、一覧▾ボタンの独立タグを削除
- [ ] JS: `setEval()` 関数を追加
- [ ] JS: `updateStatusUI()` に eval ボタン色更新を追記
- [ ] JS: `updateBtnDots()` に d3 ドットを追記
- [ ] JS: `refreshDashboard()` にカウント変数・集計・表示更新を追記
- [ ] JS: `refreshDashboard()` の `cell.style.cssText` に `border-bottom` を追記

---

## データ構造（localStorage）

`getStatus()` / `saveStatus()` が返す `st` オブジェクトに `.eval` フィールドを追加：

```js
// st.eval の値
null          // 未設定
'must'        // 必ず確認
'check'       // 確認
'easy'        // できれば
```

既存の `st.kk` / `st.done` に追記する形なので後方互換性あり（未設定は null 扱い）。
