#!/bin/bash
# setup-server.sh - Configuração Inicial do Servidor VPS
# Execute este script UMA VEZ no servidor novo

echo "🔧 Configuração Inicial do Servidor - Braticargas"
echo "=================================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Execute este script como root: sudo ./setup-server.sh"
    exit 1
fi

echo "📋 Este script vai instalar:"
echo "   - Node.js 18"
echo "   - Nginx"
echo "   - PM2"
echo "   - Certbot (SSL)"
echo "   - Firewall (UFW)"
echo ""

read -p "Continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
fi

# Atualizar sistema
echo ""
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar Node.js 18
echo ""
echo "📦 Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version

# Instalar Nginx
echo ""
echo "📦 Instalando Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Instalar PM2
echo ""
echo "📦 Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# Instalar Certbot
echo ""
echo "📦 Instalando Certbot (SSL)..."
apt install -y certbot python3-certbot-nginx

# Configurar Firewall
echo ""
echo "🔒 Configurando Firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw status

# Criar diretórios
echo ""
echo "📁 Criando estrutura de diretórios..."
mkdir -p /var/www/braticargas
chown -R www-data:www-data /var/www/braticargas

# Configurar Nginx para Braticargas
echo ""
echo "⚙️  Configurando Nginx..."
cat > /etc/nginx/sites-available/braticargas << 'EOF'
server {
    listen 80;
    server_name _;  # Substitua pelo seu domínio

    root /var/www/braticargas/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/braticargas-access.log;
    error_log /var/log/nginx/braticargas-error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/braticargas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx

echo ""
echo "✅ Servidor configurado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Configure o domínio:"
echo "   - Edite: /etc/nginx/sites-available/braticargas"
echo "   - Substitua 'server_name _;' por 'server_name seu-dominio.com;'"
echo "   - Reinicie: systemctl restart nginx"
echo ""
echo "2. Configure SSL (HTTPS):"
echo "   sudo certbot --nginx -d seu-dominio.com"
echo ""
echo "3. Faça deploy da aplicação:"
echo "   - No seu computador, execute: ./scripts/deploy-vps.sh"
echo ""
echo "4. Monitore os logs:"
echo "   sudo tail -f /var/log/nginx/braticargas-error.log"
echo ""
echo "🎉 Servidor pronto para receber deploy!"
