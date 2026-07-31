import { R, compactBRL } from '../lib/format';

export default function ChartBars({ buckets, H = 110, daily = false, compact = false, onDayClick }) {
  const minH = daily ? 3 : 4;
  const maxVal = Math.max(...buckets.map((b) => b.m + b.p), 1);

  return (
    <div className="chart-bars-row">
      {buckets.map((b, i) => {
        const total = b.m + b.p;
        const hm = total ? Math.max(minH, Math.round((b.m / maxVal) * H)) : 0;
        const hp = total ? Math.max(minH, Math.round((b.p / maxVal) * H)) : 0;
        const clicavel = daily && onDayClick && b.day;
        return (
          <div
            className={daily ? 'chart-col chart-col-day' : 'chart-col'} title={b.title || ''} key={i}
            style={clicavel ? { cursor: 'pointer' } : undefined}
            onClick={clicavel ? () => onDayClick(b.ano, b.mes, b.day) : undefined}
          >
            {(daily || total > 0) && (
              <div className={daily ? 'chart-val-daily' : 'chart-val-lbl'}>
                {total ? (compact || daily ? compactBRL(total) : R(total)) : ''}
              </div>
            )}
            <div className="chart-bar-stack">
              {hp > 0 && <div className="bar-p" style={{ height: hp }}></div>}
              {hm > 0 && <div className={`bar-m${hp ? '' : ' top'}`} style={{ height: hm }}></div>}
              {!total && <div className="bar-empty"></div>}
            </div>
            <div className="chart-month-lbl">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="chart-legend">
      <div className="chart-legend-item"><div className="chart-legend-dot" style={{ background: '#008AFC' }}></div>Mensal</div>
      <div className="chart-legend-item"><div className="chart-legend-dot" style={{ background: 'rgba(0,138,252,.38)' }}></div>Pontual</div>
    </div>
  );
}
