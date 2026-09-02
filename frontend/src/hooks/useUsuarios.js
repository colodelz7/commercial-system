import { useState, useCallback, useEffect } from 'react';

const API = '/api/usuarios';

async function _fetchJson(url, opts) {
  const resp = await fetch(url, { credentials: 'include', ...opts });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || `Erro ${resp.status}`);
  }
  if (resp.status === 204) return null;
  return resp.json().catch(() => null);
}

export function useUsuarios() {
  const [items, setItems] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try { setItems(await _fetchJson(API)); }
    catch (e) { console.error('[usuarios] falha ao listar:', e.message); }
    setCarregando(false);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const criar = useCallback(async (dados) => {
    await _fetchJson(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    await recarregar();
  }, [recarregar]);

  const editar = useCallback(async (id, dados) => {
    await _fetchJson(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    await recarregar();
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    await _fetchJson(`${API}/${id}`, { method: 'DELETE' });
    await recarregar();
  }, [recarregar]);

  return { items, carregando, recarregar, criar, editar, excluir };
}
