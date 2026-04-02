// hooks/useAuth.ts - Hook de Autenticação com Context

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '../services/supabase';
import type { UsuarioEmbarcador } from '../types';

interface AuthState {
  user: User | null;
  profile: UsuarioEmbarcador | null;
  loading: boolean;
  isCooperativa: boolean;
  isEmbarcador: boolean;
  isPrincipal: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signUp: (email: string, password: string, nome: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isCooperativa: false,
    isEmbarcador: false,
    isPrincipal: false
  });

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    // Timeout de segurança: se após 15s ainda estiver loading, força parar
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Timeout de segurança: forçando fim do loading');
        setAuthState(prev => prev.loading ? { ...prev, loading: false } : prev);
      }
    }, 15000);

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      initialSessionHandled = true;
      
      if (error) {
        console.error('Erro ao obter sessão:', error);
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false,
          isPrincipal: false
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
          isEmbarcador: false,
          isPrincipal: false
        });
      }
    }).catch((err) => {
      console.error('Erro crítico ao obter sessão:', err);
      initialSessionHandled = true;
      if (isMounted) {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false,
          isPrincipal: false
        });
      }
    });

    // Escutar mudanças de autenticação (ignora evento inicial pois getSession já trata)
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignorar o evento INITIAL_SESSION pois getSession já cuida disso
      if (event === 'INITIAL_SESSION') return;
      
      // Aguardar getSession terminar antes de processar outros eventos
      if (!initialSessionHandled) return;

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          isCooperativa: false,
          isEmbarcador: false,
          isPrincipal: false
        });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserProfile(user: User) {
    try {
      // Verificar se é usuário da cooperativa (admin)
      const { data: adminCheck, error: adminError } = await supabase
        .from('usuarios_cooperativa')
        .select('id, is_principal')
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
          isEmbarcador: false,
          isPrincipal: adminCheck.is_principal === true
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
        isEmbarcador: Boolean(profile),
        isPrincipal: false
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setAuthState({
        user,
        profile: null,
        loading: false,
        isCooperativa: false,
        isEmbarcador: false,
        isPrincipal: false
      });
    }
  }

  async function signIn(email: string, password: string, captchaToken?: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined
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
    // VULN-012: Invalidar todas as sessões (global) ao fazer logout
    // Limpar localStorage primeiro para evitar travamento do supabase.auth.signOut
    try {
      const authKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
      if (authKey) localStorage.removeItem(authKey);
    } catch { /* ignore */ }
    // Tentar signOut com timeout para não travar
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      await Promise.race([supabase.auth.signOut({ scope: 'global' }), timeoutPromise]);
    } catch { /* ignore timeout or errors */ }
    // Forçar redirecionamento para login
    window.location.replace('/login');
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

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
