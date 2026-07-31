import { useState, useMemo } from 'react';
import { R, calcO, fmtSeq } from '../../lib/format';

const FUNIL_COLS = [
  { key: 'diag', color: '#009fe3', title: 'Diagnóstico', accept: ['dg'], match: (i) => i._t === 'dg' && i.status !== 'Perdido' },
  { key: 'aval', color: '#f5a623', title: 'Orçamento em avaliação', accept: ['orc'], match: (i) => i._t === 'orc' && i.status === 'Proposta em avaliação', setStatus: 'Proposta em avaliação' },
  { key: 'aprov', color: '#1ecb7a', title: 'Orçamento aprovado', accept: ['orc'], match: (i) => i._t === 'orc' && i.status === 'Aprovado', setStatus: 'Aprovado' },
  { key: 'aguard', color: '#008AFC', title: 'Aguardando assinatura', accept: ['ct'], match: (i) => i._t === 'ct' && i.status === 'Aguardando assinatura', setStatus: 'Aguardando assinatura' },
  { key: 'assin', color: '#15c2d8', title: 'Contrato assinado', accept: ['ct'], match: (i) => i._t === 'ct' && i.status === 'Assinado', setStatus: 'Assinado' },
  { key: 'perd', color: '#f05a5a', title: 'Perdidos / Vencidos', accept: ['orc', 'ct', 'dg'], match: (i) => (i._t === 'orc' && (i.status === 'Perdido' || i.status === 'Vencido')) || (i._t === 'ct' && i.status === 'Perdido') || (i._t === 'dg' && i.status === 'Perdido'), setStatus: 'Perdido' },
];

function FunilCard({ item, onClick, onDragStart }) {
  const tipo = item._t === 'orc' ? `Orçamento${item.seq ? ` Nº ${fmtSeq(item.seq)}` : ''}` : item._t === 'dg' ? 'Diagnóstico' : 'Contrato';
  const ini = (item.clientName || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  let m = 0, p = 0;
  if (item._t === 'orc') { const t = calcO(item.services || [], item.disc || 0); m = t.m; p = t.p; }
  else if (item._t === 'dg') { (item.services || []).forEach((s) => { if (s.bill === 'mensal') m += s.price || 0; else p += s.price || 0; }); }
  else { m = item.finalM || 0; p = item.finalP || 0; }

  return (
    <div className="kcard" draggable onClick={onClick} onDragStart={onDragStart}>
      <div className="kcard-head">
        <span className="kcard-av">{ini}</span>
        <div className="kcard-headtxt">
          <span className="kcard-tipo">{tipo}{item.status === 'Vencido' ? <> · <b className="kcard-venc">Vencido</b></> : null}</span>
          <span className="kcard-name">{item.clientName}</span>
        </div>
      </div>
      {(m > 0 || p > 0) && (
        <div className="kcard-vals">
          {m > 0 && <div className="kval"><span className="kval-num">{R(m)}</span><span className="kval-tag tag-m">mês</span></div>}
          {p > 0 && <div className="kval"><span className="kval-num">{R(p)}</span><span className="kval-tag tag-p">único</span></div>}
        </div>
      )}
      {(item.responsavel || item.origem) && (
        <div className="kcard-foot">
          {item.responsavel && <span className="kchip">👤 {item.responsavel}</span>}
          {item.origem && <span className="kchip">🎯 {item.origem}</span>}
        </div>
      )}
    </div>
  );
}

export default function FunilTab({ orcamentos, contratos, diagnosticos, onAbrirOrc, onAbrirCt, onAbrirDiag }) {
  const [colOver, setColOver] = useState(null);

  const items = useMemo(() => [
    ...diagnosticos.items.map((d) => ({ ...d, _t: 'dg' })),
    ...orcamentos.items.map((o) => ({ ...o, _t: 'orc' })),
    ...contratos.items.map((c) => ({ ...c, _t: 'ct' })),
  ], [diagnosticos.items, orcamentos.items, contratos.items]);

  function onDrop(e, col) {
    e.preventDefault();
    setColOver(null);
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (!data) return;
    const { id, type } = data;
    if (!col.accept.includes(type)) {
      alert(`Não dá para mover este item para "${col.title}".\n\nOrçamentos e contratos seguem fluxos diferentes - para virar contrato, use "Transformar em Contrato" no orçamento aprovado.`);
      return;
    }
    if (type === 'dg') {
      diagnosticos.mudarStatus(id, col.key === 'perd' ? 'Perdido' : 'Diagnóstico');
      return;
    }
    if (col.key === 'perd') {
      if (type === 'orc') orcamentos.mudarStatus(id, 'Perdido');
      else contratos.mudarStatus(id, 'Perdido');
      return;
    }
    if (type === 'orc') orcamentos.mudarStatus(id, col.setStatus);
    else contratos.mudarStatus(id, col.setStatus);
  }

  function abrirItem(item) {
    if (item._t === 'dg') onAbrirDiag(item.id);
    else if (item._t === 'orc') onAbrirOrc(item.id);
    else onAbrirCt(item.id);
  }

  return (
    <div id="tab-funil" className="tab active">
      <div className="kanban" id="funil-board">
        {FUNIL_COLS.map((col) => {
          const cards = items.filter(col.match).reverse();
          return (
            <div
              key={col.key} className={`kcol${colOver === col.key ? ' kover' : ''}`} style={{ '--stage': col.color }}
              onDragOver={(e) => { e.preventDefault(); setColOver(col.key); }}
              onDragLeave={() => setColOver(null)}
              onDrop={(e) => onDrop(e, col)}
            >
              <div className="kcol-hd"><span className="kcol-dot"></span><span className="kcol-title">{col.title}</span><span className="kcol-count">{cards.length}</span></div>
              <div className="kcol-body">
                {cards.length === 0 && <div className="kcol-empty">Nenhum item</div>}
                {cards.map((item) => (
                  <FunilCard
                    key={item.id} item={item}
                    onClick={() => abrirItem(item)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type: item._t }))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
