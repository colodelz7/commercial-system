import { useState, useCallback, useEffect, useRef } from 'react';

async function _fetchJson(url, opts) {
  const resp = await fetch(url, { credentials: 'include', ...opts });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || `Erro ${resp.status}`);
  }
  return resp.json().catch(() => null);
}

export function useProspeccao() {
  const [resultado, setResultado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');
  const [convertidos, setConvertidos] = useState(() => new Set());
  const cidadesRef = useRef(null);

  // Carrega quais empresas já viraram lead (persistido na tabela prospeccao),
  // pra não deixar "Virar lead" ativo de novo depois de trocar de aba/F5.
  useEffect(() => {
    _fetchJson('/api/prospeccao')
      .then((lista) => setConvertidos(new Set((lista || []).map((x) => x.id))))
      .catch(() => {});
  }, []);

  const carregarCidades = useCallback(async () => {
    if (cidadesRef.current) return cidadesRef.current;
    const lista = await _fetchJson('/api/prospeccao/cidades');
    cidadesRef.current = lista || [];
    return cidadesRef.current;
  }, []);

  const buscar = useCallback(async ({ cidades, segmento, raio }) => {
    setBuscando(true); setErro(''); setResultado(null);
    try {
      const r = await _fetchJson('/api/prospeccao/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidades, segmento, raio }),
      });
      setResultado(r);
    } catch (e) {
      setErro(e.message || 'Não consegui buscar agora.');
    } finally {
      setBuscando(false);
    }
  }, []);

  const marcarConvertido = useCallback((empresa) => {
    _fetchJson('/api/prospeccao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: empresa.osmId, nome: empresa.nome, status: 'convertida', criadoEm: new Date().toISOString() }),
    }).catch(() => {});
    setConvertidos((s) => new Set(s).add(empresa.osmId));
  }, []);

  return { resultado, buscando, erro, buscar, carregarCidades, convertidos, marcarConvertido };
}
