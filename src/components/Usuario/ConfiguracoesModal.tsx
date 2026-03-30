// components/Usuario/ConfiguracoesModal.tsx - Modal de Configurações

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface UsuarioMaster {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  is_principal: boolean;
  created_at: string;
}

interface ConfiguracoesModalProps {
  onClose: () => void;
}

export default function ConfiguracoesModal({ onClose }: ConfiguracoesModalProps) {
  const { profile, user, isCooperativa, isPrincipal } = useAuth();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado para criação de usuários master
  const [showCriarMaster, setShowCriarMaster] = useState(false);
  const [masterNome, setMasterNome] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [masterSuccess, setMasterSuccess] = useState('');
  const [usuariosMaster, setUsuariosMaster] = useState<UsuarioMaster[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Carregar lista de usuários master quando é o principal
  useEffect(() => {
    if (isCooperativa && isPrincipal) {
      carregarUsuariosMaster();
    }
  }, [isCooperativa, isPrincipal]);

  async function carregarUsuariosMaster() {
    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from('usuarios_cooperativa')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsuariosMaster(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários master:', err);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function handleChangePassword() {
    setError('');
    setSuccess('');

    if (!senhaAtual) {
      setError('Digite a senha atual');
      return;
    }

    if (!novaSenha) {
      setError('Digite a nova senha');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        setError('Senha atual incorreta. Não é possível alterar a senha sem saber a senha atual.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setShowChangePassword(false);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarMaster() {
    setMasterError('');
    setMasterSuccess('');

    if (!masterNome.trim()) {
      setMasterError('Digite o nome do usuário');
      return;
    }

    if (!masterEmail.trim()) {
      setMasterError('Digite o email do usuário');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(masterEmail)) {
      setMasterError('Digite um email válido');
      return;
    }

    try {
      setMasterLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setMasterError('Sessão expirada. Faça login novamente.');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/criar-usuario-master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          nome: masterNome.trim(),
          email: masterEmail.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMasterError(result.error || 'Erro ao criar usuário master');
        return;
      }

      setMasterSuccess(
        result.emailEnviado
          ? `Usuário master "${masterNome}" criado com sucesso! As credenciais foram enviadas para ${masterEmail}.`
          : `Usuário master "${masterNome}" criado com sucesso! Não foi possível enviar o email com as credenciais automaticamente.`
      );
      setMasterNome('');
      setMasterEmail('');
      setShowCriarMaster(false);
      carregarUsuariosMaster();
    } catch (err) {
      console.error('Erro ao criar usuário master:', err);
      setMasterError('Erro ao criar usuário master. Tente novamente.');
    } finally {
      setMasterLoading(false);
    }
  }

  async function handleToggleAtivoMaster(usuario: UsuarioMaster) {
    if (usuario.is_principal) return;

    try {
      const { error } = await supabase
        .from('usuarios_cooperativa')
        .update({ ativo: !usuario.ativo })
        .eq('id', usuario.id);

      if (error) throw error;
      carregarUsuariosMaster();
    } catch (err) {
      console.error('Erro ao alterar status do usuário:', err);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale bg-white`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between bg-white border-gray-200`}>
          <h3 className="text-2xl font-bold text-gray-900">
            Configurações
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Conta */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Conta
            </h4>

            <div className="rounded-lg p-4 space-y-3 bg-gray-50">
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  E-mail
                </label>
                <p className="font-medium text-gray-900">
                  {user?.email || profile?.email || '—'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Nome
                </label>
                <p className="font-medium text-gray-900">
                  {profile?.nome || '—'}
                </p>
              </div>

              {isCooperativa && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Tipo de Acesso
                  </label>
                  <p className="font-medium text-gray-900">
                    {isPrincipal ? 'Master Principal' : 'Master'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Segurança */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Segurança
            </h4>

            <div className="rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Senha</p>
                  <p className="text-sm text-gray-500">••••••••</p>
                </div>
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition text-[#009440] hover:text-[#007a35] hover:bg-green-50"
                >
                  {showChangePassword ? 'Cancelar' : 'Alterar Senha'}
                </button>
              </div>

              {showChangePassword && (
                <div className="mt-4 pt-4 border-t space-y-4 border-gray-200">
                  {error && (
                    <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                      <p className="text-sm text-green-700">{success}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Senha Atual *
                    </label>
                    <input
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#009440] border-gray-300"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Para alterar a senha, é necessário informar a senha atual
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Nova Senha *
                    </label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Digite a nova senha"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#009440] border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Confirmar Nova Senha *
                    </label>
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#009440] border-gray-300"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gerenciamento de Usuários Master — apenas para o master principal */}
          {isCooperativa && isPrincipal && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Usuários Master
              </h4>

              {/* Lista de usuários master */}
              <div className="rounded-lg bg-gray-50 overflow-hidden">
                {loadingUsuarios ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Carregando usuários...
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {usuariosMaster.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${u.is_principal ? 'bg-blue-600' : 'bg-gray-500'}`}>
                            {u.nome?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {u.nome || u.email}
                              </p>
                              {u.is_principal && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.is_principal ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Ativo
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleAtivoMaster(u)}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                                u.ativo
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão para criar novo master */}
              {!showCriarMaster ? (
                <button
                  onClick={() => setShowCriarMaster(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Criar Novo Usuário Master
                </button>
              ) : (
                <div className="rounded-lg border border-gray-200 p-4 space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-900">Novo Usuário Master</h5>
                    <button
                      onClick={() => {
                        setShowCriarMaster(false);
                        setMasterNome('');
                        setMasterEmail('');
                        setMasterError('');
                        setMasterSuccess('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {masterError && (
                    <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                      <p className="text-sm text-red-600">{masterError}</p>
                    </div>
                  )}

                  {masterSuccess && (
                    <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                      <p className="text-sm text-green-700">{masterSuccess}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={masterNome}
                      onChange={(e) => setMasterNome(e.target.value)}
                      placeholder="Nome do usuário"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={masterEmail}
                      onChange={(e) => setMasterEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 border-gray-300"
                    />
                  </div>

                  <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                    <p className="text-xs text-blue-700">
                      Uma senha será gerada automaticamente e enviada por e-mail para o novo usuário.
                      Ele terá acesso completo ao sistema, exceto a criação de novos masters.
                    </p>
                  </div>

                  <button
                    onClick={handleCriarMaster}
                    disabled={masterLoading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                  >
                    {masterLoading ? 'Criando...' : 'Criar Usuário Master'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Informação sobre alteração de senha */}
          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <div className="flex gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Importante
                </p>
                <p className="text-sm mt-1 text-yellow-700">
                  Para sua segurança, a alteração de senha só é permitida se você souber a senha atual.
                  Caso tenha esquecido, entre em contato com a cooperativa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
