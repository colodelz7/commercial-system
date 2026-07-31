import { useState, useEffect } from 'react';
import { R } from '../../lib/format';
import { durLabel } from '../../lib/contractDocument';
import { contractRenewalInfo } from '../../hooks/useContratos';
import { LOSS_REASONS } from '../../lib/constants';
import { gerarPdfContrato } from '../../lib/pdfContrato';
import { DB } from '../../lib/db';

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

export default function ContratoViewModal({ ct, onClose, onMudarStatus, onSalvarNotas, onEditarCompetencia, onGerarLink }) {
  const [tab, setTab] = useState('info');
  const [notes, setNotes] = useState(ct?.notes || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState('');
  const [lossObs, setLossObs] = useState('');
  const [comp, setComp] = useState(ct?.competencia || '');

  useEffect(() => { setTab('info'); setNotes(ct?.notes || ''); setComp(ct?.competencia || ''); }, [ct]);

  if (!ct) return null;
  const ri = contractRenewalInfo(ct);
  const disc = ct.disc || 0;
  const bruto = (ct.finalM || 0) + (ct.finalP || 0);

  function confirmarPerdido() {
    onMudarStatus(ct.id, 'Perdido', lossReason, lossObs);
    setLossModalOpen(false);
  }

  function salvarNotasAcao() {
    onSalvarNotas(ct.id, notes);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  return (
    <div className="modal">
      <div className="mbox wide">
        <h3>Contrato - {ct.clientName}</h3>
        <div className="modal-tabs">
          {TABS.map((tb) => (
            <button key={tb.k} className={`mtab${tab === tb.k ? ' active' : ''}`} onClick={() => setTab(tb.k)}>{tb.l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="mtab-content active">
            <div className="mc-meta">
              <span className="mc-tag">{ct.status}</span>
              <span className="mc-tag">{ct.createdAt}</span>
              {ct.competencia && <span className="mc-tag">📅 Competência: {ct.competencia.split('-').reverse().join('/')}</span>}
              {ct.responsavel && <span className="mc-tag">👤 {ct.responsavel}</span>}
            </div>
            {ct.clientWpp && <p style={{ fontSize: '.83rem', color: 'var(--g2)', marginBottom: 6 }}>📱 {ct.clientWpp}{ct.clientEmail ? ` · ✉ ${ct.clientEmail}` : ''}</p>}
            <div className="mc-plans">
              {(ct.plans || []).map((p, i) => (
                <div className="mc-plan" key={i}><span className="mc-plan-n">{p.name} <small style={{ color: 'var(--g2)' }}>({p.bill})</small></span><span className="mc-plan-p">{R(p.price)}</span></div>
              ))}
            </div>
            <div className="mc-tots">
              {ct.finalM > 0 && <div className="mc-row"><span>Mensal Final</span><span>{R(ct.finalM)}</span></div>}
              {ct.finalP > 0 && <div className="mc-row"><span>Pontual Final</span><span>{R(ct.finalP)}</span></div>}
              {disc > 0 && <div className="mc-row"><span>Desconto</span><span>{R(bruto * disc / 100)} ({disc}%)</span></div>}
              <div className="mc-row"><span>Total</span><span>{R(bruto * (1 - disc / 100))}</span></div>
              <div className="mc-row"><span>Duração</span><span>{durLabel(ct.duration)}</span></div>
              <div className="mc-row"><span>Vencimento</span><span>{ct.due === 'ato' ? 'no ato da assinatura' : `dia ${ct.due}`}</span></div>
              {ri && <div className="mc-row"><span>Fim do contrato</span><span>{ri.end} ({ri.label})</span></div>}
              {ct.clientLink && <div className="mc-row"><span>Link</span><span style={{ color: 'var(--c)', fontSize: '.75rem' }}>?cliente={ct.clientLink}</span></div>}
            </div>
            {ct.clientData && (
              <div className="mc-tots" style={{ marginTop: 10 }}>
                <div className="mc-row"><span>Empresa</span><span>{ct.clientData.razao}</span></div>
                <div className="mc-row"><span>CNPJ/CPF</span><span>{ct.clientData.cnpj}</span></div>
                <div className="mc-row"><span>Responsável</span><span>{ct.clientData.resp}</span></div>
                {ct.signedAt && <div className="mc-row"><span>Assinado em</span><span style={{ color: 'var(--ok)' }}>{ct.signedAt}</span></div>}
              </div>
            )}
            {ct.status === 'Perdido' && ct.lossReason && (
              <div className="loss-alert">❌ <strong>Motivo da perda:</strong> {ct.lossReason}{ct.lossReasonObs ? ` - ${ct.lossReasonObs}` : ''}</div>
            )}
            {ct.status === 'Assinado' && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Competência (mês que essa receita conta nos relatórios)</label>
                <input type="date" value={comp} onChange={(e) => setComp(e.target.value)} onBlur={() => onEditarCompetencia(ct.id, comp)} />
              </div>
            )}
          </div>
        )}

        {tab === 'status' && (
          <div className="mtab-content active">
            <div className="status-control">
              <label>Alterar Status do Contrato</label>
              <div className="status-btns">
                <button className={`sbtn sbtn-waiting${ct.status === 'Aguardando assinatura' ? ' active' : ''}`} onClick={() => onMudarStatus(ct.id, 'Aguardando assinatura')}>⏳ Aguardando assinatura</button>
                <button className={`sbtn sbtn-signed${ct.status === 'Assinado' ? ' active' : ''}`} onClick={() => onMudarStatus(ct.id, 'Assinado')}>✅ Assinado</button>
                <button className={`sbtn sbtn-lost${ct.status === 'Perdido' ? ' active' : ''}`} onClick={() => setLossModalOpen(true)}>❌ Perdido</button>
              </div>
            </div>
            <p style={{ color: 'var(--g2)', fontSize: '.82rem' }}>Clique no status desejado para atualizar este contrato manualmente.</p>
          </div>
        )}

        {tab === 'hist' && <div className="mtab-content active"><HistList history={ct.history} /></div>}

        {tab === 'notes' && (
          <div className="mtab-content active">
            <div className="field"><label>Observações internas</label><textarea style={{ minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas sobre este contrato..." /></div>
            <button className="btn-p" style={{ marginTop: 8 }} onClick={salvarNotasAcao}>{savedMsg ? '✓ Salvo!' : '💾 Salvar observação'}</button>
          </div>
        )}

        <div className="modal-acts">
          <button className="btn-g" onClick={onClose}>Fechar</button>
          <button className="btn-s" onClick={() => gerarPdfContrato(ct, ct.clientData || { razao: ct.clientName, cnpj: '', resp: '', cpf: '', email: ct.clientEmail, rua: '', cidade: '' }, DB.getServicos())}>⬇ Baixar Contrato (PDF)</button>
          <button className="btn-p" onClick={() => onGerarLink(ct)}>🔗 Reenviar Link</button>
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
