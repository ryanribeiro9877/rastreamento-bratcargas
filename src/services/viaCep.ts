// services/viaCep.ts - Serviço para busca de endereço por CEP

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

// Cache para evitar requisições repetidas
const cache: Record<string, EnderecoViaCep | null> = {};

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep | null> {
  // Remove caracteres não numéricos
  const cepLimpo = cep.replace(/\D/g, '');
  
  // Valida se tem 8 dígitos
  if (cepLimpo.length !== 8) {
    return null;
  }

  // Verifica cache
  if (cache[cepLimpo] !== undefined) {
    return cache[cepLimpo];
  }

  try {
    console.log('[VIACEP] Buscando:', cepLimpo);
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    console.log('[VIACEP] Status:', response.status);
    
    if (!response.ok) {
      throw new Error('Erro na requisição');
    }

    const data: ViaCepResponse = await response.json();
    console.log('[VIACEP] Data:', data);

    if (data.erro) {
      cache[cepLimpo] = null;
      return null;
    }

    const endereco: EnderecoViaCep = {
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf
    };

    cache[cepLimpo] = endereco;
    return endereco;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

export function formatarCep(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
