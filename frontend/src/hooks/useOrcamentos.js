import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { gid, now, calcO, addHist, hojeISO, fmtComp } from '../lib/format';

export function validityInfo(o) {
  if (!o.createdAtRaw || !o.validity) return null;
  const exp = new Date(new Date(o.createdAtRaw).getTime() + o.validity * 86400000);
  const diff = Math.ceil((exp - new Date()) / 86400000);
  if (diff < 0) return { label: 'Vencido', cls: 'vb-exp', days: diff };
  if (diff <= 3) return { label: `Vence em ${diff}d`, cls: 'vb-warn', days: diff };
  return { label: `Válido ${diff}d`, cls: 'vb-ok', days: diff };
}

function nextOrcSeq() {
  const all = DB.getOrcamentos();
  const max = all.reduce((m, o) => Math.max(m, parseInt(o.seq, 10) || 0), 149);
  return max + 1;
}
export function ensureSeq(o) { if (o && !o.seq) o.seq = nextOrcSeq(); return o; }

function markVencidos() {
  const list = DB.getOrcamentos();
  let changed = false;
  list.forEach((o) => {
    if (o.status === 'Proposta em avaliação') {
      const vi = validityInfo(o);
      if (vi && vi.days < 0) {
        o.status = 'Vencido';
        addHist(o, 'Marcado como Vencido automaticamente (validade expirada)', '⏰');
        changed = true;
      }
    }
  });
  if (changed) DB.saveOrcamentos(list);
  return changed;
}

export function useOrcamentos() {
  markVencidos();
  const [items, setItems] = useState(() => DB.getOrcamentos());

  const recarregar = useCallback(() => setItems(DB.getOrcamentos()), []);

  const criarRascunho = useCallback(() => ({
    id: gid(), seq: null, status: 'Rascunho', createdAt: now(), createdAtRaw: Date.now(),
    clientName: '', clientDoc: '', clientWpp: '', clientEmail: '', clientObs: '',
    origem: '', responsavel: '', validity: 15,
    services: [], disc: 0, discMode: 'pct', discRaw: '0',
    duration: '1', payment: '', finObs: '', notes: '', history: [],
  }), []);

  const salvar = useCallback((orc) => {
    ensureSeq(orc);
    const idx = items.findIndex((x) => x.id === orc.id);
    if (idx < 0 && !(orc.history || []).some((h) => h.action === 'Orçamento criado')) {
      orc.history = orc.history || [];
      orc.history.unshift({ action: 'Orçamento criado', icon: '🆕', time: now() });
    }
    DB.saveOrcamento(orc);
    recarregar();
  }, [items, recarregar]);

  const excluir = useCallback((id) => { DB.deleteOrcamento(id); recarregar(); }, [recarregar]);

  const mudarStatus = useCallback((id, status, lossReason, lossReasonObs, competencia) => {
    const list = DB.getOrcamentos();
    const o = list.find((x) => x.id === id);
    if (!o) return;
    o.status = status;
    if (status === 'Perdido') { o.lossReason = lossReason || ''; o.lossReasonObs = lossReasonObs || ''; }
    else { o.lossReason = ''; o.lossReasonObs = ''; }
    if (status === 'Aprovado' && !o.competencia) {
      const val = competencia !== undefined ? competencia : hojeISO();
      if (val) { o.competencia = val; addHist(o, `Competência definida: ${fmtComp(val)}`, '📅'); }
    }
    addHist(o, `Status alterado para: ${status}`, '🔄');
    DB.saveOrcamento(o);
    recarregar();
  }, [recarregar]);

  const editarCompetencia = useCallback((id, novaData) => {
    const o = DB.getOrcamentos().find((x) => x.id === id);
    if (!o) return;
    if (novaData !== (o.competencia || '')) {
      addHist(o, novaData ? `Competência alterada para: ${fmtComp(novaData)}` : 'Competência removida (volta à data de criação)', '📅');
      o.competencia = novaData;
      DB.saveOrcamento(o);
      recarregar();
    }
  }, [recarregar]);

  const duplicar = useCallback((id) => {
    const original = DB.getOrcamentos().find((x) => x.id === id);
    if (!original) return null;
    const copia = { ...original, id: gid(), seq: null, status: 'Rascunho', createdAt: now(), createdAtRaw: Date.now(), history: [] };
    addHist(copia, 'Duplicado a partir do orçamento Nº ' + (original.seq || '?'), '📋');
    ensureSeq(copia);
    DB.saveOrcamento(copia);
    recarregar();
    return copia;
  }, [recarregar]);

  const salvarNotas = useCallback((id, notes) => {
    const o = DB.getOrcamentos().find((x) => x.id === id);
    if (!o) return;
    o.notes = notes;
    DB.saveOrcamento(o);
    recarregar();
  }, [recarregar]);

  /** Converte um orçamento aprovado em contrato (Aguardando assinatura) */
  const converterParaContrato = useCallback((id) => {
    const o = DB.getOrcamentos().find((x) => x.id === id);
    if (!o) return null;
    const { m, p, d, net } = calcO(o.services, o.disc || 0);
    const contrato = {
      id: gid(), status: 'Aguardando assinatura', createdAt: now(), createdAtRaw: Date.now(),
      clientName: o.clientName, clientDoc: o.clientDoc, clientWpp: o.clientWpp, clientEmail: o.clientEmail,
      origem: o.origem, responsavel: o.responsavel,
      services: o.services, disc: o.disc, discMode: o.discMode,
      finalM: m, finalP: p, finalDisc: d, finalNet: net,
      duration: o.duration, payment: o.payment, finObs: o.finObs,
      // O link de assinatura é criado depois, pelo servidor, no botão
      // "Gerar Link para o Cliente" (token com aleatoriedade forte).
      clientLink: null, history: [], origemOrcId: o.id,
    };
    addHist(contrato, 'Contrato gerado a partir do orçamento Nº ' + (o.seq || '?'), '📄');
    DB.saveContrato(contrato);
    o.status = 'Aprovado';
    addHist(o, 'Convertido em contrato', '➡️');
    DB.saveOrcamento(o);
    recarregar();
    return contrato;
  }, [recarregar]);

  /** Converte um orçamento em SPOT (serviço pontual único) */
  const converterParaSpot = useCallback((id) => {
    const o = DB.getOrcamentos().find((x) => x.id === id);
    if (!o) return null;
    const spot = {
      id: gid(), seq: null, status: 'Em avaliação', createdAt: now(), createdAtRaw: Date.now(),
      clientName: o.clientName, clientDoc: o.clientDoc, clientWpp: o.clientWpp, clientEmail: o.clientEmail,
      origem: o.origem, responsavel: o.responsavel,
      services: o.services.map((s) => ({ ...s, bill: 'pontual' })),
      disc: o.disc, discMode: o.discMode, validity: o.validity || 15,
      finObs: o.finObs, history: [], origemOrcId: o.id,
    };
    addHist(spot, 'Transformado em SPOT a partir do orçamento Nº ' + (o.seq || '?'), '⚡');
    DB.saveSpot(spot);
    recarregar();
    return spot;
  }, [recarregar]);

  return { items, criarRascunho, salvar, excluir, mudarStatus, editarCompetencia, duplicar, salvarNotas, converterParaContrato, converterParaSpot, recarregar };
}
