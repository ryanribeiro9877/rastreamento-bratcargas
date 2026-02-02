# 🚀 COMECE AQUI - SISTEMA BRATICARGAS

## Bem-vindo ao Sistema de Rastreamento de Cargas!

Este é um sistema **completo** e **pronto para produção** com TUDO que você precisa.

---

## ⚡ INÍCIO RÁPIDO (5 minutos)

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas credenciais do Supabase
nano .env
```

### 3. Rodar Localmente
```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🎯 O QUE ESTE SISTEMA FAZ?

### ✅ Para Embarcadores:
- Ver suas cargas em tempo real
- Acompanhar no mapa
- Receber alertas por email
- Dashboard personalizado

### ✅ Para Cooperativa:
- Ver TODAS as cargas
- Filtros avançados
- Cadastrar novas cargas
- Marcar como entregue
- Monitorar atrasos

### ✅ Para Motoristas:
- Compartilhar localização via WhatsApp
- Sem login necessário
- Interface simples

---

## 📂 DOCUMENTAÇÃO

- **README.md** - Documentação técnica completa
- **PROJETO_COMPLETO.md** - Lista de todos os arquivos
- **docs/O_QUE_E_DEPLOY.md** - Explicação sobre Deploy
- **docs/GUIA_RAPIDO_DEPLOY.md** - Como publicar o site
- **docs/COMPONENTES_ADICIONAIS.md** - Componentes extras

---

## 🚀 FAZER DEPLOY (Colocar no ar)

### Opção 1: Vercel (Grátis, 5 minutos)
```bash
./scripts/deploy-vercel.sh
```

### Opção 2: Docker (Servidor próprio)
```bash
docker-compose up -d
```

### Opção 3: VPS Manual
```bash
# No servidor
sudo ./scripts/setup-server.sh

# No seu computador
./scripts/deploy-vps.sh
```

**Leia**: `docs/O_QUE_E_DEPLOY.md` para entender melhor!

---

## 🗂️ ESTRUTURA DO PROJETO

```
src/
├── components/
│   ├── Auth/          # Login, proteção de rotas
│   ├── Dashboard/     # Dashboards Cooperativa e Embarcador
│   ├── Cargas/        # Formulários, listas, detalhes
│   ├── Mapa/          # Rastreamento com auto-refresh
│   └── Rastreamento/  # Página do motorista
├── hooks/             # useAuth, useCargas, useRealtime
├── services/          # Supabase, GPS, Email
└── utils/             # Cálculos, formatação
```

---

## 🎨 FUNCIONALIDADES

✅ 7 Itens Principais Implementados:
1. Autenticação completa
2. Dashboard Cooperativa (todos os filtros)
3. Dashboard Embarcador
4. Mapa com auto-refresh
5. Cadastro de cargas
6. Alertas por email
7. Rastreamento GPS

✅ Componentes Extras:
- Lista reutilizável de cargas
- Modal de detalhes completos
- Página pública do motorista
- Menu de navegação

✅ Scripts de Deploy:
- Vercel (automático)
- VPS (manual)
- Docker (container)

---

## 🔧 CONFIGURAÇÃO DO BANCO

1. Criar conta no Supabase: https://supabase.com
2. Criar novo projeto
3. Executar SQL do README.md (seção "Configuração do Banco")
4. Configurar RLS (Row Level Security)
5. Criar Edge Function para emails

---

## 📱 TECNOLOGIAS

- React 18 + TypeScript
- Tailwind CSS
- Leaflet (mapas)
- Supabase (banco + auth + realtime)
- Vite

---

## 🆘 PRECISA DE AJUDA?

### Problema: Não sabe o que é Deploy
📖 Leia: `docs/O_QUE_E_DEPLOY.md`

### Problema: Erro ao instalar
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install
```

### Problema: Erro no build
```bash
# Verificar .env
cat .env

# Testar build
npm run build
```

### Problema: Supabase não conecta
- Verificar URL e KEY no .env
- Verificar se projeto existe no Supabase
- Verificar se RLS está configurado

---

## ✅ CHECKLIST ANTES DE COMEÇAR

- [ ] Node.js 18+ instalado
- [ ] npm instalado
- [ ] Conta no Supabase criada
- [ ] Projeto Supabase criado
- [ ] SQL executado no Supabase
- [ ] .env configurado

---

## 🎉 PRONTO!

Agora você tem um sistema completo de rastreamento de cargas!

**Próximo passo:** 
1. Rodar localmente: `npm run dev`
2. Testar funcionalidades
3. Fazer deploy: `./scripts/deploy-vercel.sh`

---

**Desenvolvido para Braticargas - 2025**
Sistema 100% completo e pronto para produção! 🚚📦
