import { useState, useEffect, useMemo, useRef } from 'react';
import { R, mPhone, discToPct, isValidEmail, isValidPhone } from '../lib/format';
import { RESPONSAVEIS } from '../lib/constants';
import { durLabel, payMethodsLabel } from '../lib/contractDocument';

const PAY_OPCOES = ['PIX', 'Boleto bancário', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];

export default function ContratoWizard({ ct: ctInicial, catalog, onGerarLink }) {
  const [step, setStep] = useState(1);
  const [ct, setCt] = useState({ payMethods: ['PIX'], due: '05', duration: '6', ...ctInicial });
  const [cat, setCat] = useState('Todos');
  const [discMode, setDiscMode] = useState(ctInicial.discMode || 'pct');
  const [discInput, setDiscInput] = useState(String(ctInicial.discRaw ?? ctInicial.disc ?? 0));
  const [pmOpen, setPmOpen] = useState(false);
  const [finalM, setFinalM] = useState('');
  const [finalP, setFinalP] = useState('');
  const pmRef = useRef(null);

  useEffect(() => { setCt({ payMethods: ['PIX'], due: '05', duration: '6', ...ctInicial }); setStep(1); }, [ctInicial]);

  useEffect(() => {
    function onDocClick(e) { if (pmRef.current && !pmRef.current.contains(e.target)) setPmOpen(false); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function set(campo, valor) { setCt((c) => ({ ...c, [campo]: valor })); }

  function togglePlano(s) {
    setCt((c) => {
      const idx = c.plans.findIndex((x) => x.id === s.id);
      const plans = idx >= 0 ? c.plans.filter((_, i) => i !== idx) : [...c.plans, { ...s }];
      return { ...c, plans };
    });
  }
  function removerPlano(i) { setCt((c) => ({ ...c, plans: c.plans.filter((_, idx) => idx !== i) })); }
  function atualizarPlano(i, patch) {
    setCt((c) => ({ ...c, plans: c.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
    if (patch.bill) { setFinalM(''); setFinalP(''); }
  }

  const rawM = useMemo(() => ct.plans.filter((p) => p.bill === 'mensal').reduce((a, p) => a + p.price, 0), [ct.plans]);
  const rawP = useMemo(() => ct.plans.filter((p) => p.bill === 'pontual').reduce((a, p) => a + p.price, 0), [ct.plans]);

  useEffect(() => {
    if (step === 2) {
      if (!finalM && rawM > 0) setFinalM(String(rawM.toFixed(2)));
      if (!finalP && rawP > 0) setFinalP(String(rawP.toFixed(2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function step1Next() {
    if (!ct.clientName.trim()) return alert('Informe o nome do cliente.');
    if (!ct.plans.length) return alert('Selecione ao menos um plano.');
    if (ct.clientEmail && !isValidEmail(ct.clientEmail)) return alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');
    if (ct.clientWpp && !isValidPhone(ct.clientWpp)) return alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');
    if (!ct.responsavel) return alert('Selecione o responsável interno.');
    setStep(2);
  }

  const bruto = (parseFloat(finalM) || 0) + (parseFloat(finalP) || 0);
  const discPct = discToPct(discInput, discMode, bruto);
  const dVal = bruto * (discPct / 100);

  function step2Next() {
    setCt((c) => ({
      ...c, finalM: parseFloat(finalM) || 0, finalP: parseFloat(finalP) || 0,
      disc: discPct, discMode, discRaw: discInput,
    }));
    setStep(3);
  }

  function togglePayMethod(m) {
    setCt((c) => {
      const has = (c.payMethods || []).includes(m);
      return { ...c, payMethods: has ? c.payMethods.filter((x) => x !== m) : [...(c.payMethods || []), m] };
    });
  }

  const lista = cat === 'Todos' ? catalog.services : catalog.services.filter((s) => s.cat === cat);
  const dueLabel = ct.due === 'ato' ? 'No ato da assinatura' : 'Todo dia ' + ct.due;

  return (
    <div id="tab-novo-contrato" className="tab active">
      <div className="steps-nav">
        <button className={`sn${step === 1 ? ' active' : ''}`} onClick={() => setStep(1)}><span className="snum">1</span> Planos & Valores</button>
        <button className={`sn${step === 2 ? ' active' : ''}`} onClick={() => ct.plans.length && setStep(2)}><span className="snum">2</span> Condições</button>
        <button className={`sn${step === 3 ? ' active' : ''}`} onClick={() => setStep(3)}><span className="snum">3</span> Revisar & Gerar Link</button>
      </div>

      {step === 1 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Dados do Cliente e Planos</h2>
            <div className="fgrid">
              <div className="field"><label>Nome / Empresa *</label><input value={ct.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Nome ou empresa do cliente" /></div>
              <div className="field"><label>WhatsApp</label><input value={ct.clientWpp} onChange={(e) => set('clientWpp', mPhone(e.target.value))} placeholder="(41) 99999-9999" /></div>
              <div className="field"><label>E-mail</label><input value={ct.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} placeholder="email@empresa.com" /></div>
              <div className="field"><label>Obs. internas</label><input value={ct.clientObs} onChange={(e) => set('clientObs', e.target.value)} placeholder="Anotações internas..." /></div>
              <div className="field">
                <label>Responsável interno *</label>
                <select value={ct.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
                  <option value="">Selecione...</option>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <h2 className="ctitle mt">Planos Contratados</h2>
            <p className="hint-txt">Selecione os planos que o cliente vai contratar e ajuste os valores se necessário.</p>
            <div className="cat-bar">
              {catalog.cats.map((c) => (
                <button key={c} className={`cat-btn${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            <div className="pcatalog">
              {lista.map((s) => {
                const sel = ct.plans.find((x) => x.id === s.id);
                return (
                  <div key={s.id} className={`pitem${sel ? ' sel' : ''}`} onClick={() => togglePlano(s)}>
                    <div className="pcat">{s.cat}</div>
                    <div className="pname">{s.name}</div>
                    <div className="pdesc">{s.desc}</div>
                    <div className="pprice">{R(sel ? sel.price : s.price)}</div>
                    <div className="pbill">{s.bill}</div>
                  </div>
                );
              })}
            </div>
            <div className="sel-panel">
              <h3 className="panel-title">Planos Selecionados</h3>
              <div className="sel-plans">
                {ct.plans.length === 0 && <p className="empty-sel">Nenhum plano selecionado.</p>}
                {ct.plans.map((p, i) => (
                  <div className="sitem" key={i}>
                    <div className="si-head"><span className="si-name">{p.name}</span><button className="btn-d" onClick={() => removerPlano(i)}>✕</button></div>
                    <div className="si-pr">
                      <label>R$</label>
                      <input type="number" min="0" step="0.01" value={p.price} onChange={(e) => atualizarPlano(i, { price: parseFloat(e.target.value) || 0 })} />
                      <select className="cbill-sel" value={p.bill} onChange={(e) => atualizarPlano(i, { bill: e.target.value })}>
                        <option value="mensal">Mensal</option>
                        <option value="pontual">Pontual</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mini-tot">
                <div className="mrow"><span>Total Mensal</span><strong>{R(rawM)}</strong></div>
                <div className="mrow"><span>Total Pontual</span><strong>{R(rawP)}</strong></div>
              </div>
            </div>
            <div className="step-actions"><button className="btn-p" onClick={step1Next}>Próximo: Condições →</button></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Condições do Contrato</h2>
            <div className="fgrid">
              <div className="field"><label>Valor mensal final (R$)</label><input type="number" step="0.01" value={finalM} onChange={(e) => setFinalM(e.target.value)} placeholder="0,00" /></div>
              <div className="field"><label>Valor pontual final (R$)</label><input type="number" step="0.01" value={finalP} onChange={(e) => setFinalP(e.target.value)} placeholder="0,00" /></div>
              <div className="field"><label>Obs. sobre valor (combo, desconto)</label><input value={ct.discObs} onChange={(e) => set('discObs', e.target.value)} placeholder="Ex: desconto combo - de R$ 1.290 por R$ 1.190" /></div>
              <div className="field">
                <label>Desconto</label>
                <div className="disc-control">
                  <div className="disc-toggle">
                    <button type="button" className={`dt-btn${discMode === 'pct' ? ' active' : ''}`} onClick={() => setDiscMode('pct')}>%</button>
                    <button type="button" className={`dt-btn${discMode === 'brl' ? ' active' : ''}`} onClick={() => setDiscMode('brl')}>R$</button>
                  </div>
                  <input value={discInput} onChange={(e) => setDiscInput(e.target.value)} placeholder={discMode === 'pct' ? '% (máx. 20%)' : 'R$ de desconto'} />
                </div>
              </div>
              <div className="field">
                <label>Duração do contrato</label>
                <select value={ct.duration} onChange={(e) => set('duration', e.target.value)}>
                  <option value="1">Spot</option>
                  <option value="6">Semestral (6 meses)</option>
                  <option value="12">Anual (12 meses)</option>
                </select>
              </div>
              <div className="field">
                <label>Vencimento mensal</label>
                <select value={ct.due} onChange={(e) => set('due', e.target.value)}>
                  <option value="05">Mensal - todo dia 05</option>
                  <option value="10">Mensal - todo dia 10</option>
                  <option value="15">Mensal - todo dia 15</option>
                  <option value="20">Mensal - todo dia 20</option>
                  <option value="25">Mensal - todo dia 25</option>
                  <option value="ato">No ato da assinatura</option>
                </select>
              </div>
              <div className="field">
                <label>Data de competência</label>
                <input type="date" value={ct.competencia || ''} onChange={(e) => set('competencia', e.target.value)} />
                <p className="comp-hint">Em que mês este contrato deve contar nos relatórios. Em branco = mês da criação.</p>
              </div>
              <div className="field full">
                <label>Formas de pagamento</label>
                <div className={`pm-dropdown${pmOpen ? ' open' : ''}`} ref={pmRef}>
                  <button type="button" className="pm-trigger" onClick={() => setPmOpen((o) => !o)}>
                    <span className="pm-trigger-text">{ct.payMethods.length ? ct.payMethods.join(', ') : 'Selecione...'}</span>
                    <svg className="pm-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  <div className="pm-panel">
                    {PAY_OPCOES.map((m) => (
                      <label className="pm-opt" key={m}>
                        <input type="checkbox" checked={ct.payMethods.includes(m)} onChange={() => togglePayMethod(m)} /> <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field full"><label>Observações no contrato</label><textarea value={ct.ctObs} onChange={(e) => set('ctObs', e.target.value)} placeholder="Condições especiais que devem aparecer no contrato..." /></div>
            </div>
            <div className="financial-panel" style={{ marginTop: 6 }}>
              <div className="fin-row"><label>Desconto (R$)</label><span>{R(dVal)}</span></div>
              <div className="fin-row total"><label>Total com desconto</label><span>{R(bruto - dVal)}</span></div>
            </div>
            <div className="step-actions">
              <button className="btn-g" onClick={() => setStep(1)}>← Voltar</button>
              <button className="btn-p" onClick={step2Next}>Próximo: Revisar →</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Revisar e Gerar Link</h2>
            <div className="review-box">
              <div className="rv-sec">
                <div className="rv-lbl">Cliente</div>
                <div className="rv-val"><strong>{ct.clientName}</strong>{ct.clientWpp ? <><br />📱 {ct.clientWpp}</> : null}{ct.clientEmail ? <><br />✉ {ct.clientEmail}</> : null}</div>
              </div>
              <div className="rv-sec">
                <div className="rv-lbl">Planos</div>
                <div className="rv-plans">
                  {ct.plans.map((p, i) => (
                    <div className="rv-plan" key={i}><span className="rv-plan-n">{p.name} <small style={{ color: 'var(--g2)' }}>({p.bill})</small></span><span className="rv-plan-p">{R(p.price)}</span></div>
                  ))}
                </div>
              </div>
              <div className="rv-sec">
                <div className="rv-lbl">Condições</div>
                <div className="rv-val">
                  {ct.finalM > 0 && <>Mensal: <strong>{R(ct.finalM)}</strong><br /></>}
                  {ct.finalP > 0 && <>Pontual: <strong>{R(ct.finalP)}</strong><br /></>}
                  {ct.disc > 0 && <>Desconto: <strong>{R((ct.finalM + ct.finalP) * (ct.disc / 100))} ({ct.disc}%)</strong><br /></>}
                  Total: <strong>{R((ct.finalM + ct.finalP) * (1 - (ct.disc || 0) / 100))}</strong><br />
                  {ct.discObs && <>Obs: <strong>{ct.discObs}</strong><br /></>}
                  Duração: <strong>{durLabel(ct.duration)}</strong><br />
                  Vencimento: <strong>{dueLabel}</strong><br />
                  Formas de pagamento: <strong>{payMethodsLabel(ct)}</strong>
                </div>
              </div>
            </div>
            <div className="step-actions">
              <button className="btn-g" onClick={() => setStep(2)}>← Voltar</button>
              <button className="btn-p" onClick={() => onGerarLink(ct)}>🔗 Gerar Link para o Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
