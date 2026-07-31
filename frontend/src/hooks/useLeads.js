import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { gid } from '../lib/format';

export const LEAD_STAGES = [
  { key: 'leads', title: 'Leads', color: '#1A1A2E' },
  { key: 'conexao', title: 'Conexão', color: '#008AFC' },
  { key: 'diagnostico', title: 'Diagnóstico (CDIV)', color: '#f5a623' },
  { key: 'proposta', title: 'Proposta', color: '#15c2d8' },
  { key: 'negociacao', title: 'Negociação', color: '#7a8fb5' },
  { key: 'ganho', title: 'Ganho', color: '#1ecb7a' },
  { key: 'perda', title: 'Perda', color: '#f05a5a' },
];
export const LEAD_TEMP = { Quente: '🔥', Morna: '🌤️', Fria: '❄️' };

export function useLeads() {
  const [items, setItems] = useState(() => DB.getLeads() || []);
  const recarregar = useCallback(() => setItems(DB.getLeads() || []), []);

  const salvar = useCallback((dados) => {
    const id = dados.id || gid();
    const existente = items.find((l) => l.id === id);
    DB.saveLead({ ...existente, ...dados, id, updatedAt: new Date().toISOString(), createdAt: existente?.createdAt || new Date().toISOString() });
    recarregar();
  }, [items, recarregar]);

  const excluir = useCallback((id) => { DB.deleteLead(id); recarregar(); }, [recarregar]);

  const moverEtapa = useCallback((id, stage) => {
    const l = DB.getLeads().find((x) => x.id === id);
    if (!l || l.stage === stage) return;
    l.stage = stage; l.updatedAt = new Date().toISOString();
    DB.saveLead(l);
    recarregar();
  }, [recarregar]);

  return { items, salvar, excluir, moverEtapa, recarregar };
}
