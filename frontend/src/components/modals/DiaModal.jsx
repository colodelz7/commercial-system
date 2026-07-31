import { R } from '../../lib/format';

const MNS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function DiaModal({ diaInfo, itens, onClose, onAbrirCt, onAbrirSpot }) {
  if (!diaInfo) return null;
  const { ano, mes, dia } = diaInfo;
  const total = itens.reduce((a, i) => a + i.v, 0);

  return (
    <div className="modal">
      <div className="mbox">
        <h3>📅 {dia} de {MNS[mes]} de {ano} · {R(total)}</h3>
        <div className="hist-list">
          {itens.length === 0 && <p className="empty-sel">Nenhum lançamento neste dia.</p>}
          {itens.map((i) => {
            const det = `${i.tipo === 'ct' ? 'Contrato' : 'SPOT'} · ${i.status || ''}${i.m ? ` · mensal ${R(i.m)}` : ''}${i.tipo === 'ct' && i.p ? ` · pontual ${R(i.p)}` : ''}`;
            return (
              <div className="mc-plan" style={{ cursor: 'pointer' }} key={i.id} onClick={() => { onClose(); if (i.tipo === 'ct') onAbrirCt(i.id); else onAbrirSpot(i.id); }}>
                <span className="mc-plan-n">{i.nome || '(sem nome)'} <small style={{ color: 'var(--g2)' }}>{det}</small></span>
                <span className="mc-plan-p">{R(i.v)}</span>
              </div>
            );
          })}
        </div>
        <div className="modal-acts"><button className="btn-g" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}
