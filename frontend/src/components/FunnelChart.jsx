const CORES = ['#009FE3', '#15C2D8', '#7A8FB5', '#F5A623', '#1ECB7A'];

export default function FunnelChart({ etapas, totais, taxas }) {
  const max = Math.max(...etapas.map(([campo]) => totais[campo] || 0), 1);

  return (
    <div className="chart-wrap">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {etapas.map(([campo, label], i) => {
          const valor = totais[campo] || 0;
          const pct = Math.max(4, Math.round((valor / max) * 100));
          return (
            <div key={campo}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--g1)' }}>{label}</span>
                <strong style={{ color: 'var(--w)' }}>{valor}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: CORES[i % CORES.length], borderRadius: 6, transition: 'width .3s' }}></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mc-tots" style={{ marginTop: 16 }}>
        <div className="mc-row"><span>Leads → Atendimento</span><span>{taxas.leadsParaAtend}%</span></div>
        <div className="mc-row"><span>Atendimento → Reunião</span><span>{taxas.atendParaReuniao}%</span></div>
        <div className="mc-row"><span>Reunião → Proposta</span><span>{taxas.reuniaoParaProposta}%</span></div>
        <div className="mc-row"><span>Proposta → Fechado</span><span>{taxas.propostaParaFechado}%</span></div>
        <div className="mc-row hi"><span>Conversão geral (lead → fechado)</span><span>{taxas.geral}%</span></div>
      </div>
    </div>
  );
}
