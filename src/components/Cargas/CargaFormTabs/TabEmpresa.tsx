// components/Cargas/CargaFormTabs/TabEmpresa.tsx

import type { TabProps } from './types';

interface TabEmpresaProps extends TabProps {
  embarcadorId?: string;
  embarcadores: Array<{ id: string; razao_social: string }>;
  tipoCarga: string;
  setTipoCarga: (v: string) => void;
}

export default function TabEmpresa({
  formData,
  handleChange,
  embarcadorId,
  embarcadores,
  tipoCarga,
  setTipoCarga,
}: TabEmpresaProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900">Empresa e carga</h3>

      {!embarcadorId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da empresa
          </label>
          <select
            value={formData.embarcador_id}
            onChange={(e) => handleChange('embarcador_id', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione</option>
            {embarcadores.map((e) => (
              <option key={e.id} value={e.id}>{e.razao_social}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nota fiscal
          </label>
          <input
            type="text"
            value={formData.nota_fiscal}
            onChange={(e) => handleChange('nota_fiscal', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: 12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de carga
          </label>
          <select
            value={tipoCarga}
            onChange={(e) => setTipoCarga(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Carga Geral">Carga Geral</option>
            <option value="Grãos">Grãos</option>
            <option value="Frigorificada">Frigorificada</option>
            <option value="Perecíveis">Perecíveis</option>
            <option value="Químicos">Químicos</option>
            <option value="Construção">Construção</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Toneladas *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.toneladas || ''}
            onChange={(e) => { const v = parseFloat(e.target.value); handleChange('toneladas', Number.isFinite(v) ? v : 0); }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: 25.5"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={formData.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Observações"
          />
        </div>
      </div>
    </div>
  );
}
