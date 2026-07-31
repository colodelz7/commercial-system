import { useState, useMemo } from 'react';
import { R, calcO, fmtSeq } from '../../lib/format';

const FILTROS = ['all', 'Em avaliação', 'Aprovado', 'Perdido'];
const BADGE = { 'Em avaliação': 'b-eval', 'Aprovado': 'b-approved', 'Perdido': 'b-lost' };

export default function SpotsTab({ spots, onNovo, onAbrir }) {
  const [filtro, setFiltro] = useState('all');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    let l = filtro === 'all' ? spots.items : spots.items.filter((s) => s.status === filtro);
    if (busca) l = l.filter((s) => (s.clientName || '').toLowerCase().includes(busca.toLowerCase()));
    return [...l].reverse();
  }, [spots.items, filtro, busca]);

  return (
    <div id="tab-spots" className="tab active">
      <div className="tab-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Buscar por nome ou nº (ex: 0150)..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="btn-p tt-action" onClick={onNovo}>＋ Novo SPOT</button>
      </div>
      <div className="filter-bar">
        {FILTROS.map((f) => (
          <button key={f} className={`fb${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>{f === 'all' ? 'Todos' : f}</button>
        ))}
      </div>

      <div className="clist">
        {lista.length === 0 && <div className="empty-state"><p>Nenhum item encontrado.</p></div>}
        {lista.map((s) => {
          const ini = (s.clientName || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          const t = calcO(s.services || [], s.disc || 0);
          return (
            <div className="crow" key={s.id} onClick={() => onAbrir(s.id)}>
              <div className="cav">{ini}</div>
              <div className="ci"><div className="ctype">SPOT{s.seq ? ` Nº ${fmtSeq(s.seq)}` : ''}</div><div className="cn">{s.clientName}</div><div className="crow-extra"><span className="cd">{s.createdAt}</span></div></div>
              <div className="cv">{t.net > 0 && <div className="cvp">{R(t.net)} pontual</div>}</div>
              <div className={`badge ${BADGE[s.status] || 'b-draft'}`}>{s.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
