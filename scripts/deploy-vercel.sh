#!/bin/bash
# deploy-vercel.sh - Script de Deploy Automático para Vercel

echo "🚀 Iniciando Deploy para Vercel..."
echo ""

# Verificar se está instalado o Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado!"
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Criando .env a partir do .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais antes de continuar!"
    echo ""
    read -p "Pressione Enter quando terminar de configurar o .env..."
fi

echo ""
echo "🔍 Verificando ambiente..."

# Verificar se variáveis estão configuradas
if ! grep -q "VITE_SUPABASE_URL=https://" .env; then
    echo "❌ Variável VITE_SUPABASE_URL não configurada!"
    echo "Configure no arquivo .env e tente novamente."
    exit 1
fi

if ! grep -q "VITE_SUPABASE_ANON_KEY=eyJ" .env; then
    echo "❌ Variável VITE_SUPABASE_ANON_KEY não configurada!"
    echo "Configure no arquivo .env e tente novamente."
    exit 1
fi

echo "✅ Variáveis de ambiente configuradas"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências!"
    exit 1
fi

echo "✅ Dependências instaladas"
echo ""

# Build
echo "🏗️  Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build!"
    exit 1
fi

echo "✅ Build concluído com sucesso"
echo ""

# Deploy
echo "🚀 Fazendo deploy na Vercel..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Se for a primeira vez, você será solicitado a fazer login"
echo "   - Siga as instruções no terminal"
echo "   - Configure as variáveis de ambiente na Vercel Dashboard"
echo ""
read -p "Pressione Enter para continuar..."

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "🎉 Seu sistema está no ar!"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Acesse a Vercel Dashboard: https://vercel.com/dashboard"
    echo "   2. Configure as variáveis de ambiente em Settings → Environment Variables"
    echo "   3. Adicione:"
    echo "      - VITE_SUPABASE_URL"
    echo "      - VITE_SUPABASE_ANON_KEY"
    echo "      - VITE_EMAIL_COOPERATIVA"
    echo "   4. Faça redeploy para aplicar as variáveis"
    echo ""
else
    echo ""
    echo "❌ Erro no deploy!"
    echo "Verifique os logs acima para mais detalhes."
    exit 1
fi
