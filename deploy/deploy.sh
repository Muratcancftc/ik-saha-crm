#!/usr/bin/env bash
# Yerel makinadan Contabo sunucusuna deploy
# Kullanım:
#   SERVER_IP=1.2.3.4 SEED=1 bash deploy/deploy.sh
set -euo pipefail

SERVER_IP="${SERVER_IP:?SERVER_IP gerekli (örn. SERVER_IP=185.x.x.x)}"
DOMAIN="${DOMAIN:-atalayik.com.tr}"
APP_DIR="/opt/ikcrm"
SSH_USER="root"

echo "==> Kod sunucuya kopyalanıyor ($SERVER_IP:$APP_DIR)"
ssh -o StrictHostKeyChecking=accept-new "$SSH_USER@$SERVER_IP" "mkdir -p $APP_DIR"
rsync -az --delete --exclude node_modules --exclude .next --exclude .env --exclude 'uploads/*' --exclude .git ./ "$SSH_USER@$SERVER_IP:$APP_DIR/"

echo "==> Sunucuda kurulum çalıştırılıyor"
ssh "$SSH_USER@$SERVER_IP" "cd $APP_DIR && bash deploy/setup-contabo.sh" 2>&1 | tee /tmp/contabo-setup.log

echo ""
echo "✅ Deploy tamamlandı. https://$DOMAIN"