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

export function useRelatorios() {
  const [ym, setYm] = useState(ymOf(new Date()));
  const [dataDia, setDataDia] = useState(todayISO());
  const [, forceTick] = useState(0);
  const recarregar = useCallback(() => forceTick((n) => n + 1), []);

  const registrosDoMes = useMemo(() => {
    return DB.getRelatorios().filter((r) => r.id && r.id.length === 10 && r.id.indexOf(ym) === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  const registroDoDia = useMemo(() => {
    return DB.getRelatorios().find((r) => r.id === dataDia) || { id: dataDia };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDia]);

  const meta = useMemo(() => {
    const rec = DB.getRelatorios().find((r) => r.id === metaIdOf(ym));
    return { meta: rec?.meta || 0, supermeta: rec?.supermeta || 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  const vendidoNoMes = useMemo(() => {
    let total = 0, n = 0;
    registrosDoMes.forEach((r) => { if (r.valor > 0) { total += r.valor; n++; } });
    return { total, n };
  }, [registrosDoMes]);

  // Totais de cada métrica somados no mês (usado no funil e nos cards)
  const totaisDoMes = useMemo(() => {
    const t = {};
    REL_NUM.forEach(([campo]) => { t[campo] = 0; });
    registrosDoMes.forEach((r) => { REL_NUM.forEach(([campo]) => { t[campo] += parseFloat(r[campo]) || 0; }); });
    return t;
  }, [registrosDoMes]);

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
  };
}
