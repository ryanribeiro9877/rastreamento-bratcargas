import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1, // 10% das transações (economiza cota)
      replaysSessionSampleRate: 0, // Desabilitado (consome muita cota)
      replaysOnErrorSampleRate: 0, // Desabilitado
      beforeSend(event) {
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
