import { useState } from 'react';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

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

export default function UsuarioMasterForm({ onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      if (!nome.trim()) throw new Error('Nome é obrigatório');
      if (!email.trim()) throw new Error('E-mail é obrigatório');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido');

      const accessToken = getAccessTokenSync();
      if (!accessToken) throw new Error('Sessão expirada. Faça logout e login novamente.');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario-master`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ nome: nome.trim(), email: email.trim().toLowerCase() }),
        }
      );
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Erro ao cadastrar');

      alert(
        data.emailEnviado
          ? `Usuário master cadastrado com sucesso!\n\nE-mail enviado para ${email} com as credenciais de acesso.`
          : `Usuário master cadastrado com sucesso!\n\n⚠️ Não foi possível enviar o e-mail automaticamente.`
      );
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Novo Usuário Master</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Nome do usuário"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="email@exemplo.com"
            required
          />
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
          <strong>Informação:</strong> Uma senha será gerada automaticamente e enviada para o e-mail informado.
          O novo usuário terá acesso master ao sistema, mas <strong>não poderá criar outros usuários master</strong>.
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar Usuário Master'}
        </button>
      </div>
    </form>
  );
}
