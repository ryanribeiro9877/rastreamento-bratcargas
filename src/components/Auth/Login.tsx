// components/Auth/Login.tsx - Componente de Login

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Função para traduzir mensagens de erro do Supabase
function traduzirErro(mensagem: string): string {
  const traducoes: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha inválidos',
    'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
    'User not found': 'Usuário não encontrado',
    'Invalid email or password': 'Email ou senha inválidos',
    'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'Network request failed': 'Erro de conexão. Verifique sua internet.',
    'User already registered': 'Este email já está cadastrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Email rate limit exceeded': 'Limite de envio de emails excedido. Tente novamente mais tarde.',
    'For security purposes, you can only request this once every 60 seconds': 'Por segurança, aguarde 60 segundos antes de tentar novamente.',
  };

  for (const [ingles, portugues] of Object.entries(traducoes)) {
    if (mensagem.toLowerCase().includes(ingles.toLowerCase())) {
      return portugues;
    }
  }
  
  return mensagem;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const erro = searchParams.get('erro');
    if (erro === 'sem_permissao') {
      setError('Seu usuário não tem permissão de acesso. Entre em contato com a cooperativa.');
      // Limpar o parâmetro da URL para não persistir o erro
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(traduzirErro(err.message || 'Erro ao fazer login. Verifique suas credenciais.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email) {
      setError('Digite seu email para recuperar a senha');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await resetPassword(email);
      alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowResetPassword(false);
    } catch (err: any) {
      console.error('Erro ao recuperar senha:', err);
      setError(traduzirErro(err.message || 'Erro ao enviar email de recuperação.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#009440] to-[#061735] flex items-center justify-center p-4">
      <style>{`
        @keyframes loginEntrance {
          0% { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-login-entrance {
          animation: loginEntrance 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-login-entrance">
        {/* Header */}
        <div className="bg-[#061735] p-8 text-white">
          <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@1,900&display=swap" rel="stylesheet" />
          <div className="flex flex-col items-center justify-center">
            <img 
              src="https://eytxgejxpsuotnbmvxao.supabase.co/storage/v1/object/public/assets/logotitulo.png" 
              alt="BratCargas Logo" 
              className="h-32 object-contain"
            />
            <h1 
              className="text-3xl text-white mt-2 tracking-wide"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontStyle: 'italic' }}
            >
              BRATCargas
            </h1>
            <p className="text-center text-gray-300 mt-1">Sistema de Rastreamento</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          {!showResetPassword ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="seu@email.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009440] focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#009440] hover:bg-[#007a35] text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-[#009440] hover:text-[#007a35] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recuperar Senha</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Digite seu email para receber um link de recuperação
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009440] focus:border-transparent outline-none transition"
                  placeholder="seu@email.com"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#009440] hover:bg-[#007a35] text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError('');
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            © 2025 BratCargas. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
