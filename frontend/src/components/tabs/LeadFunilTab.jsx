import { useState } from 'react';
import { R } from '../../lib/format';
import { LEAD_STAGES, LEAD_TEMP } from '../../hooks/useLeads';
import LeadModal from '../modals/LeadModal';

function LeadCard({ lead, color, onClick, onDragStart }) {
  const ini = (lead.name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <div className="kcard" draggable onClick={onClick} onDragStart={onDragStart} style={{ '--stage': color }}>
      <div className="kcard-head">
        <span className="kcard-av">{ini}</span>
        <div className="kcard-headtxt"><span className="kcard-tipo">{lead.empresa || 'Lead'}</span><span className="kcard-name">{lead.name || '(sem nome)'}</span></div>
      </div>
      {parseFloat(lead.valor) > 0 && <div className="kcard-vals"><div className="kval"><span className="kval-num">{R(lead.valor)}</span></div></div>}
      {(lead.temp || lead.origem) && (
        <div className="kcard-foot">
          {lead.temp && <span className="kchip">{LEAD_TEMP[lead.temp] || ''} {lead.temp}</span>}
          {lead.origem && <span className="kchip">🎯 {lead.origem}</span>}
        </div>
      )}
    </div>
  );
}

export default function LeadFunilTab({ leads }) {
  const [colOver, setColOver] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  function onDrop(e, stageKey) {
    e.preventDefault();
    setColOver(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) leads.moverEtapa(id, stageKey);
  }

  function abrirNovo() { setEditando(null); setModalOpen(true); }
  function abrirEdicao(l) { setEditando(l); setModalOpen(true); }
  function excluir(id) {
    if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
    leads.excluir(id);
    setModalOpen(false);
  }

  return (
    <div id="tab-leadfunil" className="tab active">
      <div className="svc-head svc-head-solo">
        <button className="btn-p" onClick={abrirNovo}>＋ Adicionar Lead</button>
      </div>
      <div className="kanban" id="lead-board">
        {LEAD_STAGES.map((col) => {
          const cards = leads.items.filter((l) => (l.stage || 'leads') === col.key).slice().reverse();
          const total = cards.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
          return (
            <div
              key={col.key} className={`kcol${colOver === col.key ? ' kover' : ''}`} style={{ '--stage': col.color }}
              onDragOver={(e) => { e.preventDefault(); setColOver(col.key); }}
              onDragLeave={() => setColOver(null)}
              onDrop={(e) => onDrop(e, col.key)}
            >
              <div className="kcol-hd"><span className="kcol-dot"></span><span className="kcol-title">{col.title}</span><span className="kcol-count">{cards.length}</span></div>
              <div className="lead-col-val">{R(total)}</div>
              <div className="kcol-body">
                {cards.length === 0 && <div className="kcol-empty">Nenhum lead</div>}
                {cards.map((l) => (
                  <LeadCard
                    key={l.id} lead={l} color={col.color}
                    onClick={() => abrirEdicao(l)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <LeadModal
        open={modalOpen} editando={editando}
        onClose={() => setModalOpen(false)}
        onSave={(dados) => { leads.salvar(dados); setModalOpen(false); }}
        onDelete={excluir}
      />
    </div>
  );
}
