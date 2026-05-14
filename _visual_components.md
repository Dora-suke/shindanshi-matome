# 視覚要素コンポーネント集（/note・/qz・/qnote 共通リファレンス）

学習Webノートの主要4タブ（**ゼロから／入門／基本／詳細**）で「テキスト羅列」を防ぎ、暗記効率を上げるための視覚要素ライブラリ。

## 必須ルール

主要4タブ（ゼロから／入門／基本／詳細）の各タブには次の2つを**最低限**配置する：

1. **🃏 フラッシュカードを1セット（4枚以上）必須**：タブ末尾の `keepit` 直前に配置。クリックで Q→A 反転。
2. **その他の視覚要素を1種以上**：tree／icon-deck／formula-vis／gap-chart／factor-grid／dist-vis のいずれか。タブの主題に合うものを選ぶ。

既存タブを更新する場合は、本文の文章は削らず**追記**で視覚要素を加える（CLAUDE.md「既存文章は書き換えず、追記で改善する」に準拠）。

## 使い分け早見表

| パターン | 主題 | 配置目安 |
|---|---|---|
| **icon-deck**（絵文字カード3〜4枚並列） | 主要概念のヒーロー紹介 | タブ冒頭 |
| **tree**（根→枝→葉） | 親概念から子概念への分岐／分類 | 中盤 |
| **formula-vis**（箱と演算子＋構成チップ） | 公式・計算式の構造分解 | 該当論点直下 |
| **gap-chart**（対比バー2列） | A vs B の量的差異（大企業 vs 中小 等） | 比較論点 |
| **factor-grid**（番号付き要因カード） | 「3大要因」など並列項目 | 列挙論点 |
| **dist-vis**（SVG折れ線・分布概念図） | 推移／分布のイメージ | 時系列・分布論点 |
| **flash-deck**（フラッシュカード4枚） | タブの要点反芻 | 末尾（keepit直前）必須 |

---

## 共通CSS（タブのテーマ色に合わせて色値は微調整可）

