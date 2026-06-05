#!/bin/bash
# 確認システム起動：サーバが落ちていれば起動し、ブラウザで開始メニューを開く
cd "$(dirname "$0")" || { echo "❌ フォルダに移動できませんでした"; exit 1; }
PORT=8765

# python3 を確実に見つける（Finderから起動するとPATHが最小になり見失うことがある対策）
PY="$(command -v python3 2>/dev/null)"
[ -z "$PY" ] && [ -x /opt/homebrew/bin/python3 ] && PY=/opt/homebrew/bin/python3
[ -z "$PY" ] && [ -x /usr/local/bin/python3 ]  && PY=/usr/local/bin/python3
[ -z "$PY" ] && [ -x /usr/bin/python3 ]        && PY=/usr/bin/python3
if [ -z "$PY" ]; then
  echo "❌ python3 が見つかりません。ターミナルで  xcode-select --install  を実行してください。"
  exit 1
fi

# サーバ稼働チェック（落ちていれば起動）
if curl -s -o /dev/null "http://localhost:$PORT/"; then
  echo "✅ サーバは既に起動中です。"
else
  echo "▶ サーバを起動します … ($PY)"
  nohup "$PY" server.py >/tmp/確認システム_server.log 2>&1 &
  disown 2>/dev/null
  # 起動を最大5秒待つ
  for i in $(seq 1 10); do
    sleep 0.5
    curl -s -o /dev/null "http://localhost:$PORT/" && break
  done
  if curl -s -o /dev/null "http://localhost:$PORT/"; then
    echo "✅ 起動しました。"
  else
    echo "❌ サーバ起動に失敗しました。ログ↓"
    echo "------------------------------------"
    tail -n 20 /tmp/確認システム_server.log
    echo "------------------------------------"
    echo "（このウィンドウは閉じずに上のエラーを確認してください）"
    exit 1
  fi
fi

open "http://localhost:$PORT/"
echo "🌐 ブラウザで開始メニューを開きました。このウィンドウは閉じてOKです。"
