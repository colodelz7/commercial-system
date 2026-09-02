import { useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { R } from '../lib/format';

ChartJS.register(ArcElement, Tooltip);

const CORES = ['#008AFC', '#1ecb7a', '#f5a623', '#e84040', '#9b59f5', '#00c2c7', '#ff7ac2', '#7a8fb5', '#3a4f78', '#ffb347'];

function comAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function RevenuePieChart({ arr, total }) {
  const [ativo, setAtivo] = useState(null);

  const cores = useMemo(
    () => arr.map((_, i) => (ativo === null || ativo === i ? CORES[i % CORES.length] : comAlpha(CORES[i % CORES.length], 0.28))),
    [arr, ativo]
  );

  const data = useMemo(() => ({
    labels: arr.map((x) => x.cat),
    datasets: [{
      data: arr.map((x) => x.val),
      backgroundColor: cores,
      borderColor: 'transparent',
      hoverOffset: 6,
    }],
  }), [arr, cores]);

  const options = useMemo(() => ({
    cutout: '68%',
    onHover: (_evt, elements) => setAtivo(elements.length ? elements[0].index : null),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed;
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            return ` ${R(v)} (${pct}%)`;
          },
        },
      },
    },
  }), [total]);

  if (!total) {
    return <p className="empty-sel">Nenhum serviço vendido no período.</p>;
  }

  const emFoco = ativo != null ? arr[ativo] : null;

  return (
    <div className="rel-donut-body">
      <div className="rel-donut-wrap" onMouseLeave={() => setAtivo(null)}>
        <Doughnut data={data} options={options} />
        <div className="rel-donut-center">
          <span className="rel-donut-ctxt">{R(emFoco ? emFoco.val : total)}</span>
          <span className="rel-donut-csub">{emFoco ? emFoco.cat : 'total'}</span>
        </div>
      </div>
      <div className="rel-donut-legend">
        {arr.map((x, i) => (
          <div
            className={`rel-donut-li${ativo === i ? ' on' : ''}`} key={x.cat}
            onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)}
          >
            <span className="rel-donut-dot" style={{ background: CORES[i % CORES.length] }}></span>
            <span className="rel-donut-cat">{x.cat}</span>
            <span className="rel-donut-val">{R(x.val)} · {total > 0 ? Math.round((x.val / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
