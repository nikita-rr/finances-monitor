#!/bin/bash

# Быстрый запуск production версии с SSL

echo "🚀 Запуск TG Finance Monitor в production режиме"
echo ""

# Проверка .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл с параметрами:"
    echo ""
    echo "DOMAIN=yourdomain.com"
    echo "EMAIL=your@email.com"
    echo "BOT_TOKEN=your_bot_token"
    echo ""
    exit 1
fi

# Загрузка переменных
source .env

# Проверка обязательных переменных
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$BOT_TOKEN" ]; then
    echo "❌ Не все переменные установлены в .env"
    echo "Требуются: DOMAIN, EMAIL, BOT_TOKEN"
    exit 1
fi

# Проверка data.json
if [ ! -f data.json ]; then
    echo "📝 Создаю data.json..."
    echo '{}' > data.json
fi

echo "✅ Конфигурация проверена"
echo "📦 Домен: $DOMAIN"
echo ""

# Проверка существующих сертификатов
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "✅ SSL сертификаты найдены"
    echo "🔄 Запускаю приложение..."
    
    # Создаём nginx config
    export DOMAIN=$DOMAIN
    envsubst '${DOMAIN}' < nginx/app.conf.template > nginx/app.conf
    
    # Запускаем
    docker compose -f docker-compose.prod.yml up -d --build
    
    echo ""
    echo "✅ Приложение запущено!"
    echo "🌐 Доступно по адресу: https://$DOMAIN"
    
else
    echo "⚠️  SSL сертификаты не найдены"
    echo "🔧 Запускаю автоматическую настройку SSL..."
    echo ""
    
    # Запускаем скрипт инициализации
    DOMAIN=$DOMAIN EMAIL=$EMAIL ./init-letsencrypt.sh
fi

echo ""
echo "📊 Просмотр логов:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 Остановка:"
echo "  docker compose -f docker-compose.prod.yml down"
