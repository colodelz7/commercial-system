import { useState, useMemo } from 'react';
import { R, calcO, fmtSeq } from '../../lib/format';
import { validityInfo } from '../../hooks/useOrcamentos';

const FILTROS = ['all', 'Proposta em avaliação', 'Aprovado', 'Vencido', 'Perdido'];
const BADGE = { 'Rascunho': 'b-draft', 'Proposta em avaliação': 'b-eval', 'Aprovado': 'b-approved', 'Perdido': 'b-lost', 'Vencido': 'b-lost' };

export default function OrcamentosTab({ orcamentos, onAbrir }) {
  const [filtro, setFiltro] = useState('all');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    let l = filtro === 'all' ? orcamentos.items : orcamentos.items.filter((o) => o.status === filtro);
    if (busca) {
      const q = busca.toLowerCase().replace(/^n[ºo°.\s]*/i, '').trim();
      l = l.filter((o) => (o.clientName || '').toLowerCase().includes(busca.toLowerCase()) || String(o.seq || '').includes(q));
    }
    return [...l].reverse();
  }, [orcamentos.items, filtro, busca]);

  return (
    <div id="tab-orcamentos" className="tab active">
      <div className="list-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Buscar por nome ou nº (ex: 0150)..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="filter-bar">
          <button className={`fb${filtro === 'all' ? ' active' : ''}`} onClick={() => setFiltro('all')}>Todos</button>
          {FILTROS.slice(1).map((f) => (
            <button key={f} className={`fb${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="clist">
        {lista.length === 0 && <div className="empty-state"><p>Nenhum item encontrado.</p></div>}
        {lista.map((o) => {
          const ini = (o.clientName || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          const t = calcO(o.services || [], o.disc || 0);
          const vi = validityInfo(o);
          return (
            <div className="crow" key={o.id} onClick={() => onAbrir(o.id)}>
              <div className="cav">{ini}</div>
              <div className="ci">
                <div className="ctype">Orçamento{o.seq ? ` Nº ${fmtSeq(o.seq)}` : ''}</div>
                <div className="cn">{o.clientName}</div>
                <div className="crow-extra">
                  <span className="cd">{o.createdAt}</span>
                  {vi && <span className={`vbadge ${vi.cls}`}>{vi.label}</span>}
                </div>
              </div>
              <div className="cv">
                {t.m > 0 && <div className="cvm">{R(t.m)}/mês</div>}
                {t.p > 0 && <div className="cvp">{R(t.p)} pontual</div>}
              </div>
              <div className={`badge ${BADGE[o.status] || 'b-draft'}`}>{o.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
