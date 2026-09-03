import { useState, useRef } from 'react';
import { R, compactBRL } from '../lib/format';

export default function TrendChart({ serie, altura = 180 }) {
  const largura = 900;
  const padL = 46, padR = 14, padT = 16, padB = 26;
  const w = largura - padL - padR, h = altura - padT - padB;
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { idx, left, top }

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
  // Série mensal (3/6/12 meses) traz rótulo próprio; a diária, não.
  const porMes = serie.some((s) => s.rotulo);

  /* O SVG escala e centraliza o desenho dentro do espaço disponível, então
     converter a posição do mouse "na régua de três" (largura / largura em px)
     erra o alvo. getScreenCTM devolve a matriz real que o navegador aplicou,
     e a inversa dela leva o pixel da tela direto para a coordenada do gráfico. */
  function telaParaGrafico(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg || !svg.getScreenCTM) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = svg.createSVGPoint();
    p.x = clientX; p.y = clientY;
    return p.matrixTransform(ctm.inverse());
  }
  /** Caminho inverso: coordenada do gráfico para pixel dentro do container. */
  function graficoParaCaixa(x, y) {
    const svg = svgRef.current;
    const ctm = svg && svg.getScreenCTM && svg.getScreenCTM();
    if (!ctm) return { left: 0, top: 0 };
    const p = svg.createSVGPoint();
    p.x = x; p.y = y;
    const tela = p.matrixTransform(ctm);
    const caixa = svg.parentNode.getBoundingClientRect();
    return { left: tela.x - caixa.left, top: tela.y - caixa.top };
  }

  function onMove(e) {
    if (!pontos.length) return;
    const local = telaParaGrafico(e.clientX, e.clientY);
    if (!local) return;
    let idx = 0, menor = Infinity;
    pontos.forEach((p, i) => { const d = Math.abs(p.x - local.x); if (d < menor) { menor = d; idx = i; } });
    const alvo = pontos[idx];
    const pos = graficoParaCaixa(alvo.x, alvo.y);
    setHover({ idx, left: pos.left, top: pos.top });
  }

  if (totalMes <= 0) {
    return <div className="chart-empty">Nenhuma venda registrada neste período ainda. Preencha o checklist do dia com o valor fechado.</div>;
  }

  const ativo = hover ? pontos[hover.idx] : null;

  return (
    <div className="chart-wrap">
      <div className="trend-box">
        <svg
          ref={svgRef} viewBox={`0 0 ${largura} ${altura}`}
          style={{ width: '100%', height: altura, overflow: 'visible', cursor: 'crosshair', display: 'block' }}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        >
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
          {ativo && <line x1={ativo.x} x2={ativo.x} y1={padT} y2={padT + h} stroke="#009FE3" strokeWidth="1" strokeDasharray="3,3" opacity="0.55" />}
          {pontos.map((p, i) => (p.valor > 0 ? <circle key={i} cx={p.x} cy={p.y} r={hover && hover.idx === i ? 4.5 : 3} fill="#009FE3" /> : null))}
          {ativo && <circle cx={ativo.x} cy={ativo.y} r="7" fill="none" stroke="#009FE3" strokeWidth="1.5" opacity="0.45" />}
          {pontos.map((p, i) => (i % Math.ceil(n / 15 || 1) === 0 ? <text key={i} x={p.x} y={altura - 6} fontSize="8.5" fill="var(--g3)" textAnchor="middle">{p.dia}</text> : null))}
        </svg>
        {ativo && (
          <div className="trend-tooltip" style={{ left: hover.left, top: hover.top }}>
            <div className="tt-day">{ativo.rotulo ? ativo.rotulo : "Dia " + ativo.dia}</div>
            <div className="tt-val">{ativo.valor > 0 ? R(ativo.valor) : 'Sem venda'}</div>
            {ativo.fechados > 0 && <div className="tt-sub">{ativo.fechados} {ativo.fechados > 1 ? 'fechamentos' : 'fechamento'}</div>}
          </div>
        )}
      </div>
      <div className="chart-legend" style={{ marginTop: 6 }}>
        <span style={{ fontSize: '.75rem', color: 'var(--g2)' }}>
          Total do período: <strong style={{ color: 'var(--w)' }}>{R(totalMes)}</strong>
          {' '}em {diasComVenda} {porMes ? (diasComVenda === 1 ? 'mês' : 'meses') : 'dia(s)'} com venda
        </span>
      </div>
    </div>
  );
}
