# アカウント・ID管理表（診断士まとめ編）

中小企業診断士まとめサイトに関するアカウント・ID一覧。

> **原典**: `~/Documents/private/account-management/アカウント・ID統合管理表.md`
> 本ファイルは診断士まとめプロジェクトに関する部分のみを抜き出したビュー。
> 全プロジェクト横断の情報・他プロジェクトとの関係は原典を参照すること。
> 認識ズレがあれば原典が正。新規登録・変更時は原典を先に更新する。

最終更新: 2026-05-02

## 基本方針

- 本プロジェクトのGitHub・コミットは **greenriver.sc84@gmail.com**（Dora-sukeアカウント）で運用
- Netlifyは **n.miyaho@gmail.com** で登録（過去経緯）。GitHub Pagesへ移行済のため退役予定
- 対外発信用（astranode01）・個人開発用（minavysia）とは**メアドを分ける**

## サービス登録台帳

| サービス | 登録ID / メール | 状態 | 用途・備考 |
|---|---|---|---|
| GitHub | greenriver.sc84@gmail.com / username: Dora-suke | 登録済 | リポ: shindanshi-matome |
| GitHub Pages | （Dora-suke経由・追加登録不要） | 有効化済（2026-04-30以前） | 本番ホスティング |
| Netlify | n.miyaho@gmail.com / team: my_sample_product | 登録済 | 退役予定（下記参照） |

## 公開URL

| 役割 | URL | 状態 |
|---|---|---|
| **本番（GitHub Pages）** | https://dora-suke.github.io/shindanshi-matome/ | ✅ 公開中 |
| 旧（Netlify） | https://shindannsi-matme.netlify.app | ⏸ Paused（2026-05-02～） |

## デプロイフロー

```
ローカル: /Users/nori3/Desktop/まとめ/
  ↓ git push
GitHub: Dora-suke/shindanshi-matome
  ↓ 自動連携
GitHub Pages → https://dora-suke.github.io/shindanshi-matome/
```

## ローカルGit設定

| 項目 | 値 |
|---|---|
| ローカルパス | `/Users/nori3/Desktop/まとめ/` |
| リモート | https://github.com/Dora-suke/shindanshi-matome.git |
| コミットメアド | greenriver.sc84@gmail.com |

## 保留中タスク

| # | タスク | 期限 |
|---|---|---|
| 1 | Netlify `shindannsi-matme` を完全削除 | 2026-05-16頃（Pause後2週間） |
| 2 | Netlify `yakugakukanriryou-duckanoo-b461bc` の中身確認・要否判断 | 任意 |

## 更新ルール

- 新サービス登録時：**まず原典（統合管理表）を更新** → 本ファイルを更新
- 廃止したサービス：行を削除せず「廃止（YYYY-MM-DD）」と記録
- パスワードはこの表に書かない（パスワードマネージャで管理）
