#!/bin/bash
# Запускать один раз на чистом сервере (Ubuntu 22.04)
set -e

echo "=== Установка Docker ==="
apt-get update -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "=== Установка Nginx ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Клонирование репозитория ==="
mkdir -p /opt/checkmate
cd /opt/checkmate
git clone https://github.com/KoUD2/checkmate-front.git .

echo ""
echo "=== Готово! Следующий шаг: ==="
echo "Создайте файл /opt/checkmate/.env (см. .env.example)"
echo "Затем запустите: cd /opt/checkmate && docker compose up -d --build"
