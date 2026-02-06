// types/index.ts - Tipos TypeScript do Sistema de Rastreamento BratCargas

export type StatusCarga = 'aguardando' | 'em_transito' | 'entregue' | 'cancelada' | 'aguardando_data';
export type StatusPrazo = 'no_prazo' | 'atrasado' | 'adiantado' | 'aguardando_data';
export type TipoAlerta = 'entrega' | 'atraso' | 'adiantamento';
export type DestinatarioAlerta = 'embarcador' | 'cooperativa';

export interface Embarcador {
  id: string;
  razao_social: string;
  cnpj: string;
  email_contato: string;
  emails_alertas: string[];
  telefone?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioEmbarcador {
  id: string;
  embarcador_id: string;
  user_id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  embarcador?: Embarcador;
}

export interface Carga {
  id: string;
  embarcador_id: string;
  nota_fiscal: string;
  
  // Origem
  origem_cidade: string;
  origem_uf: string;
  origem_bairro?: string;
  origem_lat: number;
  origem_lng: number;
  
  // Destino
  destino_cidade: string;
  destino_uf: string;
  destino_bairro?: string;
  destino_lat: number;
  destino_lng: number;
  
  // Dados da carga
  toneladas: number;
  descricao?: string;
  
  // Prazos
  data_carregamento: string;
  prazo_entrega: string;
  data_entrega_real?: string;
  
  // Status
  status: StatusCarga;
  status_prazo: StatusPrazo;
  
  // Motorista
  motorista_nome?: string;
  motorista_telefone?: string;
  placa_veiculo?: string;
  link_rastreamento?: string;
  
  // Métricas
  distancia_total_km: number;
  velocidade_media_estimada: number;
  
  ativo: boolean;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos
  embarcador?: Embarcador;
  posicoes?: PosicaoGPS[];
  ultima_posicao?: PosicaoGPS;
}

export interface PosicaoGPS {
  id: string;
  carga_id: string;
  latitude: number;
  longitude: number;
  velocidade?: number;
  timestamp: string;
  precisao_metros?: number;
  origem: 'api_rastreamento' | 'manual';
}

export interface Alerta {
  id: string;
  carga_id: string;
  tipo: TipoAlerta;
  destinatario: DestinatarioAlerta;
  emails_enviados: string[];
  mensagem: string;
  enviado: boolean;
  enviado_em?: string;
  created_at: string;
  carga?: Carga;
}

export interface HistoricoStatus {
  id: string;
  carga_id: string;
  status_anterior?: string;
  status_novo: string;
  observacao?: string;
  created_at: string;
}

// Tipos para formulários
export interface CargaFormData {
  nota_fiscal: string;
  embarcador_id: string;
  
  origem_cep?: string;
  origem_cidade: string;
  origem_uf: string;
  origem_bairro?: string;
  origem_logradouro?: string;
  origem_numero?: string;
  origem_sem_numero?: boolean;
  origem_lat?: number;
  origem_lng?: number;
  
  destino_cep?: string;
  destino_cidade: string;
  destino_uf: string;
  destino_bairro?: string;
  destino_logradouro?: string;
  destino_numero?: string;
  destino_sem_numero?: boolean;
  destino_lat?: number;
  destino_lng?: number;
  
  toneladas: number;
  descricao?: string;
  
  data_carregamento: string;
  prazo_entrega: string;
  
  motorista_nome?: string;
  motorista_telefone?: string;
  placa_veiculo?: string;
  
  velocidade_media_estimada?: number;
}

// Tipos para filtros
export interface FiltrosCargas {
  embarcador_id?: string;
  status?: StatusCarga[];
  status_prazo?: StatusPrazo[];
  data_carregamento_inicio?: string;
  data_carregamento_fim?: string;
  prazo_entrega_inicio?: string;
  prazo_entrega_fim?: string;
  nota_fiscal?: string;
  origem_uf?: string;
  destino_uf?: string;
  motorista_nome?: string;
  placa_veiculo?: string;
}

// Tipos para métricas do dashboard
export interface MetricasDashboard {
  total_cargas: number;
  cargas_aguardando: number;
  cargas_em_transito: number;
  cargas_entregues: number;
  cargas_no_prazo: number;
  cargas_atrasadas: number;
  cargas_adiantadas: number;
  total_toneladas_transporte: number;
  total_toneladas_entregues: number;
  percentual_entrega_prazo: number;
  percentual_entrega_adiantada: number;
  percentual_entrega_atrasada: number;
}

// Tipo para autenticação
export interface UserProfile {
  user_id: string;
  email: string;
  nome: string;
  tipo_usuario: 'embarcador' | 'cooperativa' | 'admin';
  embarcador_id?: string;
  permissoes: string[];
}

// Tipo para configuração da API de rastreamento
export interface ConfigRastreamento {
  api_url: string;
  api_key: string;
  intervalo_atualizacao_minutos: number;
  precisao_minima_metros: number;
}
