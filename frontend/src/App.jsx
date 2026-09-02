import { useState, useEffect } from 'react';
import './style.css';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import ClientSignPage from './components/ClientSignPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const { autenticado, sessao, login, logout } = useAuth();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  const clienteToken = new URLSearchParams(window.location.search).get('cliente');
  if (clienteToken) {
    return <ClientSignPage token={clienteToken} />;
  }

  if (autenticado === null) {
    return <div className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando...</div>;
  }

  if (!autenticado) {
    return <LoginScreen onLogin={login} />;
  }

  // Monta só aqui (depois que useAuth confirmou a sessão e o db.js já
  // carregou o cache do backend) para os hooks do Dashboard lerem dados prontos.
  return (
    <Dashboard
      sessao={sessao}
      onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      onLogout={logout}
    />
  );
}
