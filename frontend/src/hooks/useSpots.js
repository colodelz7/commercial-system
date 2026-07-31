import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { addHist, hojeISO, fmtComp } from '../lib/format';

function nextSpotSeq() {
  const all = DB.getSpots();
  const max = all.reduce((m, s) => Math.max(m, parseInt(s.seq, 10) || 0), 0);
  return max + 1;
}

export function useSpots() {
  const [items, setItems] = useState(() => DB.getSpots());
  const recarregar = useCallback(() => setItems(DB.getSpots()), []);

  const salvar = useCallback((spot) => {
    if (!spot.seq) spot.seq = nextSpotSeq();
    DB.saveSpot(spot);
    recarregar();
  }, [recarregar]);

  const mudarStatus = useCallback((id, status, lossReason, lossReasonObs, competencia) => {
    const list = DB.getSpots();
    const s = list.find((x) => x.id === id);
    if (!s) return;
    s.status = status;
    if (status === 'Perdido') { s.lossReason = lossReason || ''; s.lossReasonObs = lossReasonObs || ''; }
    if (status === 'Aprovado' && !s.competencia) {
      const val = competencia !== undefined ? competencia : hojeISO();
      if (val) { s.competencia = val; addHist(s, `Competência definida: ${fmtComp(val)}`, '📅'); }
    }
    addHist(s, `Status alterado para: ${status}`, '🔄');
    DB.saveSpot(s);
    recarregar();
  }, [recarregar]);

  const editarCompetencia = useCallback((id, novaData) => {
    const s = DB.getSpots().find((x) => x.id === id);
    if (!s) return;
    if (novaData !== (s.competencia || '')) {
      addHist(s, novaData ? `Competência alterada para: ${fmtComp(novaData)}` : 'Competência removida (volta à data de criação)', '📅');
      s.competencia = novaData;
      DB.saveSpot(s);
      recarregar();
    }
  }, [recarregar]);

  const excluir = useCallback((id) => { DB.deleteSpot(id); recarregar(); }, [recarregar]);

  const salvarNotas = useCallback((id, notes) => {
    const s = DB.getSpots().find((x) => x.id === id);
    if (!s) return;
    s.notes = notes;
    DB.saveSpot(s);
    recarregar();
  }, [recarregar]);

  return { items, recarregar, salvar, mudarStatus, editarCompetencia, excluir, salvarNotas };
}
