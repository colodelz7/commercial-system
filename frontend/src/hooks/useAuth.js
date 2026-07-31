import { useState, useCallback, useEffect } from 'react';
import { DB } from '../lib/db';

export function useAuth() {
  const [autenticado, setAutenticado] = useState(null); // null = checando, true/false depois
  const [sessao, setSessao] = useState(null);

  useEffect(() => {
    DB.isAuthenticated().then((ok) => {
      setAutenticado(ok);
      setSessao(ok ? DB.getSessao() : null);
    });
  }, []);

  const login = useCallback(async (usuario, senha) => {
    const ok = await DB.login(usuario, senha);
    if (ok) { setAutenticado(true); setSessao(DB.getSessao()); }
    return ok;
  }, []);

  const logout = useCallback(async () => {
    await DB.logout();
    setAutenticado(false);
    setSessao(null);
  }, []);

  return { autenticado, sessao, login, logout };
}
