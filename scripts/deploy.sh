#!/bin/bash
# Запускать локально для деплоя обновлений на сервер
# Использование: ./scripts/deploy.sh
set -e

SERVER="root@93.183.83.238"
REMOTE_DIR="/opt/checkmate"

echo "=== Пуш на GitHub ==="
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" || echo "Нечего коммитить"
git push origin master

echo "=== Деплой на сервер ==="
ssh "$SERVER" "
  cd $REMOTE_DIR
  git pull origin master
  docker compose up -d --build
  docker compose ps
"

echo "=== Готово! Сайт: http://93.183.83.238 ==="
