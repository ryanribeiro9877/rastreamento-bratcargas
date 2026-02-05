// components/Usuario/PerfilModal.tsx - Modal de Perfil do Usuário

import { useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { formatarCNPJ, formatarTelefone } from '../../utils/formatters';

interface PerfilModalProps {
  onClose: () => void;
}

export default function PerfilModal({ onClose }: PerfilModalProps) {
  const isDark = false; // Tema fixo claro
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    razao_social: profile?.embarcador?.razao_social || '',
    cnpj: profile?.embarcador?.cnpj || '',
    email_contato: profile?.embarcador?.email_contato || '',
    telefone: profile?.embarcador?.telefone || '',
    descricao: '',
    // Campos de endereço
    cep: (profile?.embarcador as any)?.cep || '',
    logradouro: (profile?.embarcador as any)?.logradouro || '',
    numero: (profile?.embarcador as any)?.numero || '',
    complemento: (profile?.embarcador as any)?.complemento || '',
    bairro: (profile?.embarcador as any)?.bairro || '',
    cidade: (profile?.embarcador as any)?.cidade || '',
    uf: (profile?.embarcador as any)?.uf || '',
  });

  // Função para formatar telefone enquanto digita
  function formatarTelefoneInput(valor: string): string {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) {
      return numeros.length > 0 ? `(${numeros}` : '';
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
    }
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatarTelefoneInput(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  }
  
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Função para formatar CEP enquanto digita
  function formatarCepInput(valor: string): string {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 5) {
      return numeros;
    }
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  }

  // Função para buscar endereço pelo CEP usando ViaCEP
  async function buscarEnderecoPorCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return;
    }

    try {
      setBuscandoCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        alert('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        complemento: data.complemento || prev.complemento,
      }));
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar endereço. Verifique o CEP e tente novamente.');
    } finally {
      setBuscandoCep(false);
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatarCepInput(e.target.value);
    setFormData({ ...formData, cep: formatted });

    // Buscar endereço quando CEP tiver 8 dígitos
    const cepLimpo = formatted.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      buscarEnderecoPorCep(cepLimpo);
    }
  }

  async function handleUploadFoto(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.embarcador_id}-${Date.now()}.${fileExt}`;

      // Criar URL local para preview
      const localUrl = URL.createObjectURL(file);
      setFotoUrl(localUrl);

      // Em produção, fazer upload para Supabase Storage
      // const { error: uploadError } = await supabase.storage
      //   .from('logos')
      //   .upload(fileName, file);

      alert('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      if (!profile?.embarcador_id) {
        throw new Error('ID do embarcador não encontrado');
      }

      const { error } = await supabase
        .from('embarcadores')
        .update({
          razao_social: formData.razao_social,
          email_contato: formData.email_contato,
          telefone: formData.telefone || null,
        } as any)
        .eq('id', profile.embarcador_id);

      if (error) throw error;

      alert('Perfil atualizado com sucesso!');
      setEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale bg-white`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between bg-white border-gray-200`}>
          <h3 className={`text-2xl font-bold text-gray-900`}>
            Perfil da Empresa
          </h3>
          <button
            onClick={onClose}
            className={'text-gray-400 hover:text-gray-600'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Foto da Empresa */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {formData.razao_social?.substring(0, 2).toUpperCase() || 'EM'}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition"
              >
                {uploading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
              />
            </div>
            <p className={`mt-2 text-sm text-gray-500`}>
              Clique no ícone para alterar a foto
            </p>
          </div>

          {/* Informações da Empresa */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={`text-lg font-semibold text-gray-900`}>
                Informações da Empresa
              </h4>
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-sm text-[#009440] hover:text-[#007a35]"
              >
                {editMode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                  Razão Social
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                  />
                ) : (
                  <p className={`font-medium text-gray-900`}>
                    {formData.razao_social || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                  CNPJ
                </label>
                <p className={`font-medium text-gray-900`}>
                  {formData.cnpj ? formatarCNPJ(formData.cnpj) : '—'}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                  E-mail de Contato
                </label>
                {editMode ? (
                  <input
                    type="email"
                    value={formData.email_contato}
                    onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                  />
                ) : (
                  <p className={`font-medium text-gray-900`}>
                    {formData.email_contato || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                  Telefone
                </label>
                {editMode ? (
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                  />
                ) : (
                  <p className={`font-medium text-gray-900`}>
                    {formData.telefone || '—'}
                  </p>
                )}
              </div>
            </div>

            {/* Seção de Endereço */}
            <div className={`mt-6 pt-6 border-t bg-gray-50 border-gray-200`}>
              <h4 className={`text-lg font-semibold mb-4 text-gray-900`}>
                Endereço
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    CEP
                  </label>
                  {editMode ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                      />
                      {buscandoCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.cep || '—'}
                    </p>
                  )}
                  {editMode && (
                    <p className={`mt-1 text-xs text-gray-500`}>
                      Digite o CEP para preencher o endereço automaticamente
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    Logradouro
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.logradouro}
                      onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                      placeholder="Rua, Avenida..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.logradouro || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    Número
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="123"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.numero || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    Complemento
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                      placeholder="Sala, Andar..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.complemento || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    Bairro
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      placeholder="Bairro"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.bairro || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    Cidade
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Cidade"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.cidade || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                    UF
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                    />
                  ) : (
                    <p className={`font-medium text-gray-900`}>
                      {formData.uf || '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {editMode && (
              <div className="mt-4">
                <label className={`block text-sm font-medium mb-1 text-gray-700`}>
                  Descrição da Empresa
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  placeholder="Descreva sua empresa..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-500 border-gray-300`}
                />
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          {editMode && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditMode(false)}
                className={`flex-1 px-4 py-3 border rounded-lg transition bg-white text-gray-900 border-gray-300 hover:bg-gray-50`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
