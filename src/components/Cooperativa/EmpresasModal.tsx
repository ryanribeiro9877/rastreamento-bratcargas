// components/Cooperativa/EmpresasModal.tsx - Modal de empresas para cooperativa

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useCargas } from '../../hooks/useCargas';
import { formatarData, formatarToneladas, formatarCNPJ } from '../../utils/formatters';
import type { Carga } from '../../types';

interface Embarcador {
  id: string;
  razao_social: string;
  cnpj: string;
  email_contato?: string;
  telefone?: string;
  descricao?: string;
  logo_url?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  created_at: string;
}

interface EmpresasModalProps {
  onClose: () => void;
}

export default function EmpresasModal({ onClose }: EmpresasModalProps) {
  const isDark = false; // Tema fixo claro
  const [empresas, setEmpresas] = useState<Embarcador[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Embarcador | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarEmpresas();
  }, []);

  async function carregarEmpresas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('embarcadores')
        .select('*')
        .order('razao_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluirEmpresa(empresaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todas as cargas associadas também serão excluídas. Esta ação não pode ser desfeita.')) return;
    
    try {
      // Primeiro excluir as cargas da empresa
      await supabase.from('cargas').delete().eq('embarcador_id', empresaId);
      
      // Buscar usuarios vinculados antes de excluir
      const { data: usuarios } = await supabase
        .from('usuarios_embarcadores')
        .select('user_id')
        .eq('embarcador_id', empresaId);

      // Excluir vínculos de usuários
      await supabase.from('usuarios_embarcadores').delete().eq('embarcador_id', empresaId);

      // Excluir os perfis de usuário associados
      await supabase.from('profiles').delete().eq('embarcador_id', empresaId);
      
      // Por fim, excluir a empresa
      const { error } = await supabase.from('embarcadores').delete().eq('id', empresaId);
      
      if (error) throw error;

      // Excluir usuários do Auth via Edge Function (se houver)
      if (usuarios && usuarios.length > 0) {
        for (const u of usuarios) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excluir-usuario-auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ user_id: u.user_id }),
          }).catch(() => {});
        }
      }
      
      alert('Empresa excluída com sucesso!');
      setEmpresaSelecionada(null);
      carregarEmpresas();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      alert('Erro ao excluir empresa. Verifique se não há dependências.');
    }
  }

  const empresasFiltradas = empresas.filter(empresa => {
    if (!busca) return true;
    const termoBusca = busca.toLowerCase();
    return (
      empresa.razao_social?.toLowerCase().includes(termoBusca) ||
      empresa.cnpj?.includes(termoBusca) ||
      empresa.cidade?.toLowerCase().includes(termoBusca)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-fade-in-scale ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {empresaSelecionada ? 'Detalhes da Empresa' : 'Empresas Cadastradas'}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {empresaSelecionada 
                ? empresaSelecionada.razao_social 
                : `${empresasFiltradas.length} empresa${empresasFiltradas.length !== 1 ? 's' : ''} cadastrada${empresasFiltradas.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {empresaSelecionada && (
              <button
                onClick={() => setEmpresaSelecionada(null)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                ← Voltar
              </button>
            )}
            <button
              onClick={onClose}
              className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {empresaSelecionada ? (
          <EmpresaDetalhes 
            empresa={empresaSelecionada} 
            isDark={isDark} 
            onExcluir={() => handleExcluirEmpresa(empresaSelecionada.id)}
          />
        ) : (
          <>
            {/* Busca */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <input
                type="text"
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
              />
            </div>

            {/* Lista de Empresas */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : empresasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Nenhuma empresa encontrada</h3>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tente ajustar os filtros de busca.
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {empresasFiltradas.map((empresa) => (
                    <div 
                      key={empresa.id} 
                      className={`p-4 transition cursor-pointer ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                      onClick={() => setEmpresaSelecionada(empresa)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {empresa.logo_url ? (
                            <img 
                              src={empresa.logo_url} 
                              alt={empresa.razao_social}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                              <svg className={`w-6 h-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {empresa.razao_social}
                            </h4>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatarCNPJ(empresa.cnpj)}
                            </p>
                            {empresa.cidade && empresa.uf && (
                              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {empresa.cidade}/{empresa.uf}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Componente de detalhes da empresa
function EmpresaDetalhes({ 
  empresa, 
  isDark, 
  onExcluir 
}: { 
  empresa: Embarcador; 
  isDark: boolean; 
  onExcluir: () => void;
}) {
  const { cargas, loading } = useCargas(empresa.id, {});

  const getStatusColor = (carga: Carga) => {
    if (carga.status === 'entregue') return 'bg-green-100 text-green-800';
    if (carga.status === 'cancelada') return 'bg-gray-100 text-gray-800';
    if (carga.status === 'aguardando_data') return 'bg-orange-100 text-orange-800';
    
    switch (carga.status_prazo) {
      case 'no_prazo': return 'bg-green-100 text-green-800';
      case 'atrasado': return 'bg-red-100 text-red-800';
      case 'adiantado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (carga: Carga) => {
    if (carga.status === 'entregue') return 'Entregue';
    if (carga.status === 'cancelada') return 'Cancelada';
    if (carga.status === 'aguardando_data') return 'Aguardando Data';
    
    switch (carga.status_prazo) {
      case 'no_prazo': return 'No Prazo';
      case 'atrasado': return 'Atrasado';
      case 'adiantado': return 'Adiantado';
      default: return 'Em Trânsito';
    }
  };

  // Estatísticas das cargas
  const stats = {
    total: cargas.length,
    emTransito: cargas.filter(c => c.status === 'em_transito').length,
    entregues: cargas.filter(c => c.status === 'entregue').length,
    atrasadas: cargas.filter(c => c.status_prazo === 'atrasado').length,
  };

  return (
    <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
      <div className="p-6 space-y-6">
        {/* Informações da Empresa */}
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-start gap-6">
            {empresa.logo_url ? (
              <img 
                src={empresa.logo_url} 
                alt={empresa.razao_social}
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className={`w-24 h-24 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <svg className={`w-12 h-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {empresa.razao_social}
              </h4>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                CNPJ: {formatarCNPJ(empresa.cnpj)}
              </p>
              
              {empresa.descricao && (
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {empresa.descricao}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {empresa.email_contato && (
              <div>
                <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>E-mail</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {empresa.email_contato}
                </span>
              </div>
            )}
            {empresa.telefone && (
              <div>
                <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Telefone</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {empresa.telefone}
                </span>
              </div>
            )}
            {empresa.cidade && empresa.uf && (
              <div>
                <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Localização</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {empresa.cidade}/{empresa.uf}
                </span>
              </div>
            )}
            {empresa.logradouro && (
              <div className="col-span-2">
                <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Endereço</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {empresa.logradouro}{empresa.numero ? `, ${empresa.numero}` : ''}{empresa.complemento ? ` - ${empresa.complemento}` : ''}{empresa.bairro ? `, ${empresa.bairro}` : ''}
                </span>
              </div>
            )}
            {empresa.cep && (
              <div>
                <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CEP</span>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {empresa.cep}
                </span>
              </div>
            )}
            <div>
              <span className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cadastrado em</span>
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatarData(empresa.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Estatísticas de Cargas */}
        <div>
          <h5 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Resumo de Cargas
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-lg p-4 text-center ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stats.total}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${isDark ? 'bg-gray-700' : 'bg-yellow-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.emTransito}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Em Trânsito</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{stats.entregues}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Entregues</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${isDark ? 'bg-gray-700' : 'bg-red-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{stats.atrasadas}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Atrasadas</div>
            </div>
          </div>
        </div>

        {/* Lista de Cargas */}
        <div>
          <h5 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Cargas da Empresa
          </h5>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : cargas.length === 0 ? (
            <div className={`text-center py-8 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Nenhuma carga registrada para esta empresa.
              </p>
            </div>
          ) : (
            <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {cargas.slice(0, 10).map((carga) => (
                  <div key={carga.id} className={`p-3 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          NF: {carga.nota_fiscal}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(carga)}`}>
                          {getStatusLabel(carga)}
                        </span>
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {carga.origem_cidade}/{carga.origem_uf} → {carga.destino_cidade}/{carga.destino_uf}
                      </div>
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Prazo: {formatarData(carga.prazo_entrega)} • {formatarToneladas(carga.toneladas)}
                    </div>
                  </div>
                ))}
              </div>
              {cargas.length > 10 && (
                <div className={`p-3 text-center text-sm ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  + {cargas.length - 10} cargas adicionais
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão Excluir */}
        <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onExcluir}
            className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir Empresa
          </button>
          <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Esta ação excluirá a empresa e todas as suas cargas permanentemente.
          </p>
        </div>
      </div>
    </div>
  );
}
