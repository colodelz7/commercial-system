import { useMemo, useState, useEffect } from 'react';
import { R, fmtSeq, calcO } from '../../lib/format';
import { useOverviewPeriod } from '../../hooks/useOverviewPeriod';
import { useRevenueChart } from '../../hooks/useRevenueChart';
import ChartBars, { ChartLegend } from '../ChartBars';
import DiaModal from '../modals/DiaModal';

const PERIODOS = [
  { v: 'all', l: 'Tudo' }, { v: '1', l: 'Este mês' }, { v: '3', l: '3 meses' },
  { v: '6', l: '6 meses' }, { v: '12', l: '12 meses' },
];
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function OverviewTab({ orcamentos, contratos, spots, onAbrirOrc, onAbrirCt, onAbrirSpot }) {
  const ov = useOverviewPeriod();
  const chart = useRevenueChart(contratos.items, spots.items, calcO);
  const [diaInfo, setDiaInfo] = useState(null);

  // Escolher um mês na barra de período leva o gráfico de receita junto,
  // para a tela inteira falar do mesmo período.
  useEffect(() => {
    if (ov.ovPeriod !== 'mes') return;
    chart.setChartPeriod(1);
    chart.setChartMonth(ov.mesSel);
    chart.setChartYear(ov.anoSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ov.ovPeriod, ov.mesSel, ov.anoSel]);

  const fOrc = ov.filtrar(orcamentos.items);
  const fCt = ov.filtrar(contratos.items);
  const fSpot = ov.filtrar(spots.items);

  const kpis = useMemo(() => {
    const aprovO = fOrc.filter((o) => o.status === 'Aprovado').length;
    const vencO = fOrc.filter((o) => o.status === 'Vencido').length;
    const lostO = fOrc.filter((o) => o.status === 'Perdido').length;
    const denom = aprovO + vencO + lostO;
    const conv = denom > 0 ? Math.round((aprovO / denom) * 100) : 0;
    return {
      orc: fOrc.length, eval: fOrc.filter((o) => o.status === 'Proposta em avaliação').length,
      approved: aprovO, venc: vencO, lostOrc: lostO,
      ctTotal: fCt.length, wait: fCt.filter((c) => c.status === 'Aguardando assinatura').length,
      signed: fCt.filter((c) => c.status === 'Assinado').length, lostCt: fCt.filter((c) => c.status === 'Perdido').length,
      spotTotal: fSpot.length, spotApproved: fSpot.filter((s) => s.status === 'Aprovado').length,
      conv,
    };
  }, [fOrc, fCt, fSpot]);

  const revenue = useMemo(() => {
    let m = 0, p = 0, spotRev = 0;
    fCt.forEach((c) => { if (c.status === 'Assinado') { m += parseFloat(c.finalM) || 0; p += parseFloat(c.finalP) || 0; } });
    fSpot.forEach((s) => { if (s.status === 'Aprovado') spotRev += calcO(s.services || [], s.disc || 0).net; });
    return { m, p, spotRev, total: m + p + spotRev };
  }, [fCt, fSpot]);

  const recentes = useMemo(() => {
    return [
      ...fOrc.map((o) => ({ ...o, _t: 'orc' })),
      ...fCt.map((c) => ({ ...c, _t: 'ct' })),
    ].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
  }, [fOrc, fCt]);

  function onDayClick(ano, mes, dia) { setDiaInfo({ ano, mes, dia }); }
  const itensDoDiaSelecionado = diaInfo ? chart.itensDoDia(diaInfo.ano, diaInfo.mes, diaInfo.dia) : [];

  return (
    <div id="tab-overview" className="tab active">
      <div className="ov-period-bar">
        <span className="ov-period-lbl">Período</span>
        {PERIODOS.map((p) => (
          <button key={p.v} className={`ovp${ov.ovPeriod === p.v ? ' active' : ''}`} onClick={() => ov.selecionarPeriodo(p.v)}>{p.l}</button>
        ))}
        <span className={`ov-mes-group${ov.ovPeriod === 'mes' ? ' active' : ''}`}>
          <span className="ov-mes-lbl">Mês</span>
          <select className="ov-mes-sel" value={ov.mesSel} onChange={(e) => ov.selecionarMes(parseInt(e.target.value, 10), ov.anoSel)}>
            {MESES_NOME.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="ov-mes-sel ano" value={ov.anoSel} onChange={(e) => ov.selecionarMes(ov.mesSel, parseInt(e.target.value, 10))}>
            {[ov.anoSel - 2, ov.anoSel - 1, ov.anoSel, ov.anoSel + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>
        <span className={`ov-date-group${ov.ovPeriod === 'custom' ? ' active' : ''}`}>
          <label className="ov-date-lbl">De <input type="date" className="rel-date" value={ov.ovFrom} onChange={(e) => ov.aplicarCustom(e.target.value, ov.ovTo)} /></label>
          <label className="ov-date-lbl">Até <input type="date" className="rel-date" value={ov.ovTo} onChange={(e) => ov.aplicarCustom(ov.ovFrom, e.target.value)} /></label>
          <button className="ov-date-clear" type="button" title="Limpar intervalo" onClick={ov.limparCustom}>✕</button>
        </span>
      </div>

      {ov.ovPeriod === 'mes' && (
        <p className="ov-mes-aviso">Mostrando apenas <strong>{MESES_NOME[ov.mesSel]} de {ov.anoSel}</strong>. Os indicadores, o gráfico e a atividade recente abaixo consideram só esse mês.</p>
      )}

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-ic cyan"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div><div><p className="kpi-lbl">Total Orçamentos</p><p className="kpi-val">{kpis.orc}</p></div></div>
        <div className="kpi"><div className="kpi-ic yellow"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div><p className="kpi-lbl">Orçamentos em Avaliação</p><p className="kpi-val">{kpis.eval}</p></div></div>
        <div className="kpi"><div className="kpi-ic green"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div><div><p className="kpi-lbl">Orçamentos Aprovados</p><p className="kpi-val">{kpis.approved}</p></div></div>
        <div className="kpi"><div className="kpi-ic orange"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><line x1="4.5" y1="4.5" x2="19.5" y2="19.5" /></svg></div><div><p className="kpi-lbl">Orçamentos Vencidos</p><p className="kpi-val">{kpis.venc}</p></div></div>
        <div className="kpi"><div className="kpi-ic red"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div><div><p className="kpi-lbl">Orçamentos Perdidos</p><p className="kpi-val">{kpis.lostOrc}</p></div></div>
        <div className="kpi"><div className="kpi-ic cyan"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div><div><p className="kpi-lbl">Total Contratos</p><p className="kpi-val">{kpis.ctTotal}</p></div></div>
        <div className="kpi"><div className="kpi-ic orange"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div><div><p className="kpi-lbl">Contratos Aguardando Assinatura</p><p className="kpi-val">{kpis.wait}</p></div></div>
        <div className="kpi"><div className="kpi-ic green"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div><div><p className="kpi-lbl">Contratos Assinados</p><p className="kpi-val">{kpis.signed}</p></div></div>
        <div className="kpi"><div className="kpi-ic red"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div><div><p className="kpi-lbl">Contratos Perdidos</p><p className="kpi-val">{kpis.lostCt}</p></div></div>
        <div className="kpi"><div className="kpi-ic violet"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div><div><p className="kpi-lbl">Taxa de Conversão</p><p className="kpi-val">{kpis.conv}%</p></div></div>
        <div className="kpi"><div className="kpi-ic violet"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></div><div><p className="kpi-lbl">Total Spots</p><p className="kpi-val">{kpis.spotTotal}</p></div></div>
        <div className="kpi"><div className="kpi-ic green"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div><div><p className="kpi-lbl">Spots Aprovados</p><p className="kpi-val">{kpis.spotApproved}</p></div></div>
        <div className="kpi"><div className="kpi-ic cyan"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div><div><p className="kpi-lbl">Receita Mensal</p><p className="kpi-val">{R(revenue.m)}</p></div></div>
        <div className="kpi"><div className="kpi-ic cyan"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></div><div><p className="kpi-lbl">Receita Pontual</p><p className="kpi-val">{R(revenue.p)}</p></div></div>
        <div className="kpi"><div className="kpi-ic violet"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></div><div><p className="kpi-lbl">Receita Spot</p><p className="kpi-val">{R(revenue.spotRev)}</p></div></div>
        <div className="kpi"><div className="kpi-ic green"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div><div><p className="kpi-lbl">Receita Total</p><p className="kpi-val">{R(revenue.total)}</p></div></div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <span className="sec-title">Receita {chart.chartPeriod === 1 ? `- ${chart.MNAMES[chart.chartMonth]}` : chart.chartPeriod === 'custom' ? '- Personalizado' : `- Últimos ${chart.chartPeriod} Meses`}</span>
          <div className="chart-period-bar">
            <button className={`cpb${chart.chartPeriod === 1 ? ' active' : ''}`} onClick={() => chart.setChartPeriod(1)}>Mensal</button>
            <button className={`cpb${chart.chartPeriod === 6 ? ' active' : ''}`} onClick={() => chart.setChartPeriod(6)}>6 Meses</button>
            <button className={`cpb${chart.chartPeriod === 12 ? ' active' : ''}`} onClick={() => chart.setChartPeriod(12)}>12 Meses</button>
            <button className={`cpb${chart.chartPeriod === 'custom' ? ' active' : ''}`} onClick={() => chart.setChartPeriod('custom')}>Personalizado</button>
          </div>
        </div>
        {chart.chartPeriod === 1 && (
          <div className="chart-month-selector">
            <select className="chart-sel" value={chart.chartMonth} onChange={(e) => chart.setChartMonth(parseInt(e.target.value))}>
              {chart.MNAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="chart-sel" value={chart.chartYear} onChange={(e) => chart.setChartYear(parseInt(e.target.value))}>
              {[chart.chartYear - 2, chart.chartYear - 1, chart.chartYear].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        {chart.chartPeriod === 'custom' && (
          <div className="chart-month-selector">
            <label style={{ fontSize: '.75rem' }}>De</label>
            <input type="date" className="chart-sel" value={chart.customFrom} onChange={(e) => chart.setCustomFrom(e.target.value)} />
            <label style={{ fontSize: '.75rem' }}>Até</label>
            <input type="date" className="chart-sel" value={chart.customTo} onChange={(e) => chart.setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="chart-wrap">
          {chart.empty ? (
            <div className="chart-empty">
              {chart.chartPeriod === 'custom' && (!chart.customFrom || !chart.customTo)
                ? 'Selecione o período de e até para visualizar o gráfico.'
                : 'Crie contratos com valores para visualizar o gráfico aqui.'}
            </div>
          ) : (
            <>
              {chart.daily ? (
                <div className="chart-daily-scroll"><ChartBars buckets={chart.buckets} H={92} daily onDayClick={onDayClick} /></div>
              ) : (
                <ChartBars buckets={chart.buckets} H={110} compact={chart.compact} />
              )}
              <ChartLegend />
            </>
          )}
        </div>
      </div>

      <p className="sec-title">Atividade Recente</p>
      <div className="clist">
        {recentes.length === 0 && <div className="empty-state"><p>Nenhum item encontrado.</p></div>}
        {recentes.map((i) => {
          const ini = (i.clientName || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          if (i._t === 'orc') {
            const t = calcO(i.services || [], i.disc || 0);
            return (
              <div className="crow" key={i.id} onClick={() => onAbrirOrc(i.id)}>
                <div className="cav">{ini}</div>
                <div className="ci"><div className="ctype">Orçamento{i.seq ? ` Nº ${fmtSeq(i.seq)}` : ''}</div><div className="cn">{i.clientName}</div><div className="crow-extra"><span className="cd">{i.createdAt}</span></div></div>
                <div className="cv">{t.m > 0 && <div className="cvm">{R(t.m)}/mês</div>}{t.p > 0 && <div className="cvp">{R(t.p)} pontual</div>}</div>
                <div className="badge">{i.status}</div>
              </div>
            );
          }
          return (
            <div className="crow" key={i.id} onClick={() => onAbrirCt(i.id)}>
              <div className="cav">{ini}</div>
              <div className="ci"><div className="ctype">Contrato</div><div className="cn">{i.clientName}</div><div className="crow-extra"><span className="cd">{i.createdAt}</span></div></div>
              <div className="cv">{i.finalM > 0 && <div className="cvm">{R(i.finalM)}/mês</div>}{i.finalP > 0 && <div className="cvp">{R(i.finalP)} pontual</div>}</div>
              <div className="badge">{i.status}</div>
            </div>
          );
        })}
      </div>

      {diaInfo && (
        <DiaModal diaInfo={diaInfo} itens={itensDoDiaSelecionado} onClose={() => setDiaInfo(null)} onAbrirCt={onAbrirCt} onAbrirSpot={onAbrirSpot} />
      )}
    </div>
  );
}
