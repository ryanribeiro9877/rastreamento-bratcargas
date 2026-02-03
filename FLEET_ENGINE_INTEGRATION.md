# 🚀 Guia de Integração Google Maps Fleet Engine

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Google Cloud](#configuração-google-cloud)
4. [Instalação de Dependências](#instalação-de-dependências)
5. [Configuração do Projeto](#configuração-do-projeto)
6. [Deploy da Edge Function](#deploy-da-edge-function)
7. [Como Funciona](#como-funciona)
8. [Fluxo de Uso](#fluxo-de-uso)
9. [Custos](#custos)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Esta integração permite rastreamento em tempo real de motoristas usando **Google Maps Fleet Engine**, a mesma tecnologia usada por Uber, 99, iFood e outras plataformas de delivery/transporte.

### Benefícios
- ✅ **Rastreamento em tempo real** com latência < 5 segundos
- ✅ **ETA preciso** considerando trânsito em tempo real
- ✅ **Rotas otimizadas** automaticamente
- ✅ **Visualização profissional** com Google Maps
- ✅ **Escalável** para milhares de veículos simultâneos
- ✅ **Confiável** - infraestrutura Google Cloud

---

## 📦 Pré-requisitos

### Conta Google Cloud
- Conta Google Cloud ativa
- Cartão de crédito cadastrado (necessário mesmo para free tier)
- Projeto criado no Google Cloud Console

### Conhecimentos Técnicos
- React/TypeScript
- Supabase (Edge Functions)
- Google Maps API

---

## ☁️ Configuração Google Cloud

### Passo 1: Criar Projeto

```bash
# Acesse: https://console.cloud.google.com
# 1. Clique em "Select a project" → "New Project"
# 2. Nome: "Braticargas Fleet Engine"
# 3. Clique em "Create"
```

### Passo 2: Ativar APIs

Acesse: **APIs & Services → Library**

Ative as seguintes APIs:
- ✅ **Fleet Engine Delivery API**
- ✅ **Maps JavaScript API**
- ✅ **Directions API**
- ✅ **Distance Matrix API**
- ✅ **Geocoding API**

```bash
# Ou via gcloud CLI:
gcloud services enable fleetengine.googleapis.com
gcloud services enable maps-backend.googleapis.com
gcloud services enable directions-backend.googleapis.com
gcloud services enable distance-matrix-backend.googleapis.com
gcloud services enable geocoding-backend.googleapis.com
```

### Passo 3: Criar API Key (Frontend)

**APIs & Services → Credentials → Create Credentials → API Key**

Configurar restrições:
```yaml
Application restrictions:
  - HTTP referrers (web sites)
  - Website restrictions: 
      - seu-dominio.com/*
      - localhost:* (para desenvolvimento)

API restrictions:
  - Restrict key
  - Select APIs:
      - Maps JavaScript API
      - Directions API
      - Distance Matrix API
```

**⚠️ IMPORTANTE:** Nunca commite a API Key no código!

### Passo 4: Criar Service Account (Backend)

**IAM & Admin → Service Accounts → Create Service Account**

```yaml
Service account details:
  - Name: fleet-engine-service
  - ID: fleet-engine-service
  - Description: Service account for Fleet Engine integration

Grant this service account access to project:
  - Role: Fleet Engine Delivery Fleet Reader
  - Role: Fleet Engine Delivery Super User

Create key:
  - Key type: JSON
  - Download e guardar em local seguro
```

### Passo 5: Configurar Fleet Engine Provider

```bash
# Acesse: https://console.cloud.google.com/fleetengine

# 1. Enable Fleet Engine
# 2. Create Provider
#    - Provider ID: braticargas-provider
#    - Display Name: Braticargas
#    - Type: Delivery

# Anote o Provider ID gerado
```

---

## 📦 Instalação de Dependências

```bash
# No diretório do projeto
npm install @googlemaps/js-api-loader
npm install @google/maps-fleetengine-delivery
npm install @types/google.maps

# Opcional (para desenvolvimento)
npm install -D @types/googlemaps
```

---

## ⚙️ Configuração do Projeto

### 1. Atualizar `.env`

```bash
# Google Maps & Fleet Engine
VITE_GOOGLE_MAPS_API_KEY=sua-api-key-frontend
VITE_FLEET_ENGINE_PROJECT_ID=seu-projeto-id
VITE_FLEET_ENGINE_PROVIDER_ID=braticargas-provider

# Manter configurações existentes do Supabase
VITE_SUPABASE_URL=https://eytxgejxpsuotnbmvxao.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_EMAIL_COOPERATIVA=operacao@braticargas.com.br
```

### 2. Criar `.env.local` para Edge Function

```bash
# supabase/.env.local
GOOGLE_SERVICE_ACCOUNT_EMAIL=fleet-engine-service@seu-projeto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----
FLEET_ENGINE_PROJECT_ID=seu-projeto-id
FLEET_ENGINE_PROVIDER_ID=braticargas-provider
```

**⚠️ IMPORTANTE:** 
- Adicione `.env.local` ao `.gitignore`
- Nunca commite credenciais de service account

### 3. Adicionar Tipos do Google Maps

Crie `src/types/google-maps.d.ts`:

```typescript
/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
```

---

## 🚀 Deploy da Edge Function

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Link ao Projeto

```bash
supabase link --project-ref eytxgejxpsuotnbmvxao
```

### 4. Deploy da Function

```bash
# Deploy da edge function fleet-engine-proxy
supabase functions deploy fleet-engine-proxy

# Configurar secrets
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=fleet-engine-service@seu-projeto.iam.gserviceaccount.com
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----"
supabase secrets set FLEET_ENGINE_PROJECT_ID=seu-projeto-id
supabase secrets set FLEET_ENGINE_PROVIDER_ID=braticargas-provider
```

### 5. Testar Edge Function

```bash
curl -X POST https://eytxgejxpsuotnbmvxao.supabase.co/functions/v1/fleet-engine-proxy \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_token",
    "data": {
      "vehicleId": "test-vehicle-123"
    }
  }'
```

---

## 🔄 Como Funciona

### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    MOTORISTA                             │
│  1. Recebe link via WhatsApp                            │
│  2. Autoriza compartilhamento de localização            │
│  3. App captura GPS a cada 10 segundos                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                      │
│  - Autentica com Google (Service Account)               │
│  - Cria Vehicle no Fleet Engine                         │
│  - Cria Delivery Task                                   │
│  - Atualiza localização do veículo                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│           GOOGLE FLEET ENGINE                            │
│  - Armazena posição do veículo                          │
│  - Calcula rota otimizada                               │
│  - Calcula ETA com trânsito                             │
│  - Fornece dados para visualização                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                 CLIENTE/EMBARCADOR                       │
│  - Visualiza mapa em tempo real                         │
│  - Vê posição do veículo                                │
│  - Vê rota otimizada                                    │
│  - Vê ETA atualizado                                    │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Autorização (Uma vez)**
   - Motorista recebe link único
   - Autoriza compartilhamento
   - Sistema cria Vehicle + Task no Fleet Engine

2. **Captura Contínua (A cada 10s)**
   - App captura GPS do motorista
   - Envia para Edge Function
   - Edge Function atualiza Fleet Engine
   - Salva backup no Supabase

3. **Visualização (Tempo Real)**
   - Cliente abre dashboard
   - Busca posição do Fleet Engine
   - Calcula ETA com trânsito
   - Desenha rota no mapa

---

## 📱 Fluxo de Uso

### Para o Sistema (Automático)

```typescript
// 1. Quando carga é criada, gerar link de autorização
import { rastreamentoService } from './services/rastreamento';

const link = await rastreamentoService.gerarLinkRastreamento(
  carga.id,
  carga.motorista_telefone
);

// Link será: https://seu-dominio.com/autorizacao/token-unico-123
```

### Para o Motorista

1. **Recebe WhatsApp** com link de autorização
2. **Clica no link** → Abre tela de autorização
3. **Informa nome** e clica em "Autorizar"
4. **Navegador solicita** permissão de localização
5. **Autoriza** → Rastreamento inicia automaticamente
6. **Mantém app aberto** durante a entrega
7. **Ao finalizar**, pode parar o compartilhamento

### Para o Cliente/Embarcador

1. **Acessa dashboard** de cargas
2. **Clica na carga** em andamento
3. **Visualiza mapa** com:
   - Posição atual do veículo
   - Rota até o destino
   - ETA atualizado
   - Distância restante
4. **Acompanha em tempo real** até a entrega

---

## 💰 Custos

### Google Maps Platform

**Fleet Engine Delivery API:**
- Primeiros 1.000 veículos/mês: **GRÁTIS**
- Acima de 1.000: $0.05 por veículo ativo/mês

**Maps JavaScript API:**
- Primeiras 28.000 carregamentos/mês: **GRÁTIS**
- Acima: $7.00 por 1.000 carregamentos

**Directions API:**
- Primeiras 40.000 requisições/mês: **GRÁTIS**
- Acima: $5.00 por 1.000 requisições

### Estimativa Mensal (100 entregas/mês)

```
Fleet Engine: GRÁTIS (< 1.000 veículos)
Maps API: GRÁTIS (< 28.000 carregamentos)
Directions: GRÁTIS (< 40.000 requisições)

Total: R$ 0,00/mês
```

### Estimativa Mensal (1.000 entregas/mês)

```
Fleet Engine: GRÁTIS (= 1.000 veículos)
Maps API: GRÁTIS (< 28.000 carregamentos)
Directions: ~$25 USD (~R$ 125)

Total: ~R$ 125/mês
```

**💡 Dica:** Configure alertas de billing no Google Cloud para evitar surpresas.

---

## 🔧 Troubleshooting

### Erro: "API Key inválida"

**Solução:**
1. Verifique se a API Key está correta no `.env`
2. Confirme que as APIs estão ativadas no Google Cloud
3. Verifique as restrições da API Key (domínio permitido)

```bash
# Testar API Key
curl "https://maps.googleapis.com/maps/api/js?key=SUA_API_KEY"
```

### Erro: "Permission denied" no Fleet Engine

**Solução:**
1. Verifique se o Service Account tem as roles corretas:
   - Fleet Engine Delivery Fleet Reader
   - Fleet Engine Delivery Super User
2. Confirme que a chave privada está correta no `.env.local`

### Erro: "Geolocation not supported"

**Solução:**
1. Certifique-se que o site está em HTTPS (obrigatório para geolocalização)
2. Em desenvolvimento, use `localhost` (permitido sem HTTPS)
3. Verifique se o navegador suporta Geolocation API

### Localização não atualiza

**Solução:**
1. Verifique se o motorista mantém o app aberto
2. Confirme que a permissão de localização foi concedida
3. Verifique os logs do console do navegador
4. Teste a conectividade com a internet

```javascript
// Debug: verificar se está capturando
fleetEngineService.verificarCompartilhamentoAtivo(cargaId)
  .then(ativo => console.log('Compartilhamento ativo:', ativo));
```

### ETA impreciso

**Solução:**
1. Verifique se está usando `drivingOptions` com `trafficModel`
2. Confirme que a Directions API está ativada
3. Aumente a frequência de atualização do ETA (padrão: 30s)

---

## 📚 Recursos Adicionais

### Documentação Oficial
- [Fleet Engine Delivery API](https://developers.google.com/maps/documentation/transportation-logistics/on-demand-rides-deliveries-solution)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Directions API](https://developers.google.com/maps/documentation/directions)

### Exemplos de Código
- [Fleet Engine Samples](https://github.com/googlemaps/fleet-engine-samples)
- [Google Maps Samples](https://github.com/googlemaps/js-samples)

### Suporte
- [Stack Overflow - google-maps](https://stackoverflow.com/questions/tagged/google-maps)
- [Google Maps Platform Support](https://developers.google.com/maps/support)

---

## ✅ Checklist de Implementação

- [ ] Criar projeto no Google Cloud
- [ ] Ativar APIs necessárias
- [ ] Criar API Key com restrições
- [ ] Criar Service Account
- [ ] Configurar Fleet Engine Provider
- [ ] Instalar dependências npm
- [ ] Configurar variáveis de ambiente
- [ ] Deploy da Edge Function
- [ ] Testar autorização do motorista
- [ ] Testar captura de localização
- [ ] Testar visualização no mapa
- [ ] Testar cálculo de ETA
- [ ] Configurar alertas de billing
- [ ] Documentar para equipe

---

## 🎉 Conclusão

Com esta integração, o sistema Braticargas terá rastreamento em tempo real de nível enterprise, similar a Uber e iFood, proporcionando:

- **Melhor experiência** para clientes
- **Mais transparência** nas entregas
- **Redução de chamadas** de "onde está minha carga?"
- **Otimização de rotas** automática
- **Dados precisos** para análise

**Próximos passos sugeridos:**
1. Implementar notificações push quando veículo se aproxima
2. Adicionar histórico de rotas percorridas
3. Integrar com sistema de pagamento por km rodado
4. Criar relatórios de performance de motoristas

---

**Desenvolvido para Braticargas** 🚛
*Sistema de Rastreamento de Cargas em Tempo Real*
