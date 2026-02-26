// hooks/useQueries.ts - Hooks com cache via TanStack Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

// Helper: obter token de sessão do localStorage (instantâneo, sem await)
function getAccessTokenSync(): string | null {
  try {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const token = getAccessTokenSync();
  if (!token) throw new Error('Usuário não autenticado');
  return {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`
  };
}

// ── Hook: Buscar embarcadores ──
export function useEmbarcadoresQuery() {
  return useQuery({
    queryKey: ['embarcadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarcadores')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000, // 1 minuto — embarcadores mudam raramente
  });
}

// ── Hook: Buscar posições GPS de uma carga ──
export function usePosicoes(cargaId: string | undefined) {
  return useQuery({
    queryKey: ['posicoes', cargaId],
    queryFn: async () => {
      if (!cargaId) return [];
      const { data, error } = await supabase
        .from('posicoes_gps')
        .select('*')
        .eq('carga_id', cargaId)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!cargaId,
    staleTime: 5 * 1000, // 5s — posições GPS precisam ser recentes
  });
}

// ── Hook: Buscar usuários da cooperativa (tabela fora do schema tipado) ──
export function useUsuariosCooperativa() {
  return useQuery({
    queryKey: ['usuarios_cooperativa'],
    queryFn: async () => {
      const headers = getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/rest/v1/usuarios_cooperativa?select=*`, { headers });
      if (!res.ok) throw new Error('Erro ao buscar usuários cooperativa');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

// ── Hook: Buscar motoristas (tabela fora do schema tipado) ──
export function useMotoristasQuery() {
  return useQuery({
    queryKey: ['motoristas'],
    queryFn: async () => {
      const headers = getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/rest/v1/motoristas?select=*&order=nome`, { headers });
      if (!res.ok) throw new Error('Erro ao buscar motoristas');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

// ── Mutation: Criar carga (invalida cache automaticamente) ──
export function useCreateCarga() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (novaCarga: any) => {
      const { data, error } = await supabase
        .from('cargas')
        .insert(novaCarga)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
    },
  });
}

// ── Mutation: Atualizar carga ──
export function useUpdateCarga() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const headers = getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao atualizar carga: ${response.status} - ${errBody}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas'] });
      queryClient.invalidateQueries({ queryKey: ['metricas'] });
    },
  });
}
