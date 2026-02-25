// components/Cargas/CargaFormTabs/TabMotorista.tsx

import { useRef } from 'react';
import type { CargaFormData } from '../../../types';
import type { TabProps } from './types';
import { formatarDDD, formatarCelular, somenteDigitos } from './types';

export interface Motorista {
  id: string;
  nome: string;
  telefone?: string;
  telefone_whatsapp?: string;
  placa_veiculo?: string;
  veiculo_marca?: string;
  veiculo_modelo?: string;
  veiculo_cor?: string;
  veiculo_ano?: string;
  veiculo_ano_modelo?: string;
  veiculo_importado?: string;
  veiculo_cilindrada?: string;
  veiculo_potencia?: string;
  veiculo_combustivel?: string;
  veiculo_chassi?: string;
  veiculo_motor?: string;
  veiculo_uf?: string;
  veiculo_municipio?: string;
}

interface TabMotoristaProps extends TabProps {
  telefone1Ddd: string;
  setTelefone1Ddd: (v: string) => void;
  telefone1Numero: string;
  setTelefone1Numero: (v: string) => void;
  telefone1EhWhatsapp: boolean;
  setTelefone1EhWhatsapp: (v: boolean) => void;
  telefoneWhatsappDdd: string;
  setTelefoneWhatsappDdd: (v: string) => void;
  telefoneWhatsappNumero: string;
  setTelefoneWhatsappNumero: (v: string) => void;
  motoristas: Motorista[];
  onSelectMotorista: (motorista: Motorista | null) => void;
  setFormData: React.Dispatch<React.SetStateAction<CargaFormData>>;
}

export default function TabMotorista({
  formData,
  handleChange,
  telefone1Ddd,
  setTelefone1Ddd,
  telefone1Numero,
  setTelefone1Numero,
  telefone1EhWhatsapp,
  setTelefone1EhWhatsapp,
  telefoneWhatsappDdd,
  setTelefoneWhatsappDdd,
  telefoneWhatsappNumero,
  setTelefoneWhatsappNumero,
  motoristas,
  onSelectMotorista,
  setFormData,
}: TabMotoristaProps) {
  const telefone1NumeroRef = useRef<HTMLInputElement>(null);
  const telefoneWhatsappNumeroRef = useRef<HTMLInputElement>(null);

  function handleDddChange(
    valor: string,
    setter: (v: string) => void,
    nextFieldRef?: React.RefObject<HTMLInputElement>
  ) {
    const digits = somenteDigitos(valor).slice(0, 2);
    setter(digits);
    if (digits.length === 2 && nextFieldRef?.current) {
      nextFieldRef.current.focus();
    }
  }

  function handleTelefoneChange(valor: string, setter: (v: string) => void) {
    const digits = somenteDigitos(valor).slice(0, 9);
    setter(digits);
  }

  function handleSelectMotorista(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) {
      onSelectMotorista(null);
      return;
    }
    const mot = motoristas.find(m => m.id === id);
    if (!mot) return;
    onSelectMotorista(mot);

    // Preencher dados do motorista
    handleChange('motorista_nome', mot.nome || '');

    // Preencher telefone (formato: DDD + número)
    const tel = (mot.telefone_whatsapp || mot.telefone || '').replace(/\D/g, '');
    if (tel.length >= 11) {
      setTelefone1Ddd(tel.slice(0, 2));
      setTelefone1Numero(tel.slice(2));
      setTelefone1EhWhatsapp(!!mot.telefone_whatsapp);
    } else if (tel.length >= 9) {
      setTelefone1Ddd('');
      setTelefone1Numero(tel);
    }

    // Preencher dados do veículo
    setFormData(prev => ({
      ...prev,
      motorista_nome: mot.nome || '',
      placa_veiculo: mot.placa_veiculo || '',
      veiculo_marca: mot.veiculo_marca || '',
      veiculo_modelo: mot.veiculo_modelo || '',
      veiculo_cor: mot.veiculo_cor || '',
      veiculo_ano: mot.veiculo_ano || '',
      veiculo_ano_modelo: mot.veiculo_ano_modelo || '',
      veiculo_importado: mot.veiculo_importado || '',
      veiculo_cilindrada: mot.veiculo_cilindrada || '',
      veiculo_potencia: mot.veiculo_potencia || '',
      veiculo_combustivel: mot.veiculo_combustivel || '',
      veiculo_chassi: mot.veiculo_chassi || '',
      veiculo_motor: mot.veiculo_motor || '',
      veiculo_uf: mot.veiculo_uf || '',
      veiculo_municipio: mot.veiculo_municipio || '',
    }));
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900">Motorista</h3>

      {motoristas.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar motorista existente
          </label>
          <select
            onChange={handleSelectMotorista}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            defaultValue=""
          >
            <option value="">-- Novo motorista --</option>
            {motoristas.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome}{m.placa_veiculo ? ` — ${m.placa_veiculo}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Selecione um motorista já cadastrado ou preencha manualmente abaixo</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome do motorista
        </label>
        <input
          type="text"
          value={formData.motorista_nome}
          onChange={(e) => handleChange('motorista_nome', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ex: João Silva"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Telefone
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">DDD</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatarDDD(telefone1Ddd)}
              onChange={(e) => handleDddChange(e.target.value, setTelefone1Ddd, telefone1NumeroRef)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Número (9 dígitos)</label>
            <input
              ref={telefone1NumeroRef}
              type="text"
              inputMode="numeric"
              value={formatarCelular(telefone1Numero)}
              onChange={(e) => handleTelefoneChange(e.target.value, setTelefone1Numero)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="9xxxx-xxxx"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={telefone1EhWhatsapp}
            onChange={(e) => setTelefone1EhWhatsapp(e.target.checked)}
          />
          Este número é WhatsApp
        </label>

        {!telefone1EhWhatsapp && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Telefone com WhatsApp</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DDD</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatarDDD(telefoneWhatsappDdd)}
                  onChange={(e) => handleDddChange(e.target.value, setTelefoneWhatsappDdd, telefoneWhatsappNumeroRef)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Número (9 dígitos)</label>
                <input
                  ref={telefoneWhatsappNumeroRef}
                  type="text"
                  inputMode="numeric"
                  value={formatarCelular(telefoneWhatsappNumero)}
                  onChange={(e) => handleTelefoneChange(e.target.value, setTelefoneWhatsappNumero)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="9xxxx-xxxx"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
