import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "frescos" por 30 segundos — não refaz a query nesse período
      staleTime: 30 * 1000,
      // Cache mantido por 5 minutos mesmo após componente desmontar
      gcTime: 5 * 60 * 1000,
      // Não refazer query quando a janela ganha foco (evita chamadas desnecessárias)
      refetchOnWindowFocus: false,
      // Tentar 1 vez em caso de erro
      retry: 1,
    },
  },
});
