import { useState, useMemo, useCallback } from 'react';
import { dataEfetiva } from '../lib/format';

/**
 * Replica a lógica ovPeriod/ovRange/ovFilter do sistema original:
 * filtra qualquer lista de itens (orçamentos, contratos, spots) por um
 * período comum, usado tanto nos KPIs quanto na lista "Atividade Recente".
 */
export function useOverviewPeriod() {
  const hoje = new Date();
  // 'all' | '1' | '3' | '6' | '12' | 'mes' (mês específico) | 'custom'
  const [ovPeriod, setOvPeriod] = useState('all');
  const [ovFrom, setOvFrom] = useState('');
  const [ovTo, setOvTo] = useState('');
  const [mesSel, setMesSel] = useState(hoje.getMonth());
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());

  const range = useMemo(() => {
    if (ovPeriod === 'mes') {
      return {
        start: new Date(anoSel, mesSel, 1, 0, 0, 0),
        end: new Date(anoSel, mesSel + 1, 0, 23, 59, 59),
      };
    }
    if (ovPeriod === 'custom') {
      if (!ovFrom && !ovTo) return null;
      let from = ovFrom, to = ovTo;
      if (from && to && from > to) { const x = from; from = to; to = x; }
      const start = from ? new Date(from + 'T00:00:00') : new Date(2000, 0, 1);
      const end = to ? new Date(to + 'T23:59:59') : new Date();
      return { start, end };
    }
    if (ovPeriod === 'all') return null;
    const n = parseInt(ovPeriod, 10);
    const now = new Date();
    // Fecha no último dia do mês corrente para não cortar itens com
    // competência no fim do mês (ex.: contrato assinado dia 30).
    return {
      start: new Date(now.getFullYear(), now.getMonth() - (n - 1), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }, [ovPeriod, ovFrom, ovTo, mesSel, anoSel]);

  const filtrar = useCallback((lista) => {
    if (!range) return lista;
    return (lista || []).filter((i) => {
      const dt = dataEfetiva(i);
      return dt && dt >= range.start && dt <= range.end;
    });
  }, [range]);

  const selecionarPeriodo = useCallback((p) => {
    setOvPeriod(p);
    if (p !== 'custom') { setOvFrom(''); setOvTo(''); }
  }, []);

  const aplicarCustom = useCallback((from, to) => {
    setOvFrom(from); setOvTo(to);
    if (from || to) setOvPeriod('custom');
  }, []);

  const limparCustom = useCallback(() => {
    setOvFrom(''); setOvTo(''); setOvPeriod('all');
  }, []);

  /** Seleciona um mês específico (ex.: ver só agosto de 2026). */
  const selecionarMes = useCallback((mes, ano) => {
    setMesSel(mes); setAnoSel(ano);
    setOvFrom(''); setOvTo('');
    setOvPeriod('mes');
  }, []);

  return {
    ovPeriod, ovFrom, ovTo, setOvFrom, setOvTo, filtrar, selecionarPeriodo,
    aplicarCustom, limparCustom, mesSel, anoSel, selecionarMes,
  };
}
