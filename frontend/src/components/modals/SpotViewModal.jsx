import { useState, useEffect } from 'react';
import { R, calcO } from '../../lib/format';
import { LOSS_REASONS } from '../../lib/constants';
import { gerarPdfSpot } from '../../lib/pdfSpot';

function HistList({ history }) {
  if (!history || !history.length) return <p style={{ color: 'var(--g3)', fontSize: '.85rem', padding: '12px 0' }}>Nenhum histórico ainda.</p>;
  return (
    <div className="hist-list">
      {[...history].reverse().map((h, i) => (
        <div className="hist-item" key={i}><div className="hist-dot">{h.icon}</div><div><div className="hist-action">{h.action}</div><div className="hist-time">{h.time}</div></div></div>
      ))}
    </div>
  );
}

const TABS = [
  { k: 'info', l: 'Detalhes' }, { k: 'status', l: 'Status' }, { k: 'hist', l: 'Histórico' }, { k: 'notes', l: 'Observações' },
];

export default function SpotViewModal({ spot, onClose, onMudarStatus, onEditar, onExcluir, onEditarCompetencia, onSalvarNotas }) {
  const [tab, setTab] = useState('info');
  const [notes, setNotes] = useState(spot?.notes || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState('');
  const [lossObs, setLossObs] = useState('');
  const [comp, setComp] = useState(spot?.competencia || '');

  useEffect(() => { setTab('info'); setNotes(spot?.notes || ''); setComp(spot?.competencia || ''); }, [spot]);

  if (!spot) return null;
  const t = calcO(spot.services || [], spot.disc || 0);

  function confirmarPerdido() {
    onMudarStatus(spot.id, 'Perdido', lossReason, lossObs);
    setLossModalOpen(false);
  }

  function salvarNotasAcao() {
    onSalvarNotas(spot.id, notes);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  return (
    <div className="modal">
      <div className="mbox wide">
        <h3>SPOT - {spot.clientName}</h3>
        <div className="modal-tabs">
          {TABS.map((tb) => (
            <button key={tb.k} className={`mtab${tab === tb.k ? ' active' : ''}`} onClick={() => setTab(tb.k)}>{tb.l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="mtab-content active">
            <div className="mc-meta">
              <span className="mc-tag">{spot.status}</span>
              <span className="mc-tag">{spot.createdAt}</span>
              {spot.competencia && <span className="mc-tag">📅 Competência: {spot.competencia.split('-').reverse().join('/')}</span>}
              {spot.responsavel && <span className="mc-tag">👤 {spot.responsavel}</span>}
              {spot.origem && <span className="mc-tag">🎯 {spot.origem}</span>}
            </div>
            {spot.clientDoc && <p style={{ fontSize: '.83rem', color: 'var(--g2)', marginBottom: 6 }}>🪪 {spot.clientDoc}</p>}
            {spot.clientWpp && <p style={{ fontSize: '.83rem', color: 'var(--g2)', marginBottom: 6 }}>📱 {spot.clientWpp}{spot.clientEmail ? ` · ✉ ${spot.clientEmail}` : ''}</p>}
            <div className="mc-plans">
              {(spot.services || []).map((s, i) => (
                <div className="mc-plan" key={i}><span className="mc-plan-n">{s.name} <small style={{ color: 'var(--g2)' }}>(pontual)</small></span><span className="mc-plan-p">{R(s.price)}</span></div>
              ))}
            </div>
            <div className="mc-tots">
              {t.p > 0 && <div className="mc-row"><span>Total Pontual</span><span>{R(t.p)}</span></div>}
              {spot.disc > 0 && <div className="mc-row"><span>Desconto ({spot.disc}%)</span><span>- {R(t.d)}</span></div>}
              <div className="mc-row hi"><span>Valor Final</span><span>{R(t.net)}</span></div>
            </div>
            {spot.status === 'Perdido' && spot.lossReason && (
              <div className="loss-alert">❌ <strong>Motivo da perda:</strong> {spot.lossReason}{spot.lossReasonObs ? ` - ${spot.lossReasonObs}` : ''}</div>
            )}
            {spot.status === 'Aprovado' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Competência (mês que essa receita conta nos relatórios)</label>
                <input type="date" value={comp} onChange={(e) => setComp(e.target.value)} onBlur={() => onEditarCompetencia(spot.id, comp)} />
              </div>
            )}
          </div>
        )}

        {tab === 'status' && (
          <div className="mtab-content active">
            <div className="status-control">
              <label>Alterar Status do SPOT</label>
              <div className="status-btns">
                <button className={`sbtn sbtn-eval${spot.status === 'Em avaliação' ? ' active' : ''}`} onClick={() => onMudarStatus(spot.id, 'Em avaliação')}>📋 Em avaliação</button>
                <button className={`sbtn sbtn-approved${spot.status === 'Aprovado' ? ' active' : ''}`} onClick={() => onMudarStatus(spot.id, 'Aprovado')}>✅ Aprovado</button>
                <button className={`sbtn sbtn-lost${spot.status === 'Perdido' ? ' active' : ''}`} onClick={() => setLossModalOpen(true)}>❌ Perdido</button>
              </div>
            </div>
            <p style={{ color: 'var(--g2)', fontSize: '.82rem' }}>Ao marcar como <strong>Aprovado</strong>, o valor do SPOT é somado automaticamente à Receita Pontual na Visão Geral.</p>
          </div>
        )}

        {tab === 'hist' && <div className="mtab-content active"><HistList history={spot.history} /></div>}

        {tab === 'notes' && (
          <div className="mtab-content active">
            <div className="field"><label>Observações internas</label><textarea style={{ minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas sobre este SPOT..." /></div>
            <button className="btn-p" style={{ marginTop: 8 }} onClick={salvarNotasAcao}>{savedMsg ? '✓ Salvo!' : '💾 Salvar observação'}</button>
          </div>
        )}

        <div className="modal-acts">
          <button className="btn-g" onClick={onClose}>Fechar</button>
          <button className="btn-s" onClick={() => gerarPdfSpot(spot)}>📄 PDF SPOT</button>
          <button className="btn-s" onClick={() => onEditar(spot.id)}>✏️ Editar</button>
          <button className="btn-g" onClick={() => onExcluir(spot.id)}>🗑 Excluir</button>
        </div>

        {lossModalOpen && (
          <div className="modal">
            <div className="mbox">
              <h3>Motivo da perda</h3>
              <div className="field">
                <label>Motivo</label>
                <select value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                  <option value="">Selecione o motivo...</option>
                  {LOSS_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field"><label>Observações</label><textarea value={lossObs} onChange={(e) => setLossObs(e.target.value)} /></div>
              <div className="modal-acts">
                <button className="btn-g" onClick={() => setLossModalOpen(false)}>Cancelar</button>
                <button className="btn-p" onClick={confirmarPerdido}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
