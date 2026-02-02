#!/bin/bash
# deploy-vps.sh - Script de Deploy Automático para VPS

echo "🚀 Deploy Braticargas para VPS"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir erro
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Função para imprimir sucesso
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Função para imprimir aviso
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar se está rodando com as permissões corretas
if [ "$EUID" -eq 0 ]; then 
    warning "Não rode este script como root! Use: ./scripts/deploy-vps.sh"
    exit 1
fi

# Configurações (EDITE AQUI)
SERVER_USER="seu_usuario"
SERVER_IP="seu_servidor_ip"
SERVER_PATH="/var/www/braticargas"
DOMAIN="braticargas.com.br"

echo "📋 Configurações:"
echo "   Servidor: $SERVER_USER@$SERVER_IP"
echo "   Caminho: $SERVER_PATH"
echo "   Domínio: $DOMAIN"
echo ""

read -p "As configurações estão corretas? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Edite as variáveis no início do script deploy-vps.sh"
    exit 1
fi

# 1. Build local
echo ""
echo "🏗️  Fazendo build local..."
npm run build || error "Erro no build!"
success "Build concluído"

# 2. Criar arquivo tar com o build
echo ""
echo "📦 Compactando arquivos..."
tar -czf dist.tar.gz dist/ || error "Erro ao compactar!"
success "Arquivos compactados"

# 3. Enviar para servidor
echo ""
echo "📤 Enviando para servidor..."
scp dist.tar.gz $SERVER_USER@$SERVER_IP:/tmp/ || error "Erro ao enviar arquivos!"
success "Arquivos enviados"

# 4. Conectar no servidor e fazer deploy
echo ""
echo "🔧 Configurando no servidor..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    # Extrair arquivos
    cd /tmp
    tar -xzf dist.tar.gz
    
    # Criar diretório se não existir
    sudo mkdir -p $SERVER_PATH
    
    # Fazer backup da versão anterior
    if [ -d "$SERVER_PATH/dist" ]; then
        sudo mv $SERVER_PATH/dist $SERVER_PATH/dist.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Mover nova versão
    sudo mv dist $SERVER_PATH/
    
    # Ajustar permissões
    sudo chown -R www-data:www-data $SERVER_PATH
    sudo chmod -R 755 $SERVER_PATH
    
    # Limpar arquivos temporários
    rm dist.tar.gz
    
    # Reiniciar Nginx
    sudo systemctl reload nginx
    
    echo "Deploy concluído no servidor!"
ENDSSH

# 5. Limpar arquivo local
rm dist.tar.gz

echo ""
success "Deploy concluído com sucesso!"
echo ""
echo "🎉 Seu site está no ar em: https://$DOMAIN"
echo ""
echo "📋 Próximos passos:"
echo "   1. Teste o site: https://$DOMAIN"
echo "   2. Verifique os logs: ssh $SERVER_USER@$SERVER_IP 'sudo tail -f /var/log/nginx/error.log'"
echo "   3. Configure SSL se ainda não tiver (certbot)"
echo ""