```css
/* === 視覚強化用：アイコンカード／ツリー／フラッシュカード／メーター === */
.icon-deck{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0}
.icon-card{background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:16px 14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08);transition:transform .2s}
.icon-card:hover{transform:translateY(-3px)}
.icon-card .ic-emoji{font-size:2.4rem;display:block;margin-bottom:6px;line-height:1.1}
.icon-card .ic-title{font-weight:800;font-size:1rem;color:#7c3aed;margin-bottom:4px}
.icon-card .ic-sub{font-size:.82rem;color:#64748b;line-height:1.55}
.icon-card.bd-orange{border-color:#fb923c;background:linear-gradient(180deg,#fff,#fff7ed)}
.icon-card.bd-blue{border-color:#818cf8;background:linear-gradient(180deg,#fff,#eef0ff)}
.icon-card.bd-green{border-color:#34d399;background:linear-gradient(180deg,#fff,#ecfdf5)}
.icon-card.bd-pink{border-color:#f472b6;background:linear-gradient(180deg,#fff,#fdf2f8)}
.icon-card.bd-purple{border-color:#c084fc;background:linear-gradient(180deg,#fff,#faf5ff)}
.icon-card.bd-yellow{border-color:#fbbf24;background:linear-gradient(180deg,#fff,#fffbeb)}

/* ツリー図 */
.tree{margin:18px 0;font-size:.92rem}
.tree .tr-root{background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border-radius:12px;padding:10px 18px;text-align:center;font-weight:800;box-shadow:0 3px 10px rgba(124,58,237,.3);max-width:380px;margin:0 auto 6px}
.tree .tr-trunk{height:18px;width:3px;background:#a78bfa;margin:0 auto}
.tree .tr-branches{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:6px}
.tree .tr-node{background:#fff;border:2px solid #c4b5fd;border-radius:10px;padding:10px 12px;text-align:center;font-size:.88rem;line-height:1.55}
.tree .tr-node b{display:block;font-size:.95rem;color:#6d28d9;margin-bottom:3px}
.tree .tr-node .tr-leaf{font-size:.78rem;color:#64748b;margin-top:4px;padding-top:4px;border-top:1px dashed #ddd6fe}
.tree.t-blue .tr-root{background:linear-gradient(135deg,#1e40af,#818cf8)}
.tree.t-blue .tr-node{border-color:#818cf8}.tree.t-blue .tr-node b{color:#1e40af}
.tree.t-orange .tr-root{background:linear-gradient(135deg,#ea580c,#fb923c)}
.tree.t-orange .tr-node{border-color:#fb923c}.tree.t-orange .tr-node b{color:#9a3412}

/* フラッシュカード（クリックで裏返し・内容に合わせて自動拡張） */
.flash-deck{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:14px 0;align-items:stretch}
.flash-card{position:relative;min-height:170px;perspective:1000px;cursor:pointer;display:flex}
.flash-card .flash-inner{display:grid;flex:1;transition:transform .55s;transform-style:preserve-3d;min-height:inherit}
.flash-card.flip .flash-inner{transform:rotateY(180deg)}
.flash-card .flash-face{grid-area:1/1;backface-visibility:hidden;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 16px 26px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08);font-weight:700;line-height:1.55;word-break:break-word;overflow-wrap:anywhere;hyphens:auto}
.flash-card .flash-front{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#78350f;border:2px solid #f59e0b}
.flash-card .flash-back{background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;transform:rotateY(180deg);font-size:.92rem;line-height:1.6}
.flash-card .flash-back b{display:inline-block;margin-bottom:4px}
.flash-card .flash-front .fc-q{font-size:.95rem;color:#92400e;line-height:1.6}
.flash-card::after{content:"\1F504 \30AF\30EA\30C3\30AF\3067\7B54\3048";position:absolute;bottom:6px;right:10px;font-size:.7rem;color:#a16207;opacity:.7;pointer-events:none}
.flash-card.flip::after{content:""}
@media(max-width:600px){.flash-card{min-height:160px}.flash-card .flash-face{padding:14px 12px 24px}.flash-card .flash-back{font-size:.88rem}}

/* 公式ビジュアライザ */
.formula-vis{background:linear-gradient(135deg,#faf5ff,#fdf2f8);border:2px dashed #c084fc;border-radius:14px;padding:18px;margin:14px 0}
.formula-vis .fv-eq{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;font-size:1.05rem;font-weight:800}
.formula-vis .fv-box{background:#fff;border:2px solid #a78bfa;border-radius:10px;padding:8px 14px;color:#6d28d9;box-shadow:0 2px 6px rgba(167,139,250,.25)}
.formula-vis .fv-box.fv-result{background:linear-gradient(135deg,#fde68a,#fbbf24);border-color:#f59e0b;color:#78350f}
.formula-vis .fv-op{font-size:1.4rem;color:#7c3aed;font-weight:800}
.formula-vis .fv-decompose{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px}
.formula-vis .fv-chip{background:#fff;border:1.5px solid #c4b5fd;border-radius:999px;padding:6px 10px;text-align:center;font-size:.82rem;color:#6d28d9;font-weight:700}
.formula-vis .fv-chip.fv-plus::before{content:"+ ";color:#a78bfa;font-size:1rem}

/* 対比バー（A vs B） */
.gap-chart{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:14px 0;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.gap-chart .gc-title{font-weight:800;color:#1e293b;margin-bottom:10px;font-size:.95rem;text-align:center}
.gap-chart .gc-row{display:grid;grid-template-columns:90px 1fr 1fr;gap:8px;align-items:center;margin:8px 0;font-size:.85rem}
.gap-chart .gc-label{font-weight:700;color:#475569;text-align:right;padding-right:6px}
.gap-chart .gc-side{position:relative;height:26px;background:#f8fafc;border-radius:6px;overflow:hidden}
.gap-chart .gc-fill{position:absolute;top:0;bottom:0;display:flex;align-items:center;padding:0 8px;color:#fff;font-weight:800;font-size:.78rem;white-space:nowrap;left:0}
.gap-chart .gc-fill.gc-big{background:linear-gradient(90deg,#1e40af,#3b82f6)}
.gap-chart .gc-fill.gc-small{background:linear-gradient(90deg,#ec4899,#f472b6)}
.gap-chart .gc-legend{display:flex;justify-content:center;gap:18px;font-size:.78rem;margin-top:8px;color:#475569}
.gap-chart .gc-legend i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:4px;vertical-align:middle}

/* 分布／推移SVG用コンテナ */
.dist-vis{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:14px 0;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}
.dist-vis svg{max-width:100%;height:auto}
.dist-vis .dv-cap{font-size:.82rem;color:#64748b;margin-top:6px;line-height:1.6}

/* 番号付き要因カード */
.factor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:14px 0}
.factor-grid .fg-item{background:#fff;border-radius:12px;padding:14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08);border-top:5px solid;position:relative}
.factor-grid .fg-item:nth-child(1){border-color:#ef4444}
.factor-grid .fg-item:nth-child(2){border-color:#f59e0b}
.factor-grid .fg-item:nth-child(3){border-color:#8b5cf6}
.factor-grid .fg-item:nth-child(4){border-color:#10b981}
.factor-grid .fg-num{display:inline-block;width:28px;height:28px;background:#1f2937;color:#fff;border-radius:50%;font-weight:800;line-height:28px;margin-bottom:6px}
.factor-grid .fg-title{font-weight:800;font-size:.95rem;color:#1f2937;margin-bottom:6px}
.factor-grid .fg-body{font-size:.82rem;color:#64748b;line-height:1.65}
```

