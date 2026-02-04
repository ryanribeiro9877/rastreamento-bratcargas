// hooks/useAuth.ts - Hook de Autenticação

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '../services/supabase';
import type { UsuarioEmbarcador } from '../types';

interface AuthState {
  user: User | null;
  profile: UsuarioEmbarcador | null;
  loading: boolean;
  isCooperativa: boolean;
  isEmbarcador: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isCooperativa: false,
    isEmbarcador: false
  });

  useEffect(() => {
    let isMounted = true;

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Erro ao obter sessão:', error);
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false
        });
        return;
      }

      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false
        });
      }
    }).catch((err) => {
      console.error('Erro crítico ao obter sessão:', err);
      if (isMounted) {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false
        });
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserProfile(user: User) {
    try {
      // Verificar se é usuário da cooperativa (admin)
      const { data: adminCheck, error: adminError } = await supabase
        .from('usuarios_cooperativa')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminError) {
        console.error('Erro ao verificar cooperativa:', adminError);
      }

      if (adminCheck) {
        setAuthState({
          user,
          profile: null,
          loading: false,
          isCooperativa: true,
          isEmbarcador: false
        });
        return;
      }

      // Senão, é usuário de embarcador
      const profile = await getUserProfile(user.id);
      setAuthState({
        user,
        profile,
        loading: false,
        isCooperativa: false,
        isEmbarcador: Boolean(profile)
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setAuthState({
        user,
        profile: null,
        loading: false,
        isCooperativa: false,
        isEmbarcador: false
      });
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async function signUp(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }
      }
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword
  };
}
