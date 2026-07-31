import { useState, useMemo, useCallback } from 'react';
import { dataEfetiva } from '../lib/format';

/**
 * Replica a lógica ovPeriod/ovRange/ovFilter do sistema original:
 * filtra qualquer lista de itens (orçamentos, contratos, spots) por um
 * período comum, usado tanto nos KPIs quanto na lista "Atividade Recente".
 */
export function useOverviewPeriod() {
  const [ovPeriod, setOvPeriod] = useState('all'); // 'all' | '1' | '3' | '6' | '12' | 'custom'
  const [ovFrom, setOvFrom] = useState('');
  const [ovTo, setOvTo] = useState('');

  const range = useMemo(() => {
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
    return { start: new Date(now.getFullYear(), now.getMonth() - (n - 1), 1), end: now };
  }, [ovPeriod, ovFrom, ovTo]);

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

  return { ovPeriod, ovFrom, ovTo, setOvFrom, setOvTo, filtrar, selecionarPeriodo, aplicarCustom, limparCustom };
}