## 共通JS（フラッシュカード反転）

`</script>` 直前に追加（既存ロジックは変更しない）：

```js
document.addEventListener('click',function(e){
  var fc=e.target.closest('.flash-card');
  if(fc){fc.classList.toggle('flip');}
});
```

---

## HTMLテンプレート

### 1. icon-deck（タブ冒頭で主要概念を一目で）

```html
<div class="icon-deck">
  <div class="icon-card bd-blue">
    <span class="ic-emoji">😊😭</span>
    <div class="ic-title">指標A</div>
    <div class="ic-sub">日常語の説明<br><small>補足</small></div>
  </div>
  <div class="icon-card bd-pink">
    <span class="ic-emoji">💰</span>
    <div class="ic-title">指標B</div>
    <div class="ic-sub">日常語の説明</div>
  </div>
  <div class="icon-card bd-green">
    <span class="ic-emoji">🏭</span>
    <div class="ic-title">指標C</div>
    <div class="ic-sub">日常語の説明</div>
  </div>
</div>
```

### 2. tree（親概念→子概念の分岐）

```html
<div class="tree">
  <div class="tr-root">📊 親トピック</div>
  <div class="tr-trunk"></div>
  <div class="tr-branches">
    <div class="tr-node"><b>枝1</b>名前<div class="tr-leaf">補足説明</div></div>
    <div class="tr-node"><b>枝2</b>名前<div class="tr-leaf">補足説明</div></div>
    <div class="tr-node"><b>枝3</b>名前<div class="tr-leaf">補足説明</div></div>
  </div>
</div>
```

色違い：`<div class="tree t-blue">` または `<div class="tree t-orange">`。

### 3. flash-deck（タブ末尾に必須・4枚以上）

```html
<h3 style="margin-top:8px">🃏 フラッシュカードで反芻（クリックで答え）</h3>
<div class="flash-deck">
  <div class="flash-card"><div class="flash-inner">
    <div class="flash-face flash-front"><div class="fc-q">Q. ○○とは？</div></div>
    <div class="flash-face flash-back">A. <b>答え</b><br>補足</div>
  </div></div>
  <div class="flash-card"><div class="flash-inner">
    <div class="flash-face flash-front"><div class="fc-q">Q. ××の式は？</div></div>
    <div class="flash-face flash-back">A. <b>分子 ÷ 分母</b></div>
  </div></div>
  <!-- 4枚以上推奨 -->
</div>
```

**配置位置**：タブ末尾の `keepit`（⭐今日のこれだけ）直前。
**問いの作り方**：定義／計算式／対比／引っかけ など、そのタブの試験頻出ポイントを問いにする。

**文字量の目安（はみ出し防止）**：
- Q（表面）：**40文字以内**。**ヒント・補足・答えの一部を表面に出さない**（`fc-hint` は使わない）。表面はあくまで「問い」だけにする。
- A（裏面）：**60文字以内**を目安、超える場合は `<br>` で2〜3行に区切る。
- カードは min-height のみ指定で内容に合わせて伸びる設計（grid 重ね合わせ）。長文を入れる場合も**全枚数のうち長文は1〜2枚まで**にして、デッキ内で高さが極端にばらつかないようにする。
- 表 / リスト / 複数の `<br>` を3つ以上重ねるのはNG。長くなるなら2枚に分割する。

### 4. formula-vis（公式の構造分解）

```html
<div class="formula-vis">
  <div class="fv-eq">
    <span class="fv-box">分子</span>
    <span class="fv-op">÷</span>
    <span class="fv-box">分母</span>
    <span class="fv-op">＝</span>
    <span class="fv-box fv-result">🎯 結果指標</span>
  </div>
  <div style="text-align:center;margin:14px 0 6px;font-weight:700;color:#7c3aed;">分子の構成（n要素）</div>
  <div class="fv-decompose">
    <div class="fv-chip">要素1</div>
    <div class="fv-chip fv-plus">要素2</div>
    <div class="fv-chip fv-plus">要素3</div>
  </div>
</div>
```

