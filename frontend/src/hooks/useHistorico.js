import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Trilha de auditoria do sistema. Os registros são gravados pelo BACKEND
 * (não pelo navegador), então não dá para o usuário maquiar o próprio
 * histórico: login, tentativa de login, bloqueio, cada criação/edição/exclusão
 * de orçamento, contrato, SPOT, cliente, serviço, lead, diagnóstico e
 * relatório, anexos, ações do MorningBot e acessos do cliente ao link.
 */
const API = '/api';

// Agrupamentos usados nos filtros da tela.
export const GRUPOS_HISTORICO = [
  { key: 'todos', label: 'Tudo', tipos: null },
  { key: 'acesso', label: 'Acessos', tipos: ['login'] },
  { key: 'comercial', label: 'Comercial', tipos: ['orcamentos', 'contratos', 'spots'] },
  { key: 'cadastros', label: 'Cadastros', tipos: ['clientes', 'servicos', 'leads', 'diagnosticos'] },
  { key: 'gestao', label: 'Gestão', tipos: ['usuarios', 'relatorios', 'anexos', 'bot'] },
];

/** Converte "DD/MM/AAAA, HH:mm:ss" (formato gravado no log) em Date. */
export function parseHoraLog(txt) {
  const m = String(txt || '').match(/(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
}

export function useHistorico() {
  const [items, setItems] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resp = await fetch(`${API}/logs`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Não consegui carregar o histórico.');
      const lista = await resp.json();
      setItems(Array.isArray(lista) ? lista : []);
      setErro('');
    } catch (e) {
      setErro(e.message || 'Erro ao carregar o histórico.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Ordena do mais recente para o mais antigo (o backend já traz assim, mas
  // registros antigos podem ter ordem de inserção diferente da cronológica).
  const ordenados = useMemo(() => {
    return items.slice().sort((a, b) => {
      const da = parseHoraLog(a.time), db = parseHoraLog(b.time);
      if (da && db) return db - da;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [items]);

  const usuarios = useMemo(() => {
    const set = new Set();
    ordenados.forEach((l) => { if (l.user) set.add(l.user); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [ordenados]);

  return { items: ordenados, usuarios, carregando, erro, recarregar: carregar };
}
