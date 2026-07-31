import { useState, useMemo, useCallback } from 'react';
import { dataEfetiva } from '../lib/format';

function spotValor(s, calcO) {
  try { return calcO(s.services || [], s.disc || 0).net || 0; } catch { return 0; }
}

export function useRevenueChart(contratos, spots, calcO) {
  const [chartPeriod, setChartPeriod] = useState(6); // 1 | 6 | 12 | 'custom'
  const [chartMonth, setChartMonth] = useState(new Date().getMonth());
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const resultado = useMemo(() => {
    if (chartPeriod === 'custom' && customFrom && customTo) {
      const start = new Date(customFrom + 'T00:00:00');
      const end = new Date(customTo + 'T23:59:59');
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { buckets: [], daily: false, total: 0, empty: true };
      }
      const dtOf = (item) => { const dt = dataEfetiva(item); return (dt && dt >= start && dt <= end) ? dt : null; };
      const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

      if (sameMonth) {
        const d1 = start.getDate(), d2 = end.getDate();
        const buckets = [];
        for (let d = d1; d <= d2; d++) buckets.push({ day: d, label: String(d), m: 0, p: 0, ano: start.getFullYear(), mes: start.getMonth() });
        contratos.forEach((c) => {
          if (!c.finalM && !c.finalP) return;
          const dt = dtOf(c); if (!dt) return;
          const idx = dt.getDate() - d1; if (idx >= 0 && idx < buckets.length) { buckets[idx].m += parseFloat(c.finalM) || 0; buckets[idx].p += parseFloat(c.finalP) || 0; }
        });
        spots.forEach((s) => {
          if (s.status !== 'Aprovado') return;
          const dt = dtOf(s); if (!dt) return;
          const idx = dt.getDate() - d1; if (idx >= 0 && idx < buckets.length) buckets[idx].p += spotValor(s, calcO);
        });
        buckets.forEach((b) => { const t = b.m + b.p; b.title = `Dia ${b.day}${t ? ' - ' : ' - sem contratos'}`; });
        const total = buckets.reduce((a, b) => a + b.m + b.p, 0);
        return { buckets, daily: true, total, empty: total <= 0 };
      }

      const months = [];
      let cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cur <= last) { months.push({ month: cur.getMonth(), year: cur.getFullYear(), m: 0, p: 0 }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
      contratos.forEach((c) => {
        if (!c.finalM && !c.finalP) return;
        const dt = dtOf(c); if (!dt) return;
        const mo = months.find((x) => x.month === dt.getMonth() && x.year === dt.getFullYear());
        if (mo) { mo.m += parseFloat(c.finalM) || 0; mo.p += parseFloat(c.finalP) || 0; }
      });
      spots.forEach((s) => {
        if (s.status !== 'Aprovado') return;
        const dt = dtOf(s); if (!dt) return;
        const mo = months.find((x) => x.month === dt.getMonth() && x.year === dt.getFullYear());
        if (mo) mo.p += spotValor(s, calcO);
      });
      months.forEach((mo) => { const d = new Date(mo.year, mo.month, 1); mo.label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''); });
      const total = months.reduce((a, mo) => a + mo.m + mo.p, 0);
      return { buckets: months, daily: false, compact: months.length > 7, total, empty: total <= 0 };
    }

    if (chartPeriod === 1) {
      const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, label: String(i + 1), m: 0, p: 0, ano: chartYear, mes: chartMonth }));
      contratos.forEach((c) => {
        if (!c.finalM && !c.finalP) return;
        const dt = dataEfetiva(c);
        if (!dt || dt.getMonth() !== chartMonth || dt.getFullYear() !== chartYear) return;
        days[dt.getDate() - 1].m += parseFloat(c.finalM) || 0;
        days[dt.getDate() - 1].p += parseFloat(c.finalP) || 0;
      });
      spots.forEach((s) => {
        if (s.status !== 'Aprovado') return;
        const dt = dataEfetiva(s);
        if (!dt || dt.getMonth() !== chartMonth || dt.getFullYear() !== chartYear) return;
        days[dt.getDate() - 1].p += spotValor(s, calcO);
      });
      days.forEach((d) => { const t = d.m + d.p; d.title = `Dia ${d.day}${t ? ' - ' : ' - sem contratos'}`; });
      const total = days.reduce((a, d) => a + d.m + d.p, 0);
      return { buckets: days, daily: true, total, empty: total <= 0 };
    }

    const months = [];
    const now = new Date();
    for (let i = chartPeriod - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lbl = chartPeriod === 12
        ? d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
        : d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      months.push({ label: lbl, month: d.getMonth(), year: d.getFullYear(), m: 0, p: 0 });
    }
    contratos.forEach((c) => {
      if (!c.finalM && !c.finalP) return;
      const dt = dataEfetiva(c); if (!dt) return;
      const mo = months.find((x) => x.month === dt.getMonth() && x.year === dt.getFullYear());
      if (mo) { mo.m += parseFloat(c.finalM) || 0; mo.p += parseFloat(c.finalP) || 0; }
    });
    spots.forEach((s) => {
      if (s.status !== 'Aprovado') return;
      const dt = dataEfetiva(s); if (!dt) return;
      const mo = months.find((x) => x.month === dt.getMonth() && x.year === dt.getFullYear());
      if (mo) mo.p += spotValor(s, calcO);
    });
    const total = months.reduce((a, m) => a + m.m + m.p, 0);
    return { buckets: months, daily: false, compact: chartPeriod === 12, total, empty: total <= 0 };
  }, [contratos, spots, chartPeriod, chartMonth, chartYear, customFrom, customTo, calcO]);

  const itensDoDia = useCallback((ano, mes, dia) => {
    const bate = (item) => { const dt = dataEfetiva(item); return dt && dt.getFullYear() === ano && dt.getMonth() === mes && dt.getDate() === dia; };
    const itens = [];
    contratos.forEach((c) => {
      const m = parseFloat(c.finalM) || 0, p = parseFloat(c.finalP) || 0;
      if ((m + p) > 0 && bate(c)) itens.push({ tipo: 'ct', id: c.id, nome: c.clientName, status: c.status, m, p, v: m + p });
    });
    spots.forEach((s) => {
      if (s.status !== 'Aprovado') return;
      const v = spotValor(s, calcO);
      if (v > 0 && bate(s)) itens.push({ tipo: 'spot', id: s.id, nome: s.clientName, status: s.status, m: 0, p: v, v });
    });
    return itens;
  }, [contratos, spots, calcO]);

  const MNAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return {
    ...resultado, chartPeriod, setChartPeriod, chartMonth, setChartMonth, chartYear, setChartYear,
    customFrom, setCustomFrom, customTo, setCustomTo, MNAMES, itensDoDia,
  };
}