### 5. gap-chart（A vs B の量的対比）

```html
<div class="gap-chart">
  <div class="gc-title">📊 A vs B（イメージ）</div>
  <div class="gc-row">
    <div class="gc-label">指標1</div>
    <div class="gc-side"><div class="gc-fill gc-big" style="width:85%">A：85</div></div>
    <div class="gc-side"><div class="gc-fill gc-small" style="width:55%">B：55</div></div>
  </div>
  <div class="gc-row">
    <div class="gc-label">指標2</div>
    <div class="gc-side"><div class="gc-fill gc-big" style="width:90%">A：90</div></div>
    <div class="gc-side"><div class="gc-fill gc-small" style="width:60%">B：60</div></div>
  </div>
  <div class="gc-legend"><span><i style="background:#3b82f6"></i>A</span><span><i style="background:#f472b6"></i>B</span></div>
</div>
```

### 6. factor-grid（番号付き要因カード）

```html
<div class="factor-grid">
  <div class="fg-item">
    <span class="fg-num">1</span>
    <div class="fg-title">要因A</div>
    <div class="fg-body">説明1〜2行</div>
  </div>
  <div class="fg-item">
    <span class="fg-num">2</span>
    <div class="fg-title">要因B</div>
    <div class="fg-body">説明1〜2行</div>
  </div>
  <div class="fg-item">
    <span class="fg-num">3</span>
    <div class="fg-title">要因C</div>
    <div class="fg-body">説明1〜2行</div>
  </div>
</div>
```

### 7. dist-vis（SVG折れ線・分布概念）

時系列推移や累積分布の概念図。viewBox を 540×240 程度で設計し、`<polyline>`／`<path>`／`<circle>` を組み合わせる。
- 折れ線：`<polyline points="x1,y1 x2,y2 …" fill="none" stroke="#色" stroke-width="3"/>`
- ピーク強調：`<circle>` を二重描画＋テキストラベル
- 説明：`<div class="dv-cap">` で1〜2行の解説を添える

```html
<div class="dist-vis">
  <svg viewBox="0 0 540 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="○○の推移">
    <line x1="40" y1="100" x2="520" y2="100" stroke="#cbd5e0" stroke-dasharray="4 4"/>
    <polyline points="50,90 150,180 240,140 330,80 420,40 500,75" fill="none" stroke="#7c3aed" stroke-width="3"/>
    <circle cx="420" cy="40" r="8" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
    <text x="420" y="28" text-anchor="middle" font-size="11" fill="#92400e" font-weight="700">★ピーク</text>
  </svg>
  <div class="dv-cap">補足キャプション（試験での問われ方など）</div>
</div>
```

---

## 配置パターン例（タブごとの推奨組合せ）

| タブ | 推奨組合せ |
|---|---|
| **ゼロから** | icon-deck（冒頭）→ tree（中盤）→ 既存解説 → flash-deck（末尾） |
| **入門** | dist-vis（推移グラフ）or formula-vis（公式分解）→ 既存解説 → flash-deck |
| **基本** | formula-vis（具体例つき計算）or tree（分類）→ 既存解説 → flash-deck |
| **詳細** | gap-chart（対比）or factor-grid（要因列挙）or dist-vis（分布）→ 既存解説 → flash-deck |

各タブで**最低2種**（フラッシュカード＋他の1種）を満たすこと。3種以上載せても可（情報過多にならない範囲で）。

## やらないこと

- ❌ 既存の本文テキスト・表・図を削除する
- ❌ 視覚要素だけのタブにする（解説テキストを残した上での「補強」）
- ❌ 1タブに同種の視覚要素を3つ以上連続配置（読みづらくなる）
- ❌ flash-deck をタブ冒頭に置く（必ず末尾の keepit 直前）
- ❌ フラッシュカードに `height` を固定値で指定する（`min-height` のみ。内容で自動拡張させる）
- ❌ Q/A に長すぎる文章・リスト・表を詰め込む（はみ出し原因。文字量目安を超えたら2枚に分割）
- ❌ 表面に「ヒント」「答えの一部」「キーワード列挙」を載せる（答えがバレる／`fc-hint` は廃止。表面は問いのみ）
