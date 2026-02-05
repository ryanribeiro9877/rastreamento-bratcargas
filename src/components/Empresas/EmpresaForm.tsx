// components/Empresas/EmpresaForm.tsx - Formulário de Cadastro de Empresa (Embarcador)

import { useState } from 'react';
import { buscarEnderecoPorCep, formatarCep } from '../../services/viaCep';

interface EmpresaFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EmpresaFormData {
  razao_social: string;
  cnpj: string;
  email_contato: string;
  telefone: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export default function EmpresaForm({ onSuccess, onCancel }: EmpresaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [formData, setFormData] = useState<EmpresaFormData>({
    razao_social: '',
    cnpj: '',
    email_contato: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  function handleChange(field: keyof EmpresaFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function formatarCnpj(valor: string): string {
    const digits = valor.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function handleCnpjChange(valor: string) {
    const digits = valor.replace(/\D/g, '').slice(0, 14);
    handleChange('cnpj', digits);
  }

  function formatarTelefone(valor: string): string {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function handleTelefoneChange(valor: string) {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    handleChange('telefone', digits);
  }

  async function handleCepChange(valor: string) {
    const cepLimpo = valor.replace(/\D/g, '').slice(0, 8);
    handleChange('cep', cepLimpo);

    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      const endereco = await buscarEnderecoPorCep(cepLimpo);
      setBuscandoCep(false);

      if (endereco) {
        setFormData(prev => ({
          ...prev,
          logradouro: endereco.logradouro,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          uf: endereco.uf
        }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Validações
      if (!formData.razao_social.trim()) {
        throw new Error('Razão Social é obrigatória');
      }
      if (!formData.cnpj || formData.cnpj.length !== 14) {
        throw new Error('CNPJ inválido');
      }
      if (!formData.email_contato.trim()) {
        throw new Error('E-mail de contato é obrigatório');
      }

      console.log('Iniciando cadastro...');
      
      // Chamar Edge Function para criar empresa e usuário
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario-empresa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            razao_social: formData.razao_social.trim(),
            cnpj: formData.cnpj,
            email_contato: formData.email_contato.trim(),
            telefone: formData.telefone || null,
          }),
        }
      );

      const functionData = await response.json();
      console.log('Resposta:', functionData);

      if (!response.ok || functionData?.error) {
        throw new Error(functionData?.error || 'Erro ao cadastrar empresa');
      }

      console.log('Empresa cadastrada com sucesso:', functionData);
      
      // Mostrar senha para o usuário
      const mensagem = functionData.emailEnviado
        ? `Empresa cadastrada com sucesso!\n\nUm e-mail foi enviado para ${formData.email_contato} com as credenciais de acesso.`
        : `Empresa cadastrada com sucesso!\n\nCredenciais de acesso:\nE-mail: ${formData.email_contato}\nSenha: ${functionData.senhaGerada}\n\n⚠️ Anote a senha e repasse ao cliente!`;
      
      alert(mensagem);
      onSuccess?.();
    } catch (err) {
      console.error('Erro ao cadastrar empresa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar empresa');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Nova Empresa</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razão Social *
          </label>
          <input
            type="text"
            value={formData.razao_social}
            onChange={(e) => handleChange('razao_social', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Empresa XYZ Ltda"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ *
            </label>
            <input
              type="text"
              value={formatarCnpj(formData.cnpj)}
              onChange={(e) => handleCnpjChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00.000.000/0000-00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="text"
              value={formatarTelefone(formData.telefone)}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-mail de Contato *
          </label>
          <input
            type="email"
            value={formData.email_contato}
            onChange={(e) => handleChange('email_contato', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="contato@empresa.com.br"
            required
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Endereço *</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CEP *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatarCep(formData.cep || '')}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00000-000"
                  maxLength={9}
                />
                {buscandoCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
              <input
                type="text"
                value={formData.logradouro || ''}
                onChange={(e) => handleChange('logradouro', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                placeholder="Preenchido automaticamente"
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
              <input
                type="text"
                value={formData.numero || ''}
                onChange={(e) => handleChange('numero', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nº"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Preenchido automaticamente"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
              <input
                type="text"
                value={formData.cidade || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Preenchido automaticamente"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">UF</label>
              <input
                type="text"
                value={formData.uf || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="UF"
                readOnly
              />
            </div>
          </div>
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
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
        </button>
      </div>
    </form>
  );
}
