# Production Deploy с SSL (Let's Encrypt)

## Требования
- Docker и Docker Compose на сервере
- Доменное имя, указывающее на IP сервера
- Открытые порты 80 и 443

## Подготовка

### 1. Настройте DNS
Убедитесь, что A-запись вашего домена указывает на IP сервера:
```
yourdomain.com -> 123.45.67.89
```

Проверка:
```bash
dig +short yourdomain.com
# Должен вернуть IP вашего сервера
```

### 2. Клонируйте репозиторий на сервер
```bash
git clone <your-repo-url> /opt/tg-finance-monitor
cd /opt/tg-finance-monitor
```

### 3. Создайте .env файл
```bash
cat > .env << EOF
BOT_TOKEN=your_telegram_bot_token_here
DOMAIN=yourdomain.com
EMAIL=your@email.com
EOF
```

### 4. Создайте data.json
```bash
echo '{}' > data.json
```

## Запуск с SSL

### Автоматическая настройка (Рекомендуется)

Скрипт автоматически:
- Создаст временный сертификат
- Запустит nginx
- Получит настоящий SSL сертификат от Let's Encrypt
- Настроит автообновление

```bash
# Загрузите переменные из .env
source .env

# Запустите скрипт инициализации
DOMAIN=$DOMAIN EMAIL=$EMAIL ./init-letsencrypt.sh
```

### Ручная настройка

Если нужен больший контроль:

```bash
# 1. Создайте директории
mkdir -p certbot/conf certbot/www

# 2. Скачайте TLS параметры
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem

# 3. Создайте nginx конфиг
export DOMAIN=yourdomain.com
envsubst '${DOMAIN}' < nginx/app.conf.template > nginx/app.conf

# 4. Запустите сервисы
docker compose -f docker-compose.prod.yml up -d

# 5. Получите сертификат
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com

# 6. Перезагрузите nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Проверка

### Убедитесь, что все работает:

```bash
# Проверка статуса контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверка логов
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs web
docker compose -f docker-compose.prod.yml logs bot

# Проверка SSL сертификата
curl -I https://yourdomain.com

# Проверка рейтинга SSL
# Откройте в браузере: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

### Тест Mini App в Telegram:

1. Откройте @BotFather
2. /mybots → ваш бот → Bot Settings → Menu Button
3. Configure menu button
4. Введите URL: `https://yourdomain.com`
5. Введите текст: "💰 Открыть приложение"
6. Откройте бота и нажмите на кнопку Menu

## Обновление сертификата

Certbot автоматически обновляет сертификат каждые 12 часов.  
Nginx перезагружается каждые 6 часов для применения новых сертификатов.

### Ручное обновление:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Обновление приложения

```bash
# 1. Остановите контейнеры
docker compose -f docker-compose.prod.yml down

# 2. Обновите код
git pull

# 3. Пересоберите образы
docker compose -f docker-compose.prod.yml build --no-cache

# 4. Запустите снова
docker compose -f docker-compose.prod.yml up -d
```

## Мониторинг

### Просмотр логов в реальном времени:
```bash
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f bot
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Перезапуск сервисов:
```bash
# Перезапустить все
docker compose -f docker-compose.prod.yml restart

# Перезапустить конкретный сервис
docker compose -f docker-compose.prod.yml restart web
docker compose -f docker-compose.prod.yml restart nginx
```

## Бэкап данных

```bash
# Бэкап data.json
cp data.json data.json.backup.$(date +%Y%m%d_%H%M%S)

# Бэкап сертификатов
tar -czf certbot-backup-$(date +%Y%m%d).tar.gz certbot/
```

## Troubleshooting

### Сертификат не получается

1. Проверьте, что домен правильно указывает на сервер:
```bash
dig +short yourdomain.com
```

2. Проверьте, что порты 80 и 443 открыты:
```bash
sudo ufw status
# или
sudo iptables -L -n | grep -E '(80|443)'
```

3. Проверьте логи certbot:
```bash
docker compose -f docker-compose.prod.yml logs certbot
```

### 502 Bad Gateway

Проверьте, что web контейнер запущен:
```bash
docker compose -f docker-compose.prod.yml ps web
docker compose -f docker-compose.prod.yml logs web
```

### Mini App не открывается

1. Проверьте CORS в логах nginx
2. Убедитесь, что используете HTTPS URL в BotFather
3. Проверьте, что Telegram WebApp SDK загружается

## Firewall

Если используете UFW:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

Если используете iptables:
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

## Systemd Service (опционально)

Для автозапуска при перезагрузке сервера:

```bash
sudo tee /etc/systemd/system/tg-finance.service << EOF
[Unit]
Description=TG Finance Monitor
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/tg-finance-monitor
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable tg-finance
sudo systemctl start tg-finance
```

## Безопасность

### Рекомендации:

1. **Обновляйте Docker образы:**
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

2. **Используйте .env для секретов** (не коммитьте в git)

3. **Ограничьте доступ к data.json:**
```bash
chmod 600 data.json
```

4. **Настройте fail2ban** для защиты от брутфорса

5. **Регулярно делайте бэкапы data.json**

## Производительность

Для большого количества пользователей:
- Используйте PostgreSQL вместо data.json
- Добавьте Redis для кэширования
- Настройте nginx rate limiting
