// App.tsx - Arquivo principal com rotas

import { useEffect, Suspense, lazy } from 'react';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Code-splitting: carrega cada dashboard/página apenas quando necessário
const Login = lazy(() => import('./components/Auth/Login'));
const EmbarcadorDashboard = lazy(() => import('./components/Dashboard/EmbarcadorDashboard'));
const CooperativaDashboard = lazy(() => import('./components/Dashboard/CooperativaDashboard'));
const RastreamentoMotorista = lazy(() => import('./components/Rastreamento/RastreamentoMotorista'));

function SentryFallback({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold text-red-700 mb-2">Ocorreu um erro ao carregar a página</h2>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
    <Routes>
          <Route path="/rastreamento/:token" element={<RastreamentoMotorista />} />

          {/* Rota de Login */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />

          {/* Dashboard - Redireciona baseado no tipo de usuário */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          {/* Dashboard do Embarcador */}
          <Route
            path="/embarcador"
            element={
              <ProtectedRoute requireEmbarcador>
                <EmbarcadorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dashboard da Cooperativa */}
          <Route
            path="/cooperativa"
            element={
              <ProtectedRoute requireCooperativa>
                <CooperativaDashboard />
              </ProtectedRoute>
            }
          />

          {/* Rota padrão */}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
          />

          {/* 404 */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">Página não encontrada</p>
                  <a href="/" className="text-blue-600 hover:text-blue-700">
                    Voltar para o início
                  </a>
                </div>
              </div>
            } 
          />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Sentry.ErrorBoundary fallback={SentryFallback}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Sentry.ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Componente que redireciona para o dashboard correto baseado no tipo de usuário
function DashboardRouter() {
  const { loading, isCooperativa, isEmbarcador, signOut } = useAuth();

  const semPermissao = !loading && !isCooperativa && !isEmbarcador;
  useEffect(() => {
    if (semPermissao) {
      signOut().finally(() => {
        window.location.replace('/login?erro=sem_permissao');
      });
    }
  }, [semPermissao]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isCooperativa) {
    return <CooperativaDashboard />;
  }
  return <EmbarcadorDashboard />;
}

export default App;
