import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1, // 10% das transações (economiza cota)
      replaysSessionSampleRate: 0, // Desabilitado (consome muita cota)
      replaysOnErrorSampleRate: 0, // Desabilitado
      beforeSend(event, hint) {
        const error = hint?.originalException;
        // Filtrar AbortError (usuário navegou antes da requisição completar)
        if (error instanceof Error && error.name === 'AbortError') return null;
        // Filtrar erros de chunk desatualizado (deploy recente + cache antigo)
        if (error instanceof Error && error.message?.includes('dynamically imported module')) return null;
        // Não enviar erros de extensões do Chrome
        if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('extension')
        )) {
          return null;
        }
        return event;
      },
    });
  }
}
