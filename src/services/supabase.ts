// services/supabase.ts - Configuração do Supabase Client

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas!');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper para verificar se usuário está autenticado
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper para obter perfil do usuário
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('usuarios_embarcadores')
    .select(`
      *,
      embarcador:embarcadores(*)
    `)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }
  return data;
};

// Helper para logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export default supabase;
