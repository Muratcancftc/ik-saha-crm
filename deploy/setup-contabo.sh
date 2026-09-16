#!/usr/bin/env bash
# Contabo sunucu kurulumu — İK Saha CRM (root olarak çalıştırılır)
# Kullanım:
#   Deploy şu sırayla yapılır:
#     1) Kod sunucuya kopyalanır (deploy.sh içindeki rsync veya elle)
#     2) Bu betik root olarak çalıştırılır
#        bash /opt/ikcrm/deploy/setup-contabo.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ikcrm}"
DOMAIN="${DOMAIN:-atalayik.com.tr}"
DB_NAME="${DB_NAME:-ik_crm}"
DB_USER="${DB_USER:-ikcrm}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
NODE_MAJOR=20

echo "==> 1/8 Sistem paketleri"
apt-get update -y
apt-get install -y curl gnupg2 ca-certificates git build-essential openssl rsync

echo "==> 2/8 Node.js $NODE_MAJOR"
if ! command -v node >/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> 3/8 PostgreSQL"
if ! command -v psql >/dev/null; then
  apt-get install -y postgresql
fi
systemctl enable --now postgresql
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
fi
echo "DB_USER=$DB_USER DB_NAME=$DB_NAME"

echo "==> 4/8 PM2"
npm install -g pm2

echo "==> 5/8 Uygulama bağımlılıkları + build"
cd "$APP_DIR"
if [ ! -d node_modules ]; then
  npm ci
fi
npx prisma generate
npx prisma migrate deploy
if [ "${SEED:-0}" = "1" ]; then
  npm run db:seed
fi
npm run build

echo "==> 6/8 .env (üretim)"
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
WEBSITE_INTEGRATION_SECRET="$(openssl rand -hex 32)"
WEBSITE_INTEGRATION_MODE="production"
WEBSITE_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,https://$DOMAIN"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:info@$DOMAIN"
EOF
  echo "=> .env oluşturuldu. VAPID anahtarlarını doldurun: node -e \"console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))\""
fi

echo "==> 7/8 PM2 (next start :3000)"
pm2 delete ik-crm 2>/dev/null || true
pm2 start npm --name ik-crm -- start
pm2 save
pm2 startup systemd -u root --hp /root | tail -1

echo "==> 8/8 Caddy reverse proxy (HTTPS: $DOMAIN)"
mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
  reverse_proxy 127.0.0.1:3000
  encode gzip
}
EOF
systemctl enable --now caddy
systemctl reload caddy

echo ""
echo "✅ Kurulum tamam."
echo "   Uygulama: https://$DOMAIN"
echo "   PM2: pm2 logs ik-crm"
echo "   DB: $DB_NAME (kullanıcı: $DB_USER)"
echo "   NOT: root şifresini değiştirin ve VAPID anahtarlarını doldurun."