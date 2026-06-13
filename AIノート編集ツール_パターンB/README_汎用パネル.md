# AI編集 汎用パネル（aiep.js）— ローカル & github.io 両対応

各ノートの `</body>` 直前に **1行**入れるだけで、右端にAI編集パネルが付きます。

```html
<script src="../aiep.js"></script>     <!-- NNN_科目/ 配下のノート（1階層深い） -->
<script src="aiep.js"></script>        <!-- リポジトリ直下の index.html -->
```

`aiep.js` はリポジトリ直下（`まとめ/aiep.js`）に置いてあります。環境を自動判定して動作が切り替わります。

---

## A. ローカル（Mac・file:// で開く）
- **AI呼び**＝`server.py`（127.0.0.1:8780）　**保存**＝実ファイルに書込（.bak付き）
- 手順：
  1. `export GEMINI_API_KEY="AIza..."`
  2. `python3 "AIノート編集ツール_パターンB/server.py"`
  3. ノートを開く → 右端タブ → 接続OK ✅

## B. クラウド（github.io・外出先のスマホ等）
- **AI呼び**＝Cloudflare Worker（合言葉付き）　**保存**＝GitHubにcommit（PAT）
- ノートが公開URL（https://dora-suke.github.io/shindanshi-matome/...）で開ければ、PCでもスマホでも同様に動く。

### B-1. Cloudflare Worker を作る（AI中継・無料）
1. https://dash.cloudflare.com → Workers & Pages → Create → Worker
2. `cf-worker/worker.js` の中身を貼り付けてデプロイ
3. Settings → Variables and Secrets に2つ登録（Encrypt推奨）
   - `GEMINI_API_KEY` = aistudio の無料キー（AIza...）
   - `AIEP_SECRET`    = 自分で決めた合言葉（推測されにくい文字列）
4. 発行URL `https://xxxx.workers.dev` を控える

### B-2. 保存用 GitHub PAT を作る
- GitHub → Settings → Developer settings → Fine-grained tokens
- 対象リポジトリ `shindanshi-matome` に **Contents: Read and write** を付けて発行
- （classic の場合は `repo` スコープ）

### B-3. ノート側で設定（ブラウザに1回入力）
- 公開ページでパネルを開く → **⚙️** → 次を入力して「設定を保存」
  - Worker URL（B-1のURL）
  - 合言葉（B-1の `AIEP_SECRET` と同じ）
  - GitHub PAT（B-2）
- これらは **localStorage に保存**（ページには埋め込まれない）。端末ごとに1回だけ。

---

## 運用の注意
- **公開リポジトリ**：ノート内容は誰でも閲覧可（学習ノート前提）。
- **Workerのタダ乗り防止**：合言葉が一致しないリクエストは拒否。合言葉は漏らさない。
- **保存＝commit**：クラウドで保存するとGitHubが書き換わりPagesに反映（数十秒）。
  **Mac側のローカルは `git pull` するまで古いまま**。編集はどちらか一方を正本にして同期する。
- **大きな変更**は従来どおりターミナルのClaudeで。パネルは語句直し・短い補足向け。
- 無料枠（Gemini）はローカル/クラウド/端末で**共有**。`gemini-2.0-flash` が枠切れ(429)なら `2.5-flash`。

## 他ノートへの展開
各ノートの `</body>` 直前に深さに応じた1行（上記）を入れるだけ。`qz_24.相続まとめ_m_AI編集.html` は導入済みの見本。
