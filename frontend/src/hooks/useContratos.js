import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { addHist, parseDateBR, hojeISO, fmtComp } from '../lib/format';

export function contractRenewalInfo(c) {
  if (!c) return null;
  const months = parseInt(c.duration, 10) || 0;
  if (months <= 1) return null;
  if (c.status !== 'Assinado') return null;
  const start = parseDateBR(c.signedAt) || parseDateBR(c.createdAt);
  if (!start) return null;
  const end = new Date(start.getTime());
  end.setMonth(end.getMonth() + months);
  const diff = Math.ceil((end - new Date()) / 86400000);
  const endStr = end.toLocaleDateString('pt-BR');
  if (diff < 0) return { label: `Venceu há ${-diff}d`, cls: 'vb-exp', days: diff, end: endStr };
  if (diff <= 30) return { label: `Renova em ${diff}d`, cls: 'vb-warn', days: diff, end: endStr };
  return { label: `Renova em ${diff}d`, cls: 'vb-ok', days: diff, end: endStr };
}

export function useContratos() {
  const [items, setItems] = useState(() => DB.getContratos());
  const recarregar = useCallback(() => setItems(DB.getContratos()), []);

  const mudarStatus = useCallback((id, status, lossReason, lossReasonObs) => {
    const list = DB.getContratos();
    const c = list.find((x) => x.id === id);
    if (!c) return;
    c.status = status;
    if (status === 'Assinado' && !c.signedAt) c.signedAt = new Date().toLocaleDateString('pt-BR');
    if (status === 'Assinado' && !c.competencia) {
      const val = hojeISO();
      c.competencia = val; addHist(c, `Competência definida: ${fmtComp(val)} (automática na assinatura)`, '📅');
    }
    if (status === 'Perdido') { c.lossReason = lossReason || ''; c.lossReasonObs = lossReasonObs || ''; }
    addHist(c, `Status alterado para: ${status}`, '🔄');
    DB.saveContrato(c);
    recarregar();
  }, [recarregar]);

  const editarCompetencia = useCallback((id, novaData) => {
    const c = DB.getContratos().find((x) => x.id === id);
    if (!c) return;
    if (novaData !== (c.competencia || '')) {
      addHist(c, novaData ? `Competência alterada para: ${fmtComp(novaData)}` : 'Competência removida (volta à data de criação)', '📅');
      c.competencia = novaData;
      DB.saveContrato(c);
      recarregar();
    }
  }, [recarregar]);

  const excluir = useCallback((id) => { DB.deleteContrato(id); recarregar(); }, [recarregar]);

  const salvarNotas = useCallback((id, notes) => {
    const c = DB.getContratos().find((x) => x.id === id);
    if (!c) return;
    c.notes = notes;
    DB.saveContrato(c);
    recarregar();
  }, [recarregar]);

  return { items, recarregar, mudarStatus, editarCompetencia, excluir, salvarNotas };
}
