// components/Cargas/CargaForm.tsx - Formulário de Cadastro de Carga

import { useState, useEffect } from 'react';
import { useCargas } from '../../hooks/useCargas';
import { rastreamentoService } from '../../services/rastreamento';
import type { CargaFormData } from '../../types';
import { UFS } from '../../utils/formatters';

interface CargaFormProps {
  embarcadorId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CargaForm({ embarcadorId, onSuccess, onCancel }: CargaFormProps) {
  const { criarCarga } = useCargas();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<CargaFormData>({
    nota_fiscal: '',
    embarcador_id: embarcadorId || '',
    origem_cidade: '',
    origem_uf: '',
    destino_cidade: '',
    destino_uf: '',
    toneladas: 0,
    descricao: '',
    data_carregamento: '',
    prazo_entrega: '',
    motorista_nome: '',
    motorista_telefone: '',
    placa_veiculo: '',
    velocidade_media_estimada: 60
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Validações básicas
      if (!formData.nota_fiscal || !formData.origem_cidade || !formData.destino_cidade) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Criar carga
      const carga = await criarCarga(formData);

      // Se tem telefone do motorista, gerar link de rastreamento
      if (formData.motorista_telefone) {
        await rastreamentoService.gerarLinkRastreamento(
          carga.id,
          formData.motorista_telefone
        );
      }

      alert('Carga cadastrada com sucesso!');
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao criar carga:', err);
      setError(err.message || 'Erro ao cadastrar carga');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof CargaFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cadastrar Nova Carga</h2>
        <p className="text-sm text-gray-500 mt-1">Preencha as informações da carga para iniciar o rastreamento</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Informações da Carga */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Informações da Carga</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota Fiscal *
            </label>
            <input
              type="text"
              value={formData.nota_fiscal}
              onChange={(e) => handleChange('nota_fiscal', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 12345"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Toneladas *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.toneladas}
              onChange={(e) => handleChange('toneladas', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 25.5"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição da Carga
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Paletes de materiais de construção"
            rows={3}
          />
        </div>
      </div>

      {/* Origem */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Origem</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade *
            </label>
            <input
              type="text"
              value={formData.origem_cidade}
              onChange={(e) => handleChange('origem_cidade', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: São Paulo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UF *
            </label>
            <select
              value={formData.origem_uf}
              onChange={(e) => handleChange('origem_uf', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione</option>
              {UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Destino */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Destino</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade *
            </label>
            <input
              type="text"
              value={formData.destino_cidade}
              onChange={(e) => handleChange('destino_cidade', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Rio de Janeiro"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UF *
            </label>
            <select
              value={formData.destino_uf}
              onChange={(e) => handleChange('destino_uf', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione</option>
              {UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prazos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Prazos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data/Hora de Carregamento *
            </label>
            <input
              type="datetime-local"
              value={formData.data_carregamento}
              onChange={(e) => handleChange('data_carregamento', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prazo de Entrega *
            </label>
            <input
              type="datetime-local"
              value={formData.prazo_entrega}
              onChange={(e) => handleChange('prazo_entrega', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      {/* Motorista e Veículo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Motorista e Veículo</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Motorista
            </label>
            <input
              type="text"
              value={formData.motorista_nome}
              onChange={(e) => handleChange('motorista_nome', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone (WhatsApp)
            </label>
            <input
              type="tel"
              value={formData.motorista_telefone}
              onChange={(e) => handleChange('motorista_telefone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 98765-4321"
            />
            <p className="text-xs text-gray-500 mt-1">
              Será enviado link de rastreamento via WhatsApp
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placa do Veículo
            </label>
            <input
              type="text"
              value={formData.placa_veiculo}
              onChange={(e) => handleChange('placa_veiculo', e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ABC-1234"
            />
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-4 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar Carga'}
        </button>
      </div>
    </form>
  );
}
