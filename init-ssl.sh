#!/bin/bash

# Скрипт для первоначальной настройки SSL сертификатов Let's Encrypt
# Использование: ./init-ssl.sh

DOMAIN="renewer-rr.online"
EMAIL="admin@renewer-rr.online"  # Замените на ваш email

# Создаём директории
mkdir -p certbot/conf certbot/www

# Временный nginx конфиг для получения сертификата
cat > nginx/app.conf << 'EOF'
server {
    listen 80;
    server_name renewer-rr.online;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Запускаем nginx
docker compose -f docker-compose.prod.yml up -d nginx

# Ждём запуска nginx
sleep 5

# Получаем сертификат
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Восстанавливаем полный nginx конфиг
cat > nginx/app.conf << 'EOF'
server {
    listen 80;
    server_name renewer-rr.online;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name renewer-rr.online;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/renewer-rr.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/renewer-rr.online/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_cache off;
    }
}
EOF

# Перезапускаем всё
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

echo "✅ SSL сертификат установлен! Приложение доступно на https://$DOMAIN"
