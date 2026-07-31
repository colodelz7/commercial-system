import { useState, useEffect } from 'react';
import { R, calcO, fmtSeq } from '../../lib/format';
import { durLabel } from '../../lib/contractDocument';
import { validityInfo } from '../../hooks/useOrcamentos';
import { LOSS_REASONS } from '../../lib/constants';
import { gerarPdfOrcamento } from '../../lib/pdf';

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

export default function OrcamentoViewModal({ orc, onClose, onMudarStatus, onDuplicar, onEditar, onConverterContrato, onConverterSpot, onSalvarNotas, onEditarCompetencia }) {
  const [tab, setTab] = useState('info');
  const [notes, setNotes] = useState(orc?.notes || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState('');
  const [lossObs, setLossObs] = useState('');
  const [comp, setComp] = useState(orc?.competencia || '');

  useEffect(() => { setTab('info'); setNotes(orc?.notes || ''); setComp(orc?.competencia || ''); }, [orc]);

  if (!orc) return null;
  const t = calcO(orc.services || [], orc.disc || 0);
  const vi = validityInfo(orc);

  function confirmarPerdido() {
    onMudarStatus(orc.id, 'Perdido', lossReason, lossObs);
    setLossModalOpen(false);
  }

  function salvarNotasAcao() {
    onSalvarNotas(orc.id, notes);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  return (
    <div className="modal">
      <div className="mbox wide">
        <h3>Orçamento{orc.seq ? ` Nº ${fmtSeq(orc.seq)}` : ''} - {orc.clientName}</h3>
        <div className="modal-tabs">
          {TABS.map((tb) => (
            <button key={tb.k} className={`mtab${tab === tb.k ? ' active' : ''}`} onClick={() => setTab(tb.k)}>{tb.l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="mtab-content active">
            {orc.status === 'Aprovado' && <div className="banner-aprovado">✅ Orçamento Aprovado - pronto para transformar em contrato!</div>}
            <div className="mc-meta">
              <span className="mc-tag">{orc.status}</span>
              <span className="mc-tag">{orc.createdAt}</span>
              {orc.competencia && <span className="mc-tag">📅 Competência: {orc.competencia.split('-').reverse().join('/')}</span>}
              {vi && <span className="mc-tag">{vi.label}</span>}
              {orc.responsavel && <span className="mc-tag">👤 {orc.responsavel}</span>}
              {orc.origem && <span className="mc-tag">🎯 {orc.origem}</span>}
            </div>
            {orc.clientDoc && <p style={{ fontSize: '.83rem', color: 'var(--g2)', marginBottom: 6 }}>🪪 {orc.clientDoc}</p>}
            {orc.clientWpp && <p style={{ fontSize: '.83rem', color: 'var(--g2)', marginBottom: 6 }}>📱 {orc.clientWpp}{orc.clientEmail ? ` · ✉ ${orc.clientEmail}` : ''}</p>}
            <div className="mc-plans">
              {(orc.services || []).map((s, i) => (
                <div className="mc-plan" key={i}><span className="mc-plan-n">{s.name} <small style={{ color: 'var(--g2)' }}>({s.bill})</small></span><span className="mc-plan-p">{R(s.price)}</span></div>
              ))}
            </div>
            <div className="mc-tots">
              {t.m > 0 && <div className="mc-row"><span>Total Mensal</span><span>{R(t.m)}</span></div>}
              {t.p > 0 && <div className="mc-row"><span>Total Pontual</span><span>{R(t.p)}</span></div>}
              {orc.disc > 0 && <div className="mc-row"><span>Desconto ({orc.disc}%)</span><span>- {R(t.d)}</span></div>}
              <div className="mc-row hi"><span>Valor Final</span><span>{R(t.net)}</span></div>
              <div className="mc-row"><span>Prazo</span><span>{durLabel(orc.duration)} | {orc.payment}</span></div>
            </div>
            {orc.status === 'Perdido' && orc.lossReason && (
              <div className="loss-alert">❌ <strong>Motivo da perda:</strong> {orc.lossReason}{orc.lossReasonObs ? ` - ${orc.lossReasonObs}` : ''}</div>
            )}
            {orc.status === 'Aprovado' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Competência (mês que essa receita conta nos relatórios)</label>
                <input type="date" value={comp} onChange={(e) => setComp(e.target.value)} onBlur={() => onEditarCompetencia(orc.id, comp)} />
              </div>
            )}
          </div>
        )}

        {tab === 'status' && (
          <div className="mtab-content active">
            <div className="status-control">
              <label>Alterar Status do Orçamento</label>
              <div className="status-btns">
                <button className={`sbtn sbtn-eval${orc.status === 'Proposta em avaliação' ? ' active' : ''}`} onClick={() => onMudarStatus(orc.id, 'Proposta em avaliação')}>📋 Proposta em avaliação</button>
                <button className={`sbtn sbtn-approved${orc.status === 'Aprovado' ? ' active' : ''}`} onClick={() => onMudarStatus(orc.id, 'Aprovado')}>✅ Aprovado</button>
                <button className={`sbtn sbtn-lost${orc.status === 'Perdido' ? ' active' : ''}`} onClick={() => setLossModalOpen(true)}>❌ Perdido</button>
              </div>
            </div>
            <p style={{ color: 'var(--g2)', fontSize: '.82rem' }}>Clique no status desejado para atualizar este orçamento. O status <strong>Vencido</strong> é automático (quando passa a validade) e aparece no filtro.</p>
          </div>
        )}

        {tab === 'hist' && <div className="mtab-content active"><HistList history={orc.history} /></div>}

        {tab === 'notes' && (
          <div className="mtab-content active">
            <div className="field"><label>Observações internas</label><textarea style={{ minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas sobre este orçamento..." /></div>
            <button className="btn-p" style={{ marginTop: 8 }} onClick={salvarNotasAcao}>{savedMsg ? '✓ Salvo!' : '💾 Salvar observação'}</button>
          </div>
        )}

        <div className="modal-acts">
          <button className="btn-g" onClick={onClose}>Fechar</button>
          <button className="btn-s" onClick={() => onDuplicar(orc.id)}>📋 Duplicar</button>
          <button className="btn-s" onClick={() => onEditar(orc.id)}>✏️ Editar</button>
          <button className="btn-s" onClick={() => gerarPdfOrcamento(orc)}>📄 PDF Proposta</button>
          {orc.status === 'Aprovado' && <button className="btn-convert" onClick={() => onConverterContrato(orc.id)}>🔀 Transformar em Contrato</button>}
          {orc.status === 'Aprovado' && <button className="btn-convert" onClick={() => onConverterSpot(orc.id)}>⚡ Transformar em SPOT</button>}
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
