// types/database.ts - Tipos do banco de dados Supabase

export interface Database {
  public: {
    Tables: {
      embarcadores: {
        Row: {
          id: string
          razao_social: string
          cnpj: string
          email_contato: string
          emails_alertas: string[]
          telefone: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj: string
          email_contato: string
          emails_alertas?: string[]
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string
          email_contato?: string
          emails_alertas?: string[]
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_embarcadores: {
        Row: {
          id: string
          embarcador_id: string
          user_id: string
          nome: string
          email: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          embarcador_id: string
          user_id: string
          nome: string
          email: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          embarcador_id?: string
          user_id?: string
          nome?: string
          email?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      cargas: {
        Row: {
          id: string
          embarcador_id: string
          nota_fiscal: string
          origem_cidade: string
          origem_uf: string
          origem_bairro: string | null
          origem_lat: number | null
          origem_lng: number | null
          destino_cidade: string
          destino_uf: string
          destino_bairro: string | null
          destino_lat: number | null
          destino_lng: number | null
          toneladas: number
          descricao: string | null
          data_carregamento: string
          prazo_entrega: string
          data_entrega_real: string | null
          status: string
          status_prazo: string | null
          motorista_nome: string | null
          motorista_telefone: string | null
          placa_veiculo: string | null
          link_rastreamento: string | null
          distancia_total_km: number | null
          velocidade_media_estimada: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          embarcador_id: string
          nota_fiscal: string
          origem_cidade: string
          origem_uf: string
          origem_bairro?: string | null
          origem_lat?: number | null
          origem_lng?: number | null
          destino_cidade: string
          destino_uf: string
          destino_bairro?: string | null
          destino_lat?: number | null
          destino_lng?: number | null
          toneladas: number
          descricao?: string | null
          data_carregamento: string
          prazo_entrega: string
          data_entrega_real?: string | null
          status?: string
          status_prazo?: string | null
          motorista_nome?: string | null
          motorista_telefone?: string | null
          placa_veiculo?: string | null
          link_rastreamento?: string | null
          distancia_total_km?: number | null
          velocidade_media_estimada?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          embarcador_id?: string
          nota_fiscal?: string
          origem_cidade?: string
          origem_uf?: string
          origem_bairro?: string | null
          origem_lat?: number | null
          origem_lng?: number | null
          destino_cidade?: string
          destino_uf?: string
          destino_bairro?: string | null
          destino_lat?: number | null
          destino_lng?: number | null
          toneladas?: number
          descricao?: string | null
          data_carregamento?: string
          prazo_entrega?: string
          data_entrega_real?: string | null
          status?: string
          status_prazo?: string | null
          motorista_nome?: string | null
          motorista_telefone?: string | null
          placa_veiculo?: string | null
          link_rastreamento?: string | null
          distancia_total_km?: number | null
          velocidade_media_estimada?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posicoes_gps: {
        Row: {
          id: string
          carga_id: string
          latitude: number
          longitude: number
          velocidade: number | null
          timestamp: string
          precisao_metros: number | null
          origem: string
        }
        Insert: {
          id?: string
          carga_id: string
          latitude: number
          longitude: number
          velocidade?: number | null
          timestamp?: string
          precisao_metros?: number | null
          origem?: string
        }
        Update: {
          id?: string
          carga_id?: string
          latitude?: number
          longitude?: number
          velocidade?: number | null
          timestamp?: string
          precisao_metros?: number | null
          origem?: string
        }
        Relationships: []
      }
      alertas: {
        Row: {
          id: string
          carga_id: string
          tipo: string
          destinatario: string
          emails_enviados: string[]
          mensagem: string
          enviado: boolean
          enviado_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          carga_id: string
          tipo: string
          destinatario: string
          emails_enviados?: string[]
          mensagem: string
          enviado?: boolean
          enviado_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          carga_id?: string
          tipo?: string
          destinatario?: string
          emails_enviados?: string[]
          mensagem?: string
          enviado?: boolean
          enviado_em?: string | null
          created_at?: string
        }
        Relationships: []
      }
      historico_status: {
        Row: {
          id: string
          carga_id: string
          status_anterior: string | null
          status_novo: string
          observacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          carga_id: string
          status_anterior?: string | null
          status_novo: string
          observacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          carga_id?: string
          status_anterior?: string | null
          status_novo?: string
          observacao?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
