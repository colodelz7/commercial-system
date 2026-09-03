import { useState, useMemo, useCallback } from 'react';
import { DB } from '../lib/db';

export const REL_NUM = [
  ['leads', 'Leads recebidos'], ['trafego', 'Tráfego pago'],
  ['indicacao', 'Indicação'], ['prospeccao', 'Prospecção ativa'],
  ['organico', 'Orgânico/WhatsApp'], ['atend', 'Atendimentos feitos'],
  ['reunReal', 'Reuniões realizadas'], ['reunAgen', 'Reuniões agendadas'],
  ['propostas', 'Propostas enviadas'], ['followups', 'Follow-ups feitos'],
  ['fechados', 'Pedidos/contratos fechados'],
];

// Etapas do funil comercial, na ordem em que o lead deveria progredir
export const FUNIL_ETAPAS = [
  ['leads', 'Leads'], ['atend', 'Atendimentos'], ['reunReal', 'Reuniões'],
  ['propostas', 'Propostas'], ['fechados', 'Fechados'],
];

function ymOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function metaIdOf(ym) { return 'meta-' + ym; }

/** Lista de 'AAAA-MM' dos últimos N meses, terminando no mês de referência. */
function mesesAte(ym, n) {
  const [ano, mes] = ym.split('-').map(Number);
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    lista.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return lista;
}

export function useRelatorios() {
  const [ym, setYm] = useState(ymOf(new Date()));
  const [dataDia, setDataDia] = useState(todayISO());
  // Quantos meses o painel considera: 1 (só o mês), 3, 6 ou 12.
  const [faixa, setFaixa] = useState(1);
  const [, forceTick] = useState(0);
  const recarregar = useCallback(() => forceTick((n) => n + 1), []);

  const mesesDaFaixa = useMemo(() => mesesAte(ym, faixa), [ym, faixa]);

  // Registros da faixa escolhida (o mês selecionado e, se for o caso, os
  // anteriores). O checklist do dia continua sempre no mês selecionado.
  const registrosDaFaixa = useMemo(() => {
    const alvo = new Set(mesesDaFaixa);
    return DB.getRelatorios().filter((r) => r.id && r.id.length === 10 && alvo.has(r.id.slice(0, 7)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesDaFaixa]);

  const registrosDoMes = useMemo(() => {
    return DB.getRelatorios().filter((r) => r.id && r.id.length === 10 && r.id.indexOf(ym) === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  const registroDoDia = useMemo(() => {
    return DB.getRelatorios().find((r) => r.id === dataDia) || { id: dataDia };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDia]);

  // A meta acompanha a faixa: em 3/6/12 meses, soma as metas de cada mês.
  const meta = useMemo(() => {
    const todos = DB.getRelatorios();
    let metaSoma = 0, superSoma = 0;
    mesesDaFaixa.forEach((m) => {
      const rec = todos.find((r) => r.id === metaIdOf(m));
      metaSoma += rec?.meta || 0;
      superSoma += rec?.supermeta || 0;
    });
    return { meta: metaSoma, supermeta: superSoma };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesDaFaixa]);

  /* Meta só do mês selecionado. O card de edição usa esta, não a soma da
     faixa, senão salvar em "3 meses" gravaria o total como meta de um mês. */
  const metaDoMes = useMemo(() => {
    const rec = DB.getRelatorios().find((r) => r.id === metaIdOf(ym));
    return { meta: rec?.meta || 0, supermeta: rec?.supermeta || 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  const vendidoNoMes = useMemo(() => {
    let total = 0, n = 0;
    registrosDaFaixa.forEach((r) => { if (r.valor > 0) { total += r.valor; n++; } });
    return { total, n };
  }, [registrosDaFaixa]);

  // Totais de cada métrica somados na faixa (usado no funil e nos cards)
  const totaisDoMes = useMemo(() => {
    const t = {};
    REL_NUM.forEach(([campo]) => { t[campo] = 0; });
    registrosDaFaixa.forEach((r) => { REL_NUM.forEach(([campo]) => { t[campo] += parseFloat(r[campo]) || 0; }); });
    return t;
  }, [registrosDaFaixa]);

  /** Série por mês (para a faixa de 3, 6 ou 12 meses). */
  const serieMensal = useMemo(() => {
    const porMes = {};
    registrosDaFaixa.forEach((r) => {
      const m = r.id.slice(0, 7);
      porMes[m] = porMes[m] || { valor: 0, fechados: 0 };
      porMes[m].valor += r.valor || 0;
      porMes[m].fechados += parseFloat(r.fechados) || 0;
    });
    return mesesDaFaixa.map((m) => {
      const [a, mm] = m.split('-').map(Number);
      return {
        ym: m,
        label: new Date(a, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        valor: porMes[m] ? porMes[m].valor : 0,
        fechados: porMes[m] ? porMes[m].fechados : 0,
      };
    });
  }, [registrosDaFaixa, mesesDaFaixa]);

  // Série diária de valor fechado, pra gráfico de tendência do mês
  const serieDiaria = useMemo(() => {
    const [ano, mes] = ym.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const porDia = {};
    registrosDoMes.forEach((r) => { porDia[r.id] = r; });
    return Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const id = `${ym}-${String(dia).padStart(2, '0')}`;
      const r = porDia[id];
      return { dia, valor: r?.valor || 0, fechados: r?.fechados || 0 };
    });
  }, [registrosDoMes, ym]);

  const taxasConversao = useMemo(() => {
    const t = totaisDoMes;
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return {
      leadsParaAtend: pct(t.atend, t.leads),
      atendParaReuniao: pct(t.reunReal, t.atend),
      reuniaoParaProposta: pct(t.propostas, t.reunReal),
      propostaParaFechado: pct(t.fechados, t.propostas),
      geral: pct(t.fechados, t.leads),
    };
  }, [totaisDoMes]);

  function salvarDia(dados) {
    DB.saveRelatorio({ id: dataDia, ...dados });
    recarregar();
  }

  function salvarMeta(metaVal, supermetaVal) {
    DB.saveRelatorio({ id: metaIdOf(ym), meta: metaVal, supermeta: supermetaVal });
    recarregar();
  }

  return {
    ym, setYm, dataDia, setDataDia, registrosDoMes, registroDoDia, meta, vendidoNoMes,
    totaisDoMes, serieDiaria, taxasConversao, salvarDia, salvarMeta,
    faixa, setFaixa, mesesDaFaixa, serieMensal, metaDoMes,
  };
}
