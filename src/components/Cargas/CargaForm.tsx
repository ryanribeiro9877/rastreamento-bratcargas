// components/Cargas/CargaForm.tsx - Formulário de Cadastro de Carga

import { useMemo, useState, useEffect, useRef } from 'react';
import { useCargas } from '../../hooks/useCargas';
import { rastreamentoService } from '../../services/rastreamento';
import { supabase } from '../../services/supabase';
import { geocodeCidadeUf } from '../../services/mapboxGeocoding';
import { buscarEnderecoPorCep, formatarCep } from '../../services/viaCep';
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
  const [activeTab, setActiveTab] = useState<'motorista' | 'empresa' | 'rota' | 'datas'>('motorista');
  const [tipoCarga, setTipoCarga] = useState('Carga Geral');
  const [embarcadores, setEmbarcadores] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [telefone1Ddd, setTelefone1Ddd] = useState('');
  const [telefone1Numero, setTelefone1Numero] = useState('');
  const [telefone1EhWhatsapp, setTelefone1EhWhatsapp] = useState(true);
  const [telefoneWhatsappDdd, setTelefoneWhatsappDdd] = useState('');
  const [telefoneWhatsappNumero, setTelefoneWhatsappNumero] = useState('');
  const [envioAssistido, setEnvioAssistido] = useState<null | {
    linkRastreamento: string;
    whatsappUrl: string;
    smsUrl: string;
  }>(null);

  // Refs para auto-foco dos campos de telefone
  const telefone1NumeroRef = useRef<HTMLInputElement>(null);
  const telefoneWhatsappNumeroRef = useRef<HTMLInputElement>(null);
  const origemNumeroRef = useRef<HTMLInputElement>(null);
  const destinoNumeroRef = useRef<HTMLInputElement>(null);

  // Estados para loading de busca de CEP
  const [buscandoCepOrigem, setBuscandoCepOrigem] = useState(false);
  const [buscandoCepDestino, setBuscandoCepDestino] = useState(false);
  
  const [formData, setFormData] = useState<CargaFormData>({
    nota_fiscal: '',
    embarcador_id: embarcadorId || '',
    origem_cidade: '',
    origem_uf: '',
    origem_bairro: '',
    destino_cidade: '',
    destino_uf: '',
    destino_bairro: '',
    toneladas: 0,
    descricao: '',
    data_carregamento: '',
    prazo_entrega: '',
    motorista_nome: '',
    motorista_telefone: '',
    placa_veiculo: '',
    velocidade_media_estimada: 60
  });

  const prazoEntregaMax = useMemo(() => {
    if (!formData.data_carregamento) return '';
    const base = new Date(formData.data_carregamento);
    if (Number.isNaN(base.getTime())) return '';
    const max = new Date(base);
    max.setDate(max.getDate() + 8);
    const yyyy = max.getFullYear();
    const mm = String(max.getMonth() + 1).padStart(2, '0');
    const dd = String(max.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T23:59`;
  }, [formData.data_carregamento]);

  useEffect(() => {
    async function carregarEmbarcadores() {
      try {
        console.log('Carregando embarcadores... embarcadorId:', embarcadorId);
        
        // Se já tem embarcadorId, não precisa carregar lista
        if (embarcadorId) {
          console.log('Usando embarcadorId fixo:', embarcadorId);
          return;
        }

        // Buscar todos os embarcadores (sem filtro de ativo para debug)
        const { data, error: fetchError } = await supabase
          .from('embarcadores')
          .select('id, razao_social, ativo')
          .order('razao_social', { ascending: true });

        console.log('Resposta embarcadores:', { data, error: fetchError });

        if (fetchError) {
          console.error('Erro ao buscar embarcadores:', fetchError);
          return;
        }

        const lista = (data as any[])?.map((e) => ({ id: e.id, razao_social: e.razao_social })) ?? [];
        console.log('Lista de embarcadores processada:', lista);
        setEmbarcadores(lista);
      } catch (err) {
        console.error('Erro ao carregar embarcadores:', err);
      }
    }

    carregarEmbarcadores();
  }, [embarcadorId]);

  function handleChange(field: keyof CargaFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function somenteDigitos(value: string): string {
    return value.replace(/\D/g, '');
  }

  function validarCelular(numero: string): boolean {
    const n = somenteDigitos(numero);
    return n.length === 9 && n.startsWith('9');
  }

  function montarTelefoneBr(ddd: string, numero: string): string {
    const d = somenteDigitos(ddd);
    const n = somenteDigitos(numero);
    return `${d}${n}`;
  }

  function formatarCelular(valor: string): string {
    const digits = somenteDigitos(valor).slice(0, 9);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function formatarDDD(valor: string): string {
    const digits = somenteDigitos(valor).slice(0, 2);
    if (digits.length === 0) return '';
    return `(${digits}${digits.length === 2 ? ')' : ''}`;
  }

  function handleDddChange(
    valor: string, 
    setter: (v: string) => void,
    nextFieldRef?: React.RefObject<HTMLInputElement>
  ) {
    const digits = somenteDigitos(valor).slice(0, 2);
    setter(digits);
    // Auto-foco para o campo de telefone quando DDD completo (2 dígitos)
    if (digits.length === 2 && nextFieldRef?.current) {
      nextFieldRef.current.focus();
    }
  }

  function handleTelefoneChange(valor: string, setter: (v: string) => void) {
    const digits = somenteDigitos(valor).slice(0, 9);
    setter(digits);
  }

  function formatarPlaca(valor: string): string {
    // Remove tudo que não é letra ou número
    const limpo = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
    if (limpo.length <= 3) return limpo;
    return `${limpo.slice(0, 3)}-${limpo.slice(3)}`;
  }

  function handlePlacaChange(valor: string) {
    const limpo = valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
    handleChange('placa_veiculo', limpo);
  }

  async function handleCepOrigemChange(valor: string) {
    const cepLimpo = valor.replace(/\D/g, '').slice(0, 8);
    handleChange('origem_cep', cepLimpo);

    if (cepLimpo.length === 8) {
      setBuscandoCepOrigem(true);
      const endereco = await buscarEnderecoPorCep(cepLimpo);
      setBuscandoCepOrigem(false);

      if (endereco) {
        setFormData(prev => ({
          ...prev,
          origem_cidade: endereco.cidade,
          origem_uf: endereco.uf,
          origem_bairro: endereco.bairro,
          origem_logradouro: endereco.logradouro
        }));
        // Auto-foco no campo de número
        setTimeout(() => origemNumeroRef.current?.focus(), 100);
      }
    }
  }

  async function handleCepDestinoChange(valor: string) {
    const cepLimpo = valor.replace(/\D/g, '').slice(0, 8);
    handleChange('destino_cep', cepLimpo);

    if (cepLimpo.length === 8) {
      setBuscandoCepDestino(true);
      const endereco = await buscarEnderecoPorCep(cepLimpo);
      setBuscandoCepDestino(false);

      if (endereco) {
        setFormData(prev => ({
          ...prev,
          destino_cidade: endereco.cidade,
          destino_uf: endereco.uf,
          destino_bairro: endereco.bairro,
          destino_logradouro: endereco.logradouro
        }));
        // Auto-foco no campo de número
        setTimeout(() => destinoNumeroRef.current?.focus(), 100);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      // Validações básicas
      if (!formData.nota_fiscal || !formData.origem_cidade || !formData.destino_cidade) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (!formData.origem_uf || !formData.destino_uf) {
        throw new Error('Selecione o estado de saída e o estado de destino');
      }

      if (!formData.data_carregamento) {
        throw new Error('Selecione a data de saída');
      }

      if (!formData.prazo_entrega) {
        throw new Error('Selecione a estimativa de entrega');
      }

      if (!embarcadorId && !formData.embarcador_id) {
        throw new Error('Selecione o nome da empresa');
      }

      if (telefone1Ddd || telefone1Numero) {
        if (!validarCelular(telefone1Numero)) {
          throw new Error('Telefone inválido: informe 9 dígitos e o primeiro deve ser 9');
        }

        if (!telefone1EhWhatsapp) {
          if (!telefoneWhatsappDdd || !telefoneWhatsappNumero) {
            throw new Error('Informe um telefone com WhatsApp');
          }
          if (!validarCelular(telefoneWhatsappNumero)) {
            throw new Error('Telefone WhatsApp inválido: informe 9 dígitos e o primeiro deve ser 9');
          }
        }
      }

      if (prazoEntregaMax) {
        const dtSaida = new Date(formData.data_carregamento);
        const dtEntrega = new Date(formData.prazo_entrega);
        const dtMax = new Date(prazoEntregaMax);
        if (!Number.isNaN(dtSaida.getTime()) && !Number.isNaN(dtEntrega.getTime()) && !Number.isNaN(dtMax.getTime())) {
          if (dtEntrega.getTime() > dtMax.getTime()) {
            throw new Error('data ultrapassa a quantidade de dias estabelecido. Por favor selecione uma data válida.');
          }
        }
      }

      const telefoneParaContato = telefone1Ddd && telefone1Numero
        ? montarTelefoneBr(telefone1Ddd, telefone1Numero)
        : '';

      const telefoneParaWhatsapp = telefone1Ddd && telefone1Numero
        ? (telefone1EhWhatsapp
          ? telefoneParaContato
          : montarTelefoneBr(telefoneWhatsappDdd, telefoneWhatsappNumero))
        : '';

      const dadosParaSalvar: CargaFormData = {
        ...formData,
        motorista_telefone: telefoneParaWhatsapp || telefoneParaContato || undefined,
        descricao: formData.descricao
          ? `[Tipo de carga: ${tipoCarga}] ${formData.descricao}`
          : `[Tipo de carga: ${tipoCarga}]`
      };

      // Geocodificação com fallback para coordenadas padrão
      try {
        if (!Number.isFinite(dadosParaSalvar.origem_lat as number) || !Number.isFinite(dadosParaSalvar.origem_lng as number)) {
          const origemGeo = await geocodeCidadeUf({ cidade: dadosParaSalvar.origem_cidade, uf: dadosParaSalvar.origem_uf });
          dadosParaSalvar.origem_lat = origemGeo.lat;
          dadosParaSalvar.origem_lng = origemGeo.lng;
        }
      } catch (geoError) {
        console.warn('Erro ao geocodificar origem, usando coordenadas padrão:', geoError);
        dadosParaSalvar.origem_lat = -12.9714;
        dadosParaSalvar.origem_lng = -38.5014;
      }

      try {
        if (!Number.isFinite(dadosParaSalvar.destino_lat as number) || !Number.isFinite(dadosParaSalvar.destino_lng as number)) {
          const destinoGeo = await geocodeCidadeUf({ cidade: dadosParaSalvar.destino_cidade, uf: dadosParaSalvar.destino_uf });
          dadosParaSalvar.destino_lat = destinoGeo.lat;
          dadosParaSalvar.destino_lng = destinoGeo.lng;
        }
      } catch (geoError) {
        console.warn('Erro ao geocodificar destino, usando coordenadas padrão:', geoError);
        dadosParaSalvar.destino_lat = -12.9714;
        dadosParaSalvar.destino_lng = -38.5014;
      }

      // Criar carga
      const carga = await criarCarga(dadosParaSalvar);

      // Se tem telefone do motorista, gerar link de rastreamento
      if (telefoneParaWhatsapp || telefoneParaContato) {
        const linkRastreamento = await rastreamentoService.gerarLinkRastreamento(
          carga.id,
          (telefoneParaWhatsapp || telefoneParaContato)
        );

        const mensagem = rastreamentoService.gerarMensagemCompartilhamento(linkRastreamento);
        const whatsappUrl = telefoneParaWhatsapp
          ? rastreamentoService.gerarUrlWhatsApp(telefoneParaWhatsapp, mensagem)
          : rastreamentoService.gerarUrlWhatsApp(telefoneParaContato, mensagem);
        const smsUrl = rastreamentoService.gerarUrlSms(telefoneParaContato || telefoneParaWhatsapp, mensagem);

        setEnvioAssistido({
          linkRastreamento,
          whatsappUrl,
          smsUrl
        });

        return;
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

  return (
    envioAssistido ? (
      <div className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Enviar link ao motorista</h2>
          <p className="text-sm text-gray-500 mt-1">
            Clique para abrir o app com a mensagem pronta e enviar
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Link de rastreamento</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={envioAssistido.linkRastreamento}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(envioAssistido.linkRastreamento);
                  alert('Link copiado!');
                } catch {
                  alert('Não foi possível copiar o link automaticamente.');
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Copiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={envioAssistido.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Abrir WhatsApp
          </a>
          <a
            href={envioAssistido.smsUrl}
            className="text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Abrir SMS
          </a>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => {
              setEnvioAssistido(null);
              onSuccess?.();
            }}
            className="flex-1 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
          >
            Finalizar
          </button>
        </div>
      </div>
    ) : (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cadastrar Nova Carga</h2>
        <p className="text-sm text-gray-500 mt-1">Preencha as informações da carga para iniciar o rastreamento</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('motorista')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'motorista' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Motorista
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('empresa')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'empresa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Empresa e Carga
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rota')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'rota' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Rota
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('datas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'datas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Datas
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {activeTab === 'motorista' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900">Motorista</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placa do veículo
              </label>
              <input
                type="text"
                value={formatarPlaca(formData.placa_veiculo || '')}
                onChange={(e) => handlePlacaChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="XXX-XXXX"
                maxLength={8}
              />
            </div>
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
      )}

      {activeTab === 'empresa' && (
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
                Nota fiscal *
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
                value={formData.toneladas}
                onChange={(e) => handleChange('toneladas', parseFloat(e.target.value))}
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
      )}

      {activeTab === 'rota' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900">Rota</h3>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-2">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Origem (Saída)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatarCep(formData.origem_cep || '')}
                    onChange={(e) => handleCepOrigemChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {buscandoCepOrigem && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                <input
                  ref={origemNumeroRef}
                  type="text"
                  value={formData.origem_numero || ''}
                  onChange={(e) => handleChange('origem_numero', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Nº"
                  disabled={formData.origem_sem_numero}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                  <input
                    type="checkbox"
                    checked={formData.origem_sem_numero || false}
                    onChange={(e) => {
                      handleChange('origem_sem_numero', e.target.checked);
                      if (e.target.checked) handleChange('origem_numero', 'S/N');
                      else handleChange('origem_numero', '');
                    }}
                  />
                  Sem número
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
                <input
                  type="text"
                  value={formData.origem_logradouro || ''}
                  onChange={(e) => handleChange('origem_logradouro', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.origem_bairro || ''}
                  onChange={(e) => handleChange('origem_bairro', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade/UF</label>
                <input
                  type="text"
                  value={formData.origem_cidade ? `${formData.origem_cidade}/${formData.origem_uf}` : ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <h4 className="text-sm font-semibold text-green-800 mb-3">Destino (Chegada)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatarCep(formData.destino_cep || '')}
                    onChange={(e) => handleCepDestinoChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {buscandoCepDestino && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                <input
                  ref={destinoNumeroRef}
                  type="text"
                  value={formData.destino_numero || ''}
                  onChange={(e) => handleChange('destino_numero', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Nº"
                  disabled={formData.destino_sem_numero}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                  <input
                    type="checkbox"
                    checked={formData.destino_sem_numero || false}
                    onChange={(e) => {
                      handleChange('destino_sem_numero', e.target.checked);
                      if (e.target.checked) handleChange('destino_numero', 'S/N');
                      else handleChange('destino_numero', '');
                    }}
                  />
                  Sem número
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
                <input
                  type="text"
                  value={formData.destino_logradouro || ''}
                  onChange={(e) => handleChange('destino_logradouro', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.destino_bairro || ''}
                  onChange={(e) => handleChange('destino_bairro', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade/UF</label>
                <input
                  type="text"
                  value={formData.destino_cidade ? `${formData.destino_cidade}/${formData.destino_uf}` : ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                  placeholder="Preenchido automaticamente"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'datas' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900">Datas</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de saída *</label>
              <input
                type="datetime-local"
                value={formData.data_carregamento}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange('data_carregamento', value);

                  if (!value) return;
                  if (!formData.prazo_entrega) return;

                  const dtSaida = new Date(value);
                  const dtEntrega = new Date(formData.prazo_entrega);
                  const max = new Date(dtSaida);
                  max.setDate(max.getDate() + 8);

                  if (!Number.isNaN(dtEntrega.getTime()) && dtEntrega.getTime() > max.getTime()) {
                    setError('data ultrapassa a quantidade de dias estabelecido. Por favor selecione uma data válida.');
                  } else if (error) {
                    setError('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimativa de entrega *</label>
              <input
                type="datetime-local"
                value={formData.prazo_entrega}
                max={prazoEntregaMax || undefined}
                onChange={(e) => {
                  const value = e.target.value;
                  if (prazoEntregaMax) {
                    const dtEntrega = new Date(value);
                    const dtMax = new Date(prazoEntregaMax);
                    if (!Number.isNaN(dtEntrega.getTime()) && !Number.isNaN(dtMax.getTime()) && dtEntrega.getTime() > dtMax.getTime()) {
                      setError('data ultrapassa a quantidade de dias estabelecido. Por favor selecione uma data válida.');
                      return;
                    }
                  }

                  if (error) setError('');
                  handleChange('prazo_entrega', value);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {prazoEntregaMax && (
                <div className="text-xs text-gray-500 mt-1">
                  Máximo permitido: 8 dias após a saída
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    )
  );
}
