// App.tsx - Arquivo principal com rotas

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import EmbarcadorDashboard from './components/Dashboard/EmbarcadorDashboard';
import CooperativaDashboard from './components/Dashboard/CooperativaDashboard';

function App() {
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
    <BrowserRouter>
      <Routes>
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
    </BrowserRouter>
  );
}

// Componente que redireciona para o dashboard correto baseado no tipo de usuário
function DashboardRouter() {
  const { isCooperativa, isEmbarcador } = useAuth();

  if (isCooperativa) {
    return <Navigate to="/cooperativa" replace />;
  }

  if (isEmbarcador) {
    return <Navigate to="/embarcador" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro de Permissão</h2>
        <p className="text-gray-600">Seu usuário não tem permissão de acesso.</p>
      </div>
    </div>
  );
}

export default App;
