import { useState, useMemo } from 'react';
import { handoffProgress } from '../../hooks/useHandoffs';

const FILTROS = ['all', 'Rascunho', 'Concluído'];
const BADGE = { 'Rascunho': 'b-draft', 'Concluído': 'b-signed' };
const PRI_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

export default function HandoffTab({ handoffs, onNovo, onAbrir }) {
  const [filtro, setFiltro] = useState('all');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    let l = filtro === 'all' ? handoffs.items : handoffs.items.filter((h) => h.status === filtro);
    if (busca) l = l.filter((h) => (h.clientName || '').toLowerCase().includes(busca.toLowerCase()));
    return [...l].reverse();
  }, [handoffs.items, filtro, busca]);

  function onDelete(h) {
    if (!confirm(`Excluir o handoff de "${h.clientName || '(sem cliente)'}"?\n\nEsta ação não pode ser desfeita.`)) return;
    handoffs.excluir(h.id);
  }

  return (
    <div id="tab-handoff" className="tab active">
      <div className="tab-toolbar">
        <div className="search-box"><input type="text" placeholder="Buscar por cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <button className="btn-p tt-action" onClick={onNovo}>＋ Novo Handoff</button>
      </div>
      <div className="filter-bar">
        {FILTROS.map((f) => (
          <button key={f} className={`fb${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>{f === 'all' ? 'Todos' : f}</button>
        ))}
      </div>

      <div className="clist">
        {lista.length === 0 && <div className="empty-state"><p>Nenhum handoff ainda. Clique em "Novo Handoff".</p></div>}
        {lista.map((h) => {
          const ini = (h.clientName || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
          const pr = handoffProgress(h);
          return (
            <div className="crow" key={h.id} onClick={() => onAbrir(h.id)}>
              <div className="cav">{ini}</div>
              <div className="ci">
                <div className="ctype">Handoff</div>
                <div className="cn">{h.clientName || '(sem cliente)'}</div>
                <div className="crow-extra">
                  <span className="cd">{h.createdAt}</span>
                  <span className="vbadge v-neutral">{pr.done}/{pr.total} respondidas</span>
                  {h.prioridade && <span className={`ho-pri ho-pri-${h.prioridade}`}>{PRI_LABEL[h.prioridade] || h.prioridade}</span>}
                </div>
              </div>
              <div className="cv"></div>
              <div className={`badge ${BADGE[h.status] || 'b-draft'}`}>{h.status || 'Rascunho'}</div>
              <button className="btn-d ho-del" title="Excluir handoff" onClick={(e) => { e.stopPropagation(); onDelete(h); }}>🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
