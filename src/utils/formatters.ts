// utils/formatters.ts - Funções de formatação

import type { StatusCarga, StatusPrazo } from '../types';

/**
 * Formata data para exibição no padrão brasileiro
 */
export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data e hora para exibição
 */
export function formatarDataHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata apenas a hora
 */
export function formatarHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata número para exibição de toneladas
 */
export function formatarToneladas(toneladas: number): string {
  const valor = Number.isFinite(toneladas) ? toneladas : 0;
  return `${valor.toFixed(2).replace('.', ',')} t`;
}

/**
 * Formata distância em km
 */
export function formatarDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Formata velocidade
 */
export function formatarVelocidade(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

/**
 * Formata CNPJ
 */
export function formatarCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  return limpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata telefone brasileiro
 */
export function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '');
  
  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (limpo.length === 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  
  return telefone;
}

/**
 * Formata placa de veículo
 */
export function formatarPlaca(placa: string): string {
  const limpo = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Formato novo (Mercosul): ABC1D23
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpo)) {
    return limpo.replace(/^([A-Z]{3})(\d)([A-Z])(\d{2})$/, '$1-$2$3$4');
  }
  
  // Formato antigo: ABC1234
  if (/^[A-Z]{3}\d{4}$/.test(limpo)) {
    return limpo.replace(/^([A-Z]{3})(\d{4})$/, '$1-$2');
  }
  
  return placa;
}

/**
 * Obtém cor do status de prazo
 */
export function getCorStatusPrazo(status: StatusPrazo): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (status) {
    case 'no_prazo':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-800'
      };
    case 'atrasado':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800'
      };
    case 'adiantado':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800'
      };
    case 'aguardando_data':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-800'
      };
  }
}

/**
 * Obtém label do status de prazo
 */
export function getLabelStatusPrazo(status: StatusPrazo): string {
  switch (status) {
    case 'no_prazo':
      return 'No Prazo';
    case 'atrasado':
      return 'Atrasado';
    case 'adiantado':
      return 'Adiantado';
    case 'aguardando_data':
      return 'Aguardando Data';
  }
}

/**
 * Obtém cor do status da carga
 */
export function getCorStatusCarga(status: StatusCarga): {
  bg: string;
  text: string;
  badge: string;
} {
  switch (status) {
    case 'aguardando':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800'
      };
    case 'em_transito':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800'
      };
    case 'entregue':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-800'
      };
    case 'cancelada':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800'
      };
    case 'aguardando_data':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800'
      };
  }
}

/**
 * Obtém label do status da carga
 */
export function getLabelStatusCarga(status: StatusCarga): string {
  switch (status) {
    case 'aguardando':
      return 'Aguardando';
    case 'em_transito':
      return 'Em Trânsito';
    case 'entregue':
      return 'Entregue';
    case 'cancelada':
      return 'Cancelada';
    case 'aguardando_data':
      return 'Aguardando Data';
  }
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/**
 * Formata número com separador de milhares
 */
export function formatarNumero(numero: number): string {
  return numero.toLocaleString('pt-BR');
}

/**
 * Trunca texto com ellipsis
 */
export function truncarTexto(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength) + '...';
}

/**
 * Obtém iniciais de um nome
 */
export function obterIniciais(nome: string): string {
  const partes = nome.trim().split(' ');
  if (partes.length === 1) {
    return partes[0].substring(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Formata tempo relativo (ex: "há 5 minutos")
 */
export function formatarTempoRelativo(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMinutos = Math.floor(diffMs / (1000 * 60));
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutos < 1) return 'agora';
  if (diffMinutos < 60) return `há ${diffMinutos} min`;
  if (diffHoras < 24) return `há ${diffHoras}h`;
  if (diffDias < 7) return `há ${diffDias} dias`;
  
  return formatarData(d);
}

/**
 * Estados brasileiros
 */
export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  const limpo = cnpj.replace(/\D/g, '');
  
  if (limpo.length !== 14) return false;
  if (/^(\d)\1+$/.test(limpo)) return false;
  
  // Validação dos dígitos verificadores
  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  const digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}
