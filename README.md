# 🚚 Sistema de Rastreamento de Cargas - Braticargas

Sistema completo de rastreamento e monitoramento de cargas em tempo real para a cooperativa Braticargas.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Usar](#como-usar)
- [Segurança](#segurança)
- [Deploy](#deploy)

## 🎯 Visão Geral

O sistema permite que a Braticargas e seus embarcadores acompanhem suas cargas em tempo real, desde o carregamento até a entrega, com alertas automáticos por email e monitoramento geolocalizado.

### Perfis de Usuário

1. **Cooperativa Braticargas**: Acesso total a todas as cargas de todos os embarcadores
2. **Embarcadores**: Acesso restrito apenas às suas próprias cargas

## ✨ Funcionalidades

### Sistema de Autenticação ✅
- Login seguro com Supabase Auth
- Controle de permissões por perfil (RLS)
- Recuperação de senha por email
- Sessões persistentes

### Dashboard do Embarcador ✅
- Visualização exclusiva das suas cargas
- Métricas em tempo real
- Filtros por status, data, rota
- Visualização em lista ou mapa
- Detalhes completos de cada carga

### Dashboard da Cooperativa ✅
- Monitoramento de TODAS as cargas
- Filtros avançados por:
  - Embarcador
  - Nota Fiscal
  - Status (Em Trânsito, Entregue, Cancelada)
  - Status de Prazo (No Prazo, Atrasado, Adiantado)
  - Origem/Destino (UF)
  - Motorista/Placa
  - Período de carregamento/entrega
- Ações rápidas (Cargas do dia, Atrasadas, etc)
- Histórico completo de entregas
- Marcar cargas como entregues

### Mapa de Rastreamento ✅
- Visualização geolocalizada de todas as cargas
- Auto-refresh a cada 30 segundos
- Marcadores coloridos por status:
  - 🟢 Verde = No Prazo
  - 🔴 Vermelho = Atrasado
  - 🔵 Azul = Adiantado
- Popup com detalhes ao clicar
- Zoom automático para mostrar todas as cargas
- Legenda e contador de cargas

### Cadastro de Cargas ✅
- Formulário completo com validações
- Campos obrigatórios:
  - Nota Fiscal (identificador único)
  - Origem e Destino (Cidade/UF)
  - Toneladas
  - Data de Carregamento
  - Prazo de Entrega
- Campos opcionais:
  - Descrição da carga
  - Motorista e Telefone
  - Placa do veículo
- Cálculo automático de distância
- Geração de link de rastreamento via WhatsApp

### Sistema de Alertas por Email ✅
- Alerta de entrega (para embarcador)
- Alerta de atraso (para cooperativa)
- Alerta de adiantamento (para embarcador)
- Templates HTML profissionais
- Envio para múltiplos emails
- Controle de alertas já enviados (evita spam)

### Integração com API de Rastreamento GPS ✅
- Geração de link único para motorista
- Captura de localização via navegador
- Rastreamento contínuo configurável
- Armazenamento de histórico de posições
- Verificação de compartilhamento ativo
- Suporte para APIs externas (Traccar, GPS Gate, etc)

### Cálculo Automático de Status ✅
- Algoritmo inteligente de semáforo:
  - **Verde (No Prazo)**: Progresso dentro da margem de ±10%
  - **Vermelho (Atrasado)**: Progresso 10% abaixo do esperado
  - **Azul (Adiantado)**: Progresso 10% acima do esperado
- Atualização em tempo real
- Baseado em:
  - Distância percorrida vs total
  - Tempo decorrido vs prazo total
  - Última posição GPS

## 🛠 Tecnologias

### Frontend
- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (estilização)
- **Leaflet** (mapas)
- **React Router** (navegação)

### Backend
- **Supabase**
  - PostgreSQL (banco de dados)
  - Auth (autenticação)
  - Realtime (atualizações em tempo real)
  - Row Level Security (segurança)
  - Edge Functions (envio de emails)

### Bibliotecas Principais
- `@supabase/supabase-js` - Cliente Supabase
- `leaflet` - Mapas interativos
- `react-router-dom` - Roteamento

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Passo a Passo

1. **Clone o repositório**
```bash
git clone https://github.com/sua-empresa/braticargas-rastreamento.git
cd braticargas-rastreamento
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

4. **Configure o banco de dados** (veja seção abaixo)

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5173`

## 🗄️ Configuração do Banco de Dados

### 1. Criar Tabelas

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- 1. TABELA DE EMBARCADORES
CREATE TABLE embarcadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    email_contato TEXT NOT NULL,
    emails_alertas TEXT[],
    telefone TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE USUÁRIOS DOS EMBARCADORES
CREATE TABLE usuarios_embarcadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embarcador_id UUID REFERENCES embarcadores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. TABELA DE CARGAS
CREATE TABLE cargas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embarcador_id UUID REFERENCES embarcadores(id) ON DELETE CASCADE,
    nota_fiscal TEXT UNIQUE NOT NULL,
    
    origem_cidade TEXT NOT NULL,
    origem_uf TEXT NOT NULL,
    origem_lat DECIMAL(10, 8),
    origem_lng DECIMAL(11, 8),
    
    destino_cidade TEXT NOT NULL,
    destino_uf TEXT NOT NULL,
    destino_lat DECIMAL(10, 8),
    destino_lng DECIMAL(11, 8),
    
    toneladas DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    
    data_carregamento TIMESTAMPTZ NOT NULL,
    prazo_entrega TIMESTAMPTZ NOT NULL,
    data_entrega_real TIMESTAMPTZ,
    
    status TEXT CHECK (status IN ('em_transito', 'entregue', 'cancelada')) DEFAULT 'em_transito',
    status_prazo TEXT CHECK (status_prazo IN ('no_prazo', 'atrasado', 'adiantado')),
    
    motorista_nome TEXT,
    motorista_telefone TEXT,
    placa_veiculo TEXT,
    link_rastreamento TEXT,
    
    distancia_total_km DECIMAL(10, 2),
    velocidade_media_estimada DECIMAL(5, 2) DEFAULT 60,
    
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE POSIÇÕES GPS
CREATE TABLE posicoes_gps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carga_id UUID REFERENCES cargas(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    velocidade DECIMAL(5, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    precisao_metros DECIMAL(8, 2),
    origem TEXT DEFAULT 'api_rastreamento'
);

-- 5. TABELA DE ALERTAS
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carga_id UUID REFERENCES cargas(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('entrega', 'atraso', 'adiantamento')) NOT NULL,
    destinatario TEXT NOT NULL,
    emails_enviados TEXT[],
    mensagem TEXT NOT NULL,
    enviado BOOLEAN DEFAULT false,
    enviado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE HISTÓRICO
CREATE TABLE historico_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carga_id UUID REFERENCES cargas(id) ON DELETE CASCADE,
    status_anterior TEXT,
    status_novo TEXT NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE USUÁRIOS COOPERATIVA (opcional)
CREATE TABLE usuarios_cooperativa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ÍNDICES
CREATE INDEX idx_cargas_embarcador ON cargas(embarcador_id);
CREATE INDEX idx_cargas_status ON cargas(status);
CREATE INDEX idx_cargas_nota_fiscal ON cargas(nota_fiscal);
CREATE INDEX idx_posicoes_carga ON posicoes_gps(carga_id, timestamp DESC);
CREATE INDEX idx_usuarios_embarcador ON usuarios_embarcadores(embarcador_id);
```

### 2. Configurar Row Level Security (RLS)

```sql
-- Ativar RLS
ALTER TABLE embarcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_embarcadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE posicoes_gps ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- Políticas para Embarcadores
CREATE POLICY "Usuários veem apenas seu embarcador"
ON embarcadores FOR SELECT
USING (
    id IN (
        SELECT embarcador_id 
        FROM usuarios_embarcadores 
        WHERE user_id = auth.uid()
    )
);

-- Políticas para Cargas (usuários veem apenas cargas do seu embarcador)
CREATE POLICY "Usuários veem apenas cargas do seu embarcador"
ON cargas FOR SELECT
USING (
    embarcador_id IN (
        SELECT embarcador_id 
        FROM usuarios_embarcadores 
        WHERE user_id = auth.uid()
    )
);

-- Políticas para Posições GPS
CREATE POLICY "Usuários veem posições das cargas do seu embarcador"
ON posicoes_gps FOR SELECT
USING (
    carga_id IN (
        SELECT c.id 
        FROM cargas c
        INNER JOIN usuarios_embarcadores ue ON c.embarcador_id = ue.embarcador_id
        WHERE ue.user_id = auth.uid()
    )
);
```

### 3. Criar Edge Function para Envio de Emails

No Supabase Dashboard → Edge Functions → Create Function

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { to, subject, html } = await req.json()
  
  // Integrar com serviço de email (SendGrid, Resend, etc)
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: to.map(email => ({ email })) }],
      from: { email: "noreply@braticargas.com.br" },
      subject,
      content: [{ type: "text/html", value: html }]
    })
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  })
})
```

### 4. Inserir Dados Iniciais (Opcional)

```sql
-- Criar um embarcador de teste
INSERT INTO embarcadores (razao_social, cnpj, email_contato, emails_alertas)
VALUES ('Empresa Teste LTDA', '12.345.678/0001-90', 'contato@empresateste.com', ARRAY['gerente@empresateste.com']);

-- Criar usuário de teste (após fazer signup no sistema)
-- Substitua o UUID pelo ID do usuário criado
INSERT INTO usuarios_embarcadores (embarcador_id, user_id, nome, email)
SELECT 
    e.id,
    'UUID_DO_USUARIO_AQUI',
    'João Silva',
    'joao@empresateste.com'
FROM embarcadores e WHERE e.cnpj = '12.345.678/0001-90';
```

## 📁 Estrutura do Projeto

```
braticargas-rastreamento/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── Dashboard/
│   │   │   ├── EmbarcadorDashboard.tsx
│   │   │   ├── CooperativaDashboard.tsx
│   │   │   └── DashboardMetrics.tsx
│   │   ├── Cargas/
│   │   │   ├── CargaForm.tsx
│   │   │   ├── CargaStatus.tsx
│   │   │   ├── CargasList.tsx
│   │   │   └── CargaDetails.tsx
│   │   ├── Mapa/
│   │   │   └── MapaRastreamento.tsx
│   │   ├── Filtros/
│   │   │   └── FiltrosCargas.tsx
│   │   └── Alertas/
│   │       └── AlertasList.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCargas.ts
│   │   ├── usePosicoes.ts
│   │   └── useRealtime.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── rastreamento.ts
│   │   └── notificacoes.ts
│   ├── utils/
│   │   ├── calculos.ts
│   │   └── formatters.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🚀 Como Usar

### Para Embarcadores

1. Faça login com suas credenciais
2. Visualize suas cargas no dashboard
3. Use filtros para encontrar cargas específicas
4. Alterne entre visualização de lista e mapa
5. Clique em uma carga para ver detalhes completos

### Para a Cooperativa

1. Faça login como usuário da cooperativa
2. Visualize TODAS as cargas de todos os embarcadores
3. Use filtros avançados:
   - Por embarcador
   - Por status (Em Trânsito, Entregue)
   - Por prazo (No Prazo, Atrasado, Adiantado)
   - Por rota (Origem/Destino)
   - Por período
4. Cadastre novas cargas clicando em "Nova Carga"
5. Acompanhe cargas no mapa em tempo real
6. Marque cargas como entregues
7. Visualize histórico de entregas

### Rastreamento GPS

1. Ao cadastrar uma carga com telefone do motorista
2. Um link é gerado automaticamente
3. O motorista recebe o link via WhatsApp
4. Ao abrir o link, o motorista autoriza compartilhamento de localização
5. O sistema captura a posição a cada 5 minutos (configurável)
6. A posição é atualizada em tempo real no dashboard

## 🔒 Segurança

### Row Level Security (RLS)
- Embarcadores só veem suas próprias cargas
- Cooperativa vê todas as cargas
- Políticas aplicadas no nível do banco de dados

### Autenticação
- JWT tokens gerenciados pelo Supabase
- Sessões criptografadas
- Recuperação de senha segura

### Validações
- Todas as entradas são validadas no frontend e backend
- CNPJ único por embarcador
- Nota Fiscal única por carga

## 🌐 Deploy

### Opção 1: Vercel

```bash
npm run build
vercel --prod
```

### Opção 2: Netlify

```bash
npm run build
netlify deploy --prod
```

### Opção 3: VPS/Servidor Próprio

```bash
npm run build
# Copiar pasta dist/ para servidor
# Configurar nginx ou apache
```

### Configuração de Produção

1. Configure variáveis de ambiente no provedor
2. Configure domínio personalizado
3. Configure SSL/HTTPS
4. Configure monitoramento

## 📞 Suporte

Para dúvidas ou problemas:
- Email: suporte@braticargas.com.br
- Telefone: (XX) XXXX-XXXX

## 📄 Licença

© 2025 Braticargas. Todos os direitos reservados.
