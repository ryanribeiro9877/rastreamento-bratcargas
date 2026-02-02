#!/bin/bash
# push-github.sh - Script para enviar código para o GitHub

echo "📤 Push para GitHub - Braticargas"
echo "=================================="
echo ""

# Verificar se está em um repositório git
if [ ! -d ".git" ]; then
    echo "❌ Este diretório não é um repositório Git!"
    echo "Execute primeiro: git init"
    exit 1
fi

# Verificar se já tem remote configurado
REMOTE=$(git remote -v | grep origin | head -1)

if [ -z "$REMOTE" ]; then
    echo "🔗 Configurar repositório remoto"
    echo ""
    echo "Por favor, informe seu username do GitHub:"
    read -p "Username: " GITHUB_USER
    
    REPO_URL="https://github.com/$GITHUB_USER/braticargas-rastreamento.git"
    
    echo ""
    echo "Adicionando remote: $REPO_URL"
    git remote add origin "$REPO_URL"
    
    echo "✅ Remote configurado!"
else
    echo "✅ Remote já configurado:"
    echo "$REMOTE"
fi

echo ""
echo "📊 Status do repositório:"
git status --short

echo ""
echo "🔍 Verificando se há mudanças..."

# Verificar se há mudanças para commit
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    read -p "Há mudanças não commitadas. Deseja fazer commit agora? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo ""
        echo "Digite a mensagem do commit:"
        read COMMIT_MSG
        
        git add .
        git commit -m "$COMMIT_MSG"
        echo "✅ Commit realizado!"
    fi
else
    echo "✅ Não há mudanças para commit"
fi

echo ""
echo "🚀 Enviando para GitHub..."
echo ""

# Fazer push
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Código enviado com sucesso para o GitHub!"
    echo ""
    echo "🎉 Seu repositório está em:"
    REMOTE_URL=$(git config --get remote.origin.url)
    REPO_WEB_URL=$(echo $REMOTE_URL | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
    echo "$REPO_WEB_URL"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Acesse o repositório no navegador"
    echo "   2. Verifique se todos os arquivos estão lá"
    echo "   3. Configure deploy automático (Vercel/Netlify)"
    echo ""
else
    echo ""
    echo "❌ Erro ao fazer push!"
    echo ""
    echo "Possíveis soluções:"
    echo "1. Se pediu senha, use um Personal Access Token:"
    echo "   https://github.com/settings/tokens"
    echo ""
    echo "2. Se o repositório não existe, crie primeiro:"
    echo "   https://github.com/new"
    echo ""
    echo "3. Se já existe conteúdo no GitHub, faça pull primeiro:"
    echo "   git pull origin main --allow-unrelated-histories"
    echo "   Depois tente: ./scripts/push-github.sh"
    echo ""
fi
