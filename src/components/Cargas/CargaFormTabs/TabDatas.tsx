// components/Cargas/CargaFormTabs/TabDatas.tsx

import type { TabProps } from './types';

interface TabDatasProps extends TabProps {
  prazoEntregaMax: string;
  error: string;
  setError: (v: string) => void;
}

export default function TabDatas({
  formData,
  handleChange,
}: TabDatasProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900">Datas</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data de saída *</label>
          <input
            type="datetime-local"
            value={formData.data_carregamento}
            onChange={(e) => handleChange('data_carregamento', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estimativa de entrega *</label>
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
  );
}
