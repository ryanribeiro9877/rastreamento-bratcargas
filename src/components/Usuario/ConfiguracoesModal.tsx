// components/Usuario/ConfiguracoesModal.tsx - Modal de Configurações

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface ConfiguracoesModalProps {
  onClose: () => void;
}

export default function ConfiguracoesModal({ onClose }: ConfiguracoesModalProps) {
  const isDark = false; // Tema fixo claro
  const { profile, user } = useAuth();
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleChangePassword() {
    setError('');
    setSuccess('');

    // Validações
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

      // Verificar senha atual fazendo login novamente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        setError('Senha atual incorreta. Não é possível alterar a senha sem saber a senha atual.');
        return;
      }

      // Atualizar senha
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale ${'bg-white'}`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between ${'bg-white border-gray-200'}`}>
          <h3 className={`text-2xl font-bold ${'text-gray-900'}`}>
            Configurações
          </h3>
          <button
            onClick={onClose}
            className={'text-gray-400 hover:text-gray-600'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Conta */}
          <div className="space-y-4">
            <h4 className={`text-lg font-semibold flex items-center gap-2 ${'text-gray-900'}`}>
              <svg className={`w-5 h-5 ${'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Conta
            </h4>

            <div className="rounded-lg p-4 space-y-3 bg-gray-50">
              <div>
                <label className={`block text-sm font-medium ${'text-gray-500'}`}>
                  E-mail
                </label>
                <p className={`font-medium ${'text-gray-900'}`}>
                  {user?.email || profile?.email || '—'}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${'text-gray-500'}`}>
                  Nome
                </label>
                <p className={`font-medium ${'text-gray-900'}`}>
                  {profile?.nome || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="space-y-4">
            <h4 className={`text-lg font-semibold flex items-center gap-2 ${'text-gray-900'}`}>
              <svg className={`w-5 h-5 ${'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Segurança
            </h4>

            <div className="rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${'text-gray-900'}`}>Senha</p>
                  <p className={`text-sm ${'text-gray-500'}`}>••••••••</p>
                </div>
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition text-[#009440] hover:text-[#007a35] hover:bg-green-50"
                >
                  {showChangePassword ? 'Cancelar' : 'Alterar Senha'}
                </button>
              </div>

              {/* Formulário de Alteração de Senha */}
              {showChangePassword && (
                <div className={`mt-4 pt-4 border-t space-y-4 border-gray-200`}>
                  {error && (
                    <div className={`p-3 border rounded-lg bg-gray-50 border-gray-200`}>
                      <p className={`text-sm text-[#009440]`}>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className={`p-3 border rounded-lg bg-white text-gray-900 border-gray-300`}>
                      <p className={`text-sm text-green-700`}>{success}</p>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                      Senha Atual *
                    </label>
                    <input
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#009440] border-gray-300"
                    />
                    <p className={`mt-1 text-xs ${'text-gray-500'}`}>
                      Para alterar a senha, é necessário informar a senha atual
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${'text-gray-700'}`}>
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
                    <label className={`block text-sm font-medium mb-1 ${'text-gray-700'}`}>
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
