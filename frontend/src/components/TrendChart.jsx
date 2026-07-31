import { R, compactBRL } from '../lib/format';

export default function TrendChart({ serie, altura = 180 }) {
  const largura = 900;
  const padL = 46, padR = 14, padT = 16, padB = 26;
  const w = largura - padL - padR, h = altura - padT - padB;

  const max = Math.max(...serie.map((s) => s.valor), 1);
  const n = serie.length;
  const stepX = n > 1 ? w / (n - 1) : w;

  const pontos = serie.map((s, i) => {
    const x = padL + i * stepX;
    const y = padT + h - (s.valor / max) * h;
    return { x, y, ...s };
  });

  const linha = pontos.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const area = `${linha} L${pontos[pontos.length - 1]?.x || padL},${padT + h} L${padL},${padT + h} Z`;

  const totalMes = serie.reduce((a, s) => a + s.valor, 0);
  const diasComVenda = serie.filter((s) => s.valor > 0).length;

  if (totalMes <= 0) {
    return <div className="chart-empty">Nenhuma venda registrada neste mês ainda. Preencha o checklist do dia com o valor fechado.</div>;
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${largura} ${altura}`} style={{ width: '100%', height: altura, overflow: 'visible' }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#009FE3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#009FE3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padL} x2={largura - padR} y1={padT + h * (1 - f)} y2={padT + h * (1 - f)} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        ))}
        <text x={4} y={padT + 4} fontSize="9" fill="var(--g3)">{compactBRL(max)}</text>
        <text x={4} y={padT + h} fontSize="9" fill="var(--g3)">R$0</text>
        <path d={area} fill="url(#trendFill)" />
        <path d={linha} fill="none" stroke="#009FE3" strokeWidth="2" />
        {pontos.map((p, i) => (p.valor > 0 ? <circle key={i} cx={p.x} cy={p.y} r="3" fill="#009FE3" /> : null))}
        {pontos.map((p, i) => (i % Math.ceil(n / 15 || 1) === 0 ? <text key={i} x={p.x} y={altura - 6} fontSize="8.5" fill="var(--g3)" textAnchor="middle">{p.dia}</text> : null))}
      </svg>
      <div className="chart-legend" style={{ marginTop: 6 }}>
        <span style={{ fontSize: '.75rem', color: 'var(--g2)' }}>Total do mês: <strong style={{ color: 'var(--w)' }}>{R(totalMes)}</strong> em {diasComVenda} dia(s) com venda</span>
      </div>
    </div>
  );
}
