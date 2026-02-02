# 🚀 GUIA RÁPIDO DE DEPLOY - BRATICARGAS

## Opção 1: Deploy na Vercel (RECOMENDADO - 5 minutos)

### Método 1: Via Interface Web (Mais Fácil)

1. **Criar conta na Vercel**
   - Acesse: https://vercel.com
   - Faça login com GitHub

2. **Importar Projeto**
   - Clique em "New Project"
   - Importe seu repositório do GitHub
   - Clique em "Deploy"

3. **Configurar Variáveis**
   - Vá em Settings → Environment Variables
   - Adicione:
     ```
     VITE_SUPABASE_URL=https://seu-projeto.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJ...
     VITE_EMAIL_COOPERATIVA=operacao@braticargas.com.br
     ```
   - Salve e faça Redeploy

4. **Pronto! ✅**
   Seu site está em: `https://braticargas-rastreamento.vercel.app`

### Método 2: Via Script Automático

```bash
# Na pasta do projeto
./scripts/deploy-vercel.sh
```

---

## Opção 2: Deploy com Docker (Servidor Próprio)

### Requisitos:
- Servidor Ubuntu/Debian
- Docker instalado

### Passos:

1. **No servidor, instalar Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker
```

2. **Clonar projeto**
```bash
git clone https://github.com/seu-usuario/braticargas.git
cd braticargas
```

3. **Configurar .env**
```bash
cp .env.example .env
nano .env  # Editar com suas credenciais
```

4. **Subir containers**
```bash
docker-compose up -d
```

5. **Pronto! ✅**
   Acesse: `http://seu-servidor-ip`

---

## Opção 3: Deploy Manual em VPS

### 1. Configurar Servidor (Uma vez)

No servidor VPS:
```bash
# Baixar script
wget https://raw.githubusercontent.com/seu-usuario/braticargas/main/scripts/setup-server.sh

# Executar
sudo chmod +x setup-server.sh
sudo ./setup-server.sh
```

### 2. Configurar Domínio

```bash
# Editar configuração do Nginx
sudo nano /etc/nginx/sites-available/braticargas

# Trocar esta linha:
server_name _;

# Por:
server_name braticargas.com.br;

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 3. Configurar SSL

```bash
sudo certbot --nginx -d braticargas.com.br
```

### 4. Deploy da Aplicação

No seu computador:
```bash
# Editar script com IP do servidor
nano scripts/deploy-vps.sh

# Rodar deploy
./scripts/deploy-vps.sh
```

---

## Opção 4: CI/CD Automático (GitHub Actions)

### Setup:

1. **Adicionar Secrets no GitHub**
   - Vá em: Settings → Secrets → Actions
   - Adicione:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_EMAIL_COOPERATIVA`

2. **Fazer push para main**
```bash
git add .
git commit -m "Setup CI/CD"
git push origin main
```

3. **Deploy Automático! ✅**
   - GitHub Actions roda automaticamente
   - Vercel faz deploy automaticamente
   - A cada push, novo deploy!

---

## 📊 Comparação Rápida

| Método | Tempo | Dificuldade | Custo |
|--------|-------|-------------|-------|
| **Vercel Web** | 5 min | ⭐ Fácil | Grátis |
| **Vercel Script** | 3 min | ⭐ Fácil | Grátis |
| **Docker** | 15 min | ⭐⭐ Médio | $5-10/mês |
| **VPS Manual** | 30 min | ⭐⭐⭐ Difícil | $5-20/mês |
| **CI/CD** | 10 min | ⭐⭐ Médio | Grátis |

---

## 🎯 Recomendação

### Para começar AGORA:
✅ **Vercel via Web** (5 minutos, grátis)

### Para produção:
✅ **CI/CD com GitHub Actions** (deploy automático a cada mudança)

### Para controle total:
✅ **VPS com Docker** (seu próprio servidor)

---

## 🆘 Problemas Comuns

### Erro: "Module not found"
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro: "Permission denied"
```bash
# Dar permissão aos scripts
chmod +x scripts/*.sh
```

### Erro: Build falha
```bash
# Verificar variáveis de ambiente
cat .env

# Testar build local
npm run build
```

### Deploy Vercel dá 404
- Verifique se configurou as variáveis de ambiente
- Faça Redeploy após adicionar variáveis

---

## 📞 Suporte

- Vercel Docs: https://vercel.com/docs
- Docker Docs: https://docs.docker.com
- Nginx Docs: https://nginx.org/en/docs

---

## ✅ Checklist Pré-Deploy

Antes de fazer deploy, confira:

- [ ] Código testado localmente (`npm run dev`)
- [ ] Build funciona (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados Supabase configurado
- [ ] RLS policies ativadas
- [ ] Edge Functions criadas (para emails)
- [ ] Domínio comprado (se aplicável)

---

## 🎉 Parabéns!

Após o deploy, seu sistema estará acessível na internet!

**Próximos passos:**
1. Teste todas as funcionalidades
2. Configure monitoramento (Sentry, LogRocket)
3. Configure backups automáticos
4. Monitore performance
5. Colete feedback dos usuários
