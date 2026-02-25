// components/Cargas/CargaForm.tsx - Formulário de Cadastro de Carga (Refatorado)

import { useState, useEffect } from 'react';
import { rastreamentoService } from '../../services/rastreamento';
import { geocodeCidadeUf } from '../../services/mapboxGeocoding';
import { calcularDistanciaTotal } from '../../utils/calculos';
import type { CargaFormData, Carga } from '../../types';

import {
  TabMotorista,
  TabVeiculo,
  TabEmpresa,
  TabRota,
  TabDatas,
  EnvioAssistido,
  validarCelular,
  montarTelefoneBr,
} from './CargaFormTabs';
import type { Motorista } from './CargaFormTabs';

interface CargaFormProps {
  embarcadorId?: string;
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

export default function CargaForm({ embarcadorId, onSuccess, onCancel }: CargaFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'motorista' | 'veiculo' | 'empresa' | 'rota' | 'datas'>('motorista');
  const [tipoCarga, setTipoCarga] = useState('Carga Geral');
  const [embarcadores, setEmbarcadores] = useState<Array<{ id: string; razao_social: string }>>([]);
  const [telefone1Ddd, setTelefone1Ddd] = useState('');
  const [telefone1Numero, setTelefone1Numero] = useState('');
  const [telefone1EhWhatsapp, setTelefone1EhWhatsapp] = useState(true);
  const [telefoneWhatsappDdd, setTelefoneWhatsappDdd] = useState('');
  const [telefoneWhatsappNumero, setTelefoneWhatsappNumero] = useState('');
  const [envioAssistido, setEnvioAssistido] = useState<null | {
    linkRastreamento: string; whatsappUrl: string; smsUrl: string;
  }>(null);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaSelId, setMotoristaSelId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CargaFormData>({
    nota_fiscal: '', embarcador_id: embarcadorId || '',
    origem_cidade: '', origem_uf: '', origem_bairro: '',
    destino_cidade: '', destino_uf: '', destino_bairro: '',
    toneladas: 0, descricao: '', data_carregamento: '', prazo_entrega: '',
    motorista_nome: '', motorista_telefone: '', placa_veiculo: '',
    velocidade_media_estimada: 60
  });


  useEffect(() => {
    if (embarcadorId) return;
    async function carregarEmbarcadores() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const token = getAccessTokenSync();
        if (!token) { console.warn('[EMBARCADORES] Sem token'); return; }
        console.log('[EMBARCADORES] Buscando...');
        const response = await fetch(
          `${supabaseUrl}/rest/v1/embarcadores?select=id,razao_social&ativo=eq.true&order=razao_social.asc`,
          { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` } }
        );
        console.log('[EMBARCADORES] Status:', response.status);
        if (!response.ok) return;
        const data = await response.json();
        console.log('[EMBARCADORES] Dados:', data.length, 'empresas');
        if (Array.isArray(data)) {
          setEmbarcadores(data.map((e: any) => ({ id: e.id, razao_social: e.razao_social })));
        }
      } catch (err: any) { console.error('[EMBARCADORES] Erro:', err); }
    }
    carregarEmbarcadores();
  }, [embarcadorId]);

  // Carregar motoristas salvos
  useEffect(() => {
    async function carregarMotoristas() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const token = getAccessTokenSync();
        if (!token) return;
        const response = await fetch(
          `${supabaseUrl}/rest/v1/motoristas?select=*&ativo=eq.true&order=nome.asc`,
          { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data)) setMotoristas(data);
      } catch (err) { console.error('[MOTORISTAS] Erro:', err); }
    }
    carregarMotoristas();
  }, []);

  function handleChange(field: keyof CargaFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('[CARGA] handleSubmit INICIO');
    const safetyTimeout = setTimeout(() => {
      console.error('[CARGA] SAFETY TIMEOUT');
      setLoading(false);
      setError('O cadastro demorou demais. Verifique se a carga foi criada e tente novamente.');
    }, 20000);
    
    try {
      setLoading(true);
      setError('');

      if (!formData.nota_fiscal || !formData.origem_cidade || !formData.destino_cidade) throw new Error('Preencha todos os campos obrigatórios');
      if (!formData.origem_uf || !formData.destino_uf) throw new Error('Selecione o estado de saída e o estado de destino');
      if (!formData.data_carregamento) throw new Error('Selecione a data de saída');
      if (!formData.prazo_entrega) throw new Error('Selecione a estimativa de entrega');
      if (!embarcadorId && !formData.embarcador_id) throw new Error('Selecione o nome da empresa');

      if (telefone1Ddd || telefone1Numero) {
        if (!validarCelular(telefone1Numero)) throw new Error('Telefone inválido: informe 9 dígitos e o primeiro deve ser 9');
        if (!telefone1EhWhatsapp) {
          if (!telefoneWhatsappDdd || !telefoneWhatsappNumero) throw new Error('Informe um telefone com WhatsApp');
          if (!validarCelular(telefoneWhatsappNumero)) throw new Error('Telefone WhatsApp inválido: informe 9 dígitos e o primeiro deve ser 9');
        }
      }

      const telefoneParaContato = telefone1Ddd && telefone1Numero ? montarTelefoneBr(telefone1Ddd, telefone1Numero) : '';
      const telefoneParaWhatsapp = telefone1Ddd && telefone1Numero
        ? (telefone1EhWhatsapp ? telefoneParaContato : montarTelefoneBr(telefoneWhatsappDdd, telefoneWhatsappNumero)) : '';

      let origemLat: number | null = null, origemLng: number | null = null;
      let destinoLat: number | null = null, destinoLng: number | null = null;
      let distanciaTotalKm: number | null = null;
      const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

      async function geocodeEndereco(logradouro?: string, numero?: string, bairro?: string, cidade?: string, uf?: string) {
        const query = [logradouro, numero, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=BR&limit=1&access_token=${MAPBOX_TOKEN}`);
        const data = await res.json();
        if (data.features?.length) { const [lng, lat] = data.features[0].center; return { lat, lng }; }
        throw new Error(`Geocoding falhou para: ${query}`);
      }

      try {
        const [origemGeo, destinoGeo] = await Promise.all([
          geocodeEndereco(formData.origem_logradouro, formData.origem_numero, formData.origem_bairro, formData.origem_cidade, formData.origem_uf),
          geocodeEndereco(formData.destino_logradouro, formData.destino_numero, formData.destino_bairro, formData.destino_cidade, formData.destino_uf)
        ]);
        origemLat = origemGeo.lat; origemLng = origemGeo.lng;
        destinoLat = destinoGeo.lat; destinoLng = destinoGeo.lng;
        distanciaTotalKm = calcularDistanciaTotal(origemLat, origemLng, destinoLat, destinoLng);
      } catch (geoErr) {
        console.warn('[CARGA] Geocoding endereço falhou, tentando por cidade:', geoErr);
        try {
          const [origemGeo, destinoGeo] = await Promise.all([
            geocodeCidadeUf({ cidade: formData.origem_cidade, uf: formData.origem_uf }),
            geocodeCidadeUf({ cidade: formData.destino_cidade, uf: formData.destino_uf })
          ]);
          origemLat = origemGeo.lat; origemLng = origemGeo.lng;
          destinoLat = destinoGeo.lat; destinoLng = destinoGeo.lng;
          distanciaTotalKm = calcularDistanciaTotal(origemLat, origemLng, destinoLat, destinoLng);
        } catch (fallbackErr) { console.warn('[CARGA] Geocoding fallback falhou:', fallbackErr); }
      }

      const dadosParaInserir = {
        embarcador_id: formData.embarcador_id || embarcadorId,
        nota_fiscal: formData.nota_fiscal,
        origem_cidade: formData.origem_cidade, origem_uf: formData.origem_uf,
        origem_bairro: formData.origem_bairro || null, origem_logradouro: formData.origem_logradouro || null,
        origem_numero: formData.origem_numero || null, origem_lat: origemLat, origem_lng: origemLng,
        destino_cidade: formData.destino_cidade, destino_uf: formData.destino_uf,
        destino_bairro: formData.destino_bairro || null, destino_logradouro: formData.destino_logradouro || null,
        destino_numero: formData.destino_numero || null, destino_lat: destinoLat, destino_lng: destinoLng,
        toneladas: formData.toneladas || 0,
        descricao: formData.descricao ? `[Tipo de carga: ${tipoCarga}] ${formData.descricao}` : `[Tipo de carga: ${tipoCarga}]`,
        data_carregamento: formData.data_carregamento, prazo_entrega: formData.prazo_entrega,
        motorista_nome: formData.motorista_nome || null,
        motorista_telefone: (telefoneParaWhatsapp || telefoneParaContato) || null,
        placa_veiculo: formData.placa_veiculo || null,
        veiculo_marca: formData.veiculo_marca || null, veiculo_modelo: formData.veiculo_modelo || null,
        veiculo_cor: formData.veiculo_cor || null, veiculo_ano: formData.veiculo_ano || null,
        veiculo_ano_modelo: formData.veiculo_ano_modelo || null, veiculo_importado: formData.veiculo_importado || null,
        veiculo_cilindrada: formData.veiculo_cilindrada || null, veiculo_potencia: formData.veiculo_potencia || null,
        veiculo_combustivel: formData.veiculo_combustivel || null, veiculo_chassi: formData.veiculo_chassi || null,
        veiculo_motor: formData.veiculo_motor || null, veiculo_uf: formData.veiculo_uf || null,
        veiculo_municipio: formData.veiculo_municipio || null,
        distancia_total_km: distanciaTotalKm, status: 'aguardando' as const, status_prazo: 'no_prazo',
        velocidade_media_estimada: formData.velocidade_media_estimada || 60, ativo: true
      };

      const token = getAccessTokenSync();
      if (!token) throw new Error('Usuário não autenticado');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const authHeaders = { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${token}` };

      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/cargas`, {
        method: 'POST', headers: { ...authHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify(dadosParaInserir)
      });

      if (!insertResponse.ok) {
        const errBody = await insertResponse.text();
        throw new Error(`Erro ao cadastrar carga: ${insertResponse.status} - ${errBody}`);
      }

      const insertedRows = await insertResponse.json();
      const carga = (Array.isArray(insertedRows) ? insertedRows[0] : insertedRows) as Carga;
      console.log('[CARGA] Carga criada:', carga.id);

      fetch(`${supabaseUrl}/rest/v1/historico_status`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ carga_id: carga.id, status_novo: 'aguardando', observacao: 'Carga criada - aguardando motorista' })
      }).catch(() => {});

      fetch(`${supabaseUrl}/functions/v1/notificar-status-carga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ carga_id: carga.id, status: 'aguardando' })
      }).catch(() => {});

      // Salvar/atualizar motorista automaticamente (fire-and-forget)
      if (formData.motorista_nome) {
        const motData = {
          embarcador_id: formData.embarcador_id || embarcadorId,
          nome: formData.motorista_nome,
          telefone: (telefoneParaContato) || null,
          telefone_whatsapp: (telefoneParaWhatsapp) || null,
          placa_veiculo: formData.placa_veiculo || null,
          veiculo_marca: formData.veiculo_marca || null,
          veiculo_modelo: formData.veiculo_modelo || null,
          veiculo_cor: formData.veiculo_cor || null,
          veiculo_ano: formData.veiculo_ano || null,
          veiculo_ano_modelo: formData.veiculo_ano_modelo || null,
          veiculo_importado: formData.veiculo_importado || null,
          veiculo_cilindrada: formData.veiculo_cilindrada || null,
          veiculo_potencia: formData.veiculo_potencia || null,
          veiculo_combustivel: formData.veiculo_combustivel || null,
          veiculo_chassi: formData.veiculo_chassi || null,
          veiculo_motor: formData.veiculo_motor || null,
          veiculo_uf: formData.veiculo_uf || null,
          veiculo_municipio: formData.veiculo_municipio || null,
          updated_at: new Date().toISOString(),
        };
        if (motoristaSelId) {
          // Atualizar motorista existente
          fetch(`${supabaseUrl}/rest/v1/motoristas?id=eq.${motoristaSelId}`, {
            method: 'PATCH', headers: authHeaders, body: JSON.stringify(motData)
          }).then(() => console.log('[MOTORISTA] Atualizado'))
            .catch(err => console.warn('[MOTORISTA] Erro ao atualizar:', err));
        } else {
          // Criar novo motorista
          fetch(`${supabaseUrl}/rest/v1/motoristas`, {
            method: 'POST', headers: authHeaders, body: JSON.stringify(motData)
          }).then(() => console.log('[MOTORISTA] Salvo'))
            .catch(err => console.warn('[MOTORISTA] Erro ao salvar:', err));
        }
      }

      if (telefoneParaWhatsapp || telefoneParaContato) {
        try {
          const linkRastreamento = await rastreamentoService.gerarLinkRastreamento(carga.id, (telefoneParaWhatsapp || telefoneParaContato), token);
          const mensagem = rastreamentoService.gerarMensagemCompartilhamento(linkRastreamento, formData.motorista_nome || undefined);
          const whatsappUrl = telefoneParaWhatsapp
            ? rastreamentoService.gerarUrlWhatsApp(telefoneParaWhatsapp, mensagem)
            : rastreamentoService.gerarUrlWhatsApp(telefoneParaContato, mensagem);
          const smsUrl = rastreamentoService.gerarUrlSms(telefoneParaContato || telefoneParaWhatsapp, mensagem);

          // Enviar dados para webhook (fire-and-forget)
          const numeroWhatsapp = (telefoneParaWhatsapp || telefoneParaContato).replace(/\D/g, '');
          const origemCompleta = [formData.origem_cidade, formData.origem_uf, formData.origem_bairro].filter(Boolean).join(', ');
          const destinoCompleto = [formData.destino_cidade, formData.destino_uf, formData.destino_bairro].filter(Boolean).join(', ');
          fetch('https://webhook.vpslafelicita.shop/webhook/entregabratcarga', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: formData.motorista_nome || '',
              url: linkRastreamento,
              mensagem: mensagem,
              numero: numeroWhatsapp,
              origem: origemCompleta,
              destino: destinoCompleto
            })
          }).then(() => console.log('[WEBHOOK] Enviado com sucesso'))
            .catch(err => console.warn('[WEBHOOK] Falha ao enviar:', err));

          clearTimeout(safetyTimeout);
          setLoading(false);
          setEnvioAssistido({ linkRastreamento, whatsappUrl, smsUrl });
          return;
        } catch (linkErr) { console.warn('[CARGA] Falha ao gerar link:', linkErr); }
      }

      clearTimeout(safetyTimeout);
      alert('Carga cadastrada com sucesso!');
      onSuccess?.();
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      console.error('[CARGA] Erro:', err);
      setError(err.message || 'Erro ao cadastrar carga');
    } finally { setLoading(false); }
  }

  if (envioAssistido) {
    return (
      <EnvioAssistido
        linkRastreamento={envioAssistido.linkRastreamento}
        whatsappUrl={envioAssistido.whatsappUrl}
        smsUrl={envioAssistido.smsUrl}
        onFinalizar={() => { setEnvioAssistido(null); onSuccess?.(); }}
      />
    );
  }

  const tabs = [
    { key: 'motorista' as const, label: 'Motorista' },
    { key: 'veiculo' as const, label: 'Veículo' },
    { key: 'empresa' as const, label: 'Empresa e Carga' },
    { key: 'rota' as const, label: 'Rota' },
    { key: 'datas' as const, label: 'Datas' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cadastrar Nova Carga</h2>
        <p className="text-sm text-gray-500 mt-1">Preencha as informações da carga para iniciar o rastreamento</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >{tab.label}</button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {activeTab === 'motorista' && (
        <TabMotorista formData={formData} handleChange={handleChange} setFormData={setFormData}
          telefone1Ddd={telefone1Ddd} setTelefone1Ddd={setTelefone1Ddd}
          telefone1Numero={telefone1Numero} setTelefone1Numero={setTelefone1Numero}
          telefone1EhWhatsapp={telefone1EhWhatsapp} setTelefone1EhWhatsapp={setTelefone1EhWhatsapp}
          telefoneWhatsappDdd={telefoneWhatsappDdd} setTelefoneWhatsappDdd={setTelefoneWhatsappDdd}
          telefoneWhatsappNumero={telefoneWhatsappNumero} setTelefoneWhatsappNumero={setTelefoneWhatsappNumero}
          motoristas={motoristas}
          onSelectMotorista={(m) => setMotoristaSelId(m?.id || null)}
        />
      )}
      {activeTab === 'veiculo' && <TabVeiculo formData={formData} handleChange={handleChange} setFormData={setFormData} />}
      {activeTab === 'empresa' && <TabEmpresa formData={formData} handleChange={handleChange} embarcadorId={embarcadorId} embarcadores={embarcadores} tipoCarga={tipoCarga} setTipoCarga={setTipoCarga} />}
      {activeTab === 'rota' && <TabRota formData={formData} handleChange={handleChange} setFormData={setFormData} />}
      {activeTab === 'datas' && <TabDatas formData={formData} handleChange={handleChange} prazoEntregaMax={''} error={error} setError={setError} />}

      <div className="flex gap-4 pt-4 border-t">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition">Cancelar</button>
        )}
        <button type="submit" disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Cadastrando...' : 'Cadastrar Carga'}
        </button>
      </div>
    </form>
  );
}
