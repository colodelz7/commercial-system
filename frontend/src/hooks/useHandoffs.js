import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { HANDOFF_SECTIONS } from '../lib/constants';
import { gid, now } from '../lib/format';

export function allHandoffQuestions() {
  const arr = [];
  HANDOFF_SECTIONS.forEach((s) => s.perguntas.forEach((p) => arr.push(p)));
  return arr;
}

export function handoffProgress(h) {
  const total = allHandoffQuestions().length;
  const r = (h && h.respostas) || {};
  let done = 0;
  allHandoffQuestions().forEach((p) => { if ((r[p.k] || '').trim()) done++; });
  return { done, total };
}

export function useHandoffs() {
  const [items, setItems] = useState(() => DB.getHandoffs());
  const recarregar = useCallback(() => setItems(DB.getHandoffs()), []);

  const criarRascunho = useCallback(() => ({
    id: 'ho' + gid(), status: 'Rascunho', createdAt: now(), clientId: '', clientName: '', prioridade: '', respostas: {},
  }), []);

  const salvar = useCallback((h) => {
    const dados = { ...h, updatedAt: now() };
    DB.saveHandoff(dados);
    recarregar();
    return dados;
  }, [recarregar]);

  const excluir = useCallback((id) => { DB.deleteHandoff(id); recarregar(); }, [recarregar]);

  return { items, criarRascunho, salvar, excluir, recarregar };
}
