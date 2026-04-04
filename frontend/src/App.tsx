import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthContext, useAuthProvider, useAuth } from './hooks/useAuth';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import ScriptDetailPage from './pages/ScriptDetailPage';
import ManagePage       from './pages/ManagePage';
import MetricsPage      from './pages/MetricsPage';

// Lee isAuthenticated e isLoading del contexto (reactivo, no de localStorage)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras verifica la sesión contra el backend no redirigir todavía:
  // evita un flash de login en usuarios con sesión válida
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f172a'
      }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #334155',
          borderTopColor: '#3b82f6', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const auth = useAuthProvider();
  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
          }}
        />
        <Routes>
          <Route path="/login"       element={<LoginPage />} />
          <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/scripts/:id" element={<ProtectedRoute><ScriptDetailPage /></ProtectedRoute>} />
          <Route path="/manage"      element={<ProtectedRoute><ManagePage /></ProtectedRoute>} />
          <Route path="/metrics"     element={<ProtectedRoute><MetricsPage /></ProtectedRoute>} />
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
