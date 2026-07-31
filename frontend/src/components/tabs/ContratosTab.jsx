import { useState, useMemo } from 'react';
import { R } from '../../lib/format';
import { contractRenewalInfo } from '../../hooks/useContratos';

const FILTROS = ['all', 'Aguardando assinatura', 'Assinado', 'Perdido'];
const BADGE = { 'Rascunho': 'b-draft', 'Aguardando assinatura': 'b-waiting', 'Assinado': 'b-signed', 'Perdido': 'b-lost' };

export default function ContratosTab({ contratos, onAbrir }) {
  const [filtro, setFiltro] = useState('all');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    let l = filtro === 'all' ? contratos.items : contratos.items.filter((c) => c.status === filtro);
    if (busca) l = l.filter((c) => (c.clientName || '').toLowerCase().includes(busca.toLowerCase()));
    return [...l].reverse();
  }, [contratos.items, filtro, busca]);

  return (
    <div id="tab-contratos" className="tab active">
      <div className="list-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="filter-bar">
          {FILTROS.map((f) => (
            <button key={f} className={`fb${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>{f === 'all' ? 'Todos' : f}</button>
          ))}
        </div>
      </div>

      <div className="clist">
        {lista.length === 0 && <div className="empty-state"><p>Nenhum item encontrado.</p></div>}
        {lista.map((c) => {
          const ini = (c.clientName || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          const ri = contractRenewalInfo(c);
          return (
            <div className="crow" key={c.id} onClick={() => onAbrir(c.id)}>
              <div className="cav">{ini}</div>
              <div className="ci">
                <div className="ctype">Contrato</div>
                <div className="cn">{c.clientName}</div>
                <div className="crow-extra">
                  <span className="cd">{c.createdAt}</span>
                  {ri && <span className={`vbadge ${ri.cls}`}>🔄 {ri.label}</span>}
                </div>
              </div>
              <div className="cv">
                {c.finalM > 0 && <div className="cvm">{R(c.finalM)}/mês</div>}
                {c.finalP > 0 && <div className="cvp">{R(c.finalP)} pontual</div>}
              </div>
              <div className={`badge ${BADGE[c.status] || 'b-draft'}`}>{c.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
