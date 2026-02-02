# 🚀 GUIA DE DEPLOY - O QUE É E COMO FUNCIONA

## 📋 O QUE É DEPLOY?

**Deploy** (ou "Implantação" em português) é o processo de **colocar seu sistema no ar**, ou seja, torná-lo acessível na internet para que outras pessoas possam usar.

### Analogia Simples:
- **Desenvolvimento Local** (npm run dev) = Cozinhar em casa só pra você
- **Deploy** = Abrir um restaurante para o público

Quando você roda `npm run dev`, o sistema funciona **apenas no seu computador** (localhost:5173).

Quando você faz **deploy**, o sistema fica disponível em um **endereço público** na internet (ex: braticargas.com.br).

---

## 🎯 TIPOS DE DEPLOY

### 1. **Deploy em Plataformas Gratuitas** (Mais Fácil)
Plataformas que hospedam seu site de graça:

- **Vercel** ⭐ (Recomendado)
  - Grátis
  - Deploy automático
  - Muito rápido
  - Ideal para React + Vite

- **Netlify**
  - Grátis
  - Fácil de usar
  - Bom para sites estáticos

### 2. **Deploy em Servidor Próprio** (VPS)
Você aluga um servidor e instala tudo:

- **DigitalOcean** (VPS)
- **AWS EC2**
- **Google Cloud**
- **Contabo**

---

## 🚀 OPÇÃO 1: DEPLOY NA VERCEL (Recomendado para começar)

A Vercel é perfeita para projetos React. É **grátis** e **super fácil**.

### Passo a Passo:

#### 1. Criar conta na Vercel
```
1. Acesse: https://vercel.com
2. Clique em "Sign Up"
3. Entre com GitHub (recomendado)
```

#### 2. Conectar seu Repositório
```
1. Na Vercel, clique em "New Project"
2. Importe seu repositório do GitHub
3. Configure as variáveis de ambiente:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_EMAIL_COOPERATIVA
```

#### 3. Deploy Automático
```
A Vercel vai:
1. Ler seu package.json
2. Executar npm install
3. Executar npm run build
4. Publicar o site

Pronto! Seu site estará no ar em:
https://braticargas-rastreamento.vercel.app
```

#### 4. Deploy Contínuo (CD)
Toda vez que você fizer push no GitHub:
```bash
git add .
git commit -m "nova funcionalidade"
git push
```
A Vercel automaticamente:
- Detecta a mudança
- Faz o build
- Atualiza o site

---

## 🐳 OPÇÃO 2: DEPLOY COM DOCKER (Para Servidor Próprio)

Docker é como uma "caixa" que empacota todo o sistema e suas dependências.

### O que é Docker?
Imagine que você quer mandar um bolo para alguém:
- **Sem Docker**: Você manda a receita e espera que a pessoa tenha todos os ingredientes
- **Com Docker**: Você manda o bolo pronto dentro de uma caixa térmica

### Como usar Docker no projeto:

1. **Instalar Docker** no servidor
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
```

2. **Criar o Container**
```bash
# Na pasta do projeto
docker-compose up -d
```

3. **Pronto!**
O sistema estará rodando em:
```
http://seu-servidor-ip:3000
```

---

## ⚙️ OPÇÃO 3: DEPLOY MANUAL (VPS + Nginx)

Para quem quer controle total.

### Fluxo:
```
Seu Computador
    ↓ (git push)
GitHub
    ↓ (git pull no servidor)
Servidor VPS
    ↓ (nginx serve)
Internet (público)
```

### Passo a Passo:

#### 1. Alugar um VPS
- DigitalOcean: $5/mês
- Contabo: €4/mês
- Hostinger: R$20/mês

#### 2. Configurar o Servidor
```bash
# Conectar no servidor via SSH
ssh root@seu-servidor-ip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Instalar Nginx
sudo apt install nginx

# Instalar PM2 (gerenciador de processos)
npm install -g pm2
```

#### 3. Subir o Projeto
```bash
# Clonar repositório
git clone https://github.com/seu-usuario/braticargas.git
cd braticargas

# Instalar dependências
npm install

# Build para produção
npm run build

# A pasta dist/ agora tem os arquivos prontos
```

#### 4. Configurar Nginx
```bash
# Criar config do Nginx
sudo nano /etc/nginx/sites-available/braticargas

# Colar esta configuração:
server {
    listen 80;
    server_name braticargas.com.br;
    
    root /var/www/braticargas/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Ativar site
sudo ln -s /etc/nginx/sites-available/braticargas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Configurar Domínio
```
1. Comprar domínio (registro.br, GoDaddy, etc)
2. Apontar DNS para IP do servidor:
   Tipo A: braticargas.com.br → IP_DO_SERVIDOR
3. Aguardar propagação (até 48h)
```

#### 6. Instalar SSL (HTTPS)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado grátis
sudo certbot --nginx -d braticargas.com.br

# Renovação automática já configurada!
```

---

## 🔄 CI/CD (Integração e Deploy Contínuo)

CI/CD = Automatizar todo o processo de deploy.

### Como funciona:
```
Você faz commit → GitHub detecta → Roda testes → Faz build → Deploy automático
```

### GitHub Actions (Grátis)

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy para Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Instalar Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Instalar dependências
        run: npm install
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy para Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

Agora toda vez que você fizer `git push`, o deploy é automático!

---

## 📊 COMPARAÇÃO DAS OPÇÕES

| Opção | Custo | Dificuldade | Velocidade | Controle |
|-------|-------|-------------|------------|----------|
| **Vercel** | Grátis | ⭐ Fácil | ⚡ Muito rápida | Médio |
| **Netlify** | Grátis | ⭐ Fácil | ⚡ Rápida | Médio |
| **Docker** | Varia | ⭐⭐ Médio | 🐢 Média | Alto |
| **VPS Manual** | $5-20/mês | ⭐⭐⭐ Difícil | 🐢 Depende | Total |

---

## 🎯 RECOMENDAÇÃO PARA BRATICARGAS

### Fase 1: Teste (Agora)
```
✅ Use Vercel (grátis)
- Deploy em minutos
- Teste com clientes
- Sem custos
```

### Fase 2: Crescimento
```
✅ VPS próprio
- Mais controle
- Melhor performance
- ~$10/mês
```

### Fase 3: Escalabilidade
```
✅ Cloud (AWS/Google Cloud)
- Auto-scaling
- Alta disponibilidade
- Custo variável
```

---

## 🛠️ CHECKLIST PRÉ-DEPLOY

Antes de fazer deploy, certifique-se:

```
✅ Código testado localmente
✅ Variáveis de ambiente configuradas
✅ Build funciona (npm run build)
✅ Banco de dados configurado (Supabase)
✅ Edge Functions criadas (emails)
✅ RLS configurado no Supabase
✅ Domínio comprado (se aplicável)
✅ SSL configurado (HTTPS)
```

---

## 📞 SUPORTE

Dúvidas sobre deploy? Veja:
- Documentação Vercel: https://vercel.com/docs
- Documentação Netlify: https://docs.netlify.com
- Tutorial Docker: https://docs.docker.com/get-started

---

## 🎉 RESUMO

**Deploy = Colocar seu sistema no ar para todo mundo usar!**

**Mais Fácil**: Vercel (1 clique)
**Mais Controle**: VPS + Nginx
**Mais Automático**: CI/CD com GitHub Actions

Comece pela Vercel, é grátis e leva 5 minutos! 🚀
