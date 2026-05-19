# qz_16 表示不具合 検証メモ（2026-05-18）

## 症状
qz_16.暗号・認証まとめ.html を開くと「ゼロから」タブ以外のタブをクリックしても中身が表示されない。
タブボタン下線は移動するが、コンテンツ領域が完全に空白。

## 真の原因
**tab0 の `</div>` が1個足りず、tab1〜tab14 が全て tab0 の中に入れ子になっていた**。

```html
<div class="tab-panel active" id="tab0">
  ...コンテンツ...
  </div>
  </div>
</div>          ← ここで閉じているのは tab0 内の最後のセクションで、tab0 自体は未閉じ
<div class="tab-panel" id="tab1">   ← tab0 の DOM 子として認識される
  ...
```

`switchTab(1)` で tab1 に `.active` が付き `display:block` になっても、**親の tab0 が `display:none` なので子孫である tab1 も不可視**。`offsetHeight=0` になる。

## 修正
tab0 末尾（line 317 付近）に `</div>` を1個追加するだけ。1行の修正で完治。

## なぜ特定に時間がかかったか（反省）

### 1. CSS問題と決め打ちした
- 「display:block なのに高さ0」を見て**CSS でどこかが潰している**と思い込んだ
- `!important` を盛りまくる方向に流れ、根本原因（HTML構造）に到達するのが遅れた
- `min-height:100px !important` を入れても効かなかった時点で「CSS は無関係」と気づくべきだった

### 2. DOM の親子関係を確認しなかった
- `document.getElementById('tab1').parentElement` を1回確認すれば、親が `tab-container` ではなく `tab0` だと即判明した
- offsetHeight=0 の本質は「親が display:none」だが、その確認を怠った

### 3. 関連ありそうなコードを次々疑った
- sec-hide IIFE を疑う → 削除 → ダメ
- learning-system.js を疑う → 切離 → ダメ
- 全機能を剥がしてシンプル化 → ダメ
- CSS オーバーライド全力投下 → ダメ
- ヘッドレスChrome で実検証 → 「コンテンツは DOM にあるが高さ0」を再確認
- ↑ここでようやく**親子関係を Python スクリプトで検証**して原因特定

### 4. HTML 構造の検証ツールを最初に使うべきだった
- `python3` で `<div>/</div>` のスタック深度を追跡すれば、不一致は5秒で見つかる
- HTML の `</div>` 不整合は表示崩れの常套句なのに、最初に疑う癖がなかった

## 今後のチェックリスト（同種バグの早期発見）

タブ切替系で「特定のタブだけ表示されない／全部が空白」になったら、**CSS を疑う前に必ず以下を実行**：

### Console 1行診断
```js
// 各タブの親要素を確認（全部が tab-container ならOK、tab0 等が親なら入れ子バグ）
[...document.querySelectorAll('.tab-panel')].map(t => t.id + '→' + (t.parentElement.id||t.parentElement.className))
```

### Python（CLI）で `<div>` 整合性チェック
```python
import re
with open('file.html') as f: src = f.read()
stack = []
for m in re.finditer(r'<div[^>]*>|</div>', src):
    if m.group() == '</div>':
        if stack: stack.pop()
    else:
        stack.append(m)
# 各タブ前のスタック深度をチェック
for n in range(15):
    pos = re.search(f'id="tab{n}"', src).start()
    depth = sum(1 for m in re.finditer(r'<div[^>]*>|</div>', src[:pos])
                if m.group() != '</div>') - \
            sum(1 for m in re.finditer(r'</div>', src[:pos]))
    print(f'tab{n}: depth={depth}')  # 全タブで同じ値ならOK、ズレてたら入れ子バグ
```

### ヘッドレスChromeで早期視覚確認
file:// 直接開きで再現する場合：
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --window-size=1200,2000 --virtual-time-budget=5000 \
  --screenshot=/tmp/check.png "file:///path/to/file.html"
```

タブを切り替えたい場合は sed でデフォルトの active を書き換えてからレンダリング。

## 教訓（メモリに残すべきポイント）

1. **タブ切替系で「中身だけ空白」** → 最初に **HTML の div 整合性** を疑う
2. **offsetHeight=0 で display:block** → **親要素が display:none** の可能性を最初に確認
3. **CSS で `!important` を盛っても効かない** → CSS の問題ではない（HTMLか JS）
4. **疑いの順序**：HTML構造 → DOM親子関係 → JS副作用 → CSS、の順で確認する
