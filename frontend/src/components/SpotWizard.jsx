import { useState, useEffect, useMemo, useRef } from 'react';
import { R, calcO, qOf, mDoc, mPhone, discToPct, isValidEmail, isValidPhone, validaDoc } from '../lib/format';
import { ORIGENS, RESPONSAVEIS } from '../lib/constants';
import { useApiLookup } from '../hooks/useApiLookup';
import MoneyInput from './MoneyInput';

const PAY_OPCOES = ['PIX', 'Boleto bancário', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];

export default function SpotWizard({ spot: spotInicial, catalog, onSalvar }) {
  const [step, setStep] = useState(1);
  const [spot, setSpot] = useState({ payMethods: ['PIX'], ...spotInicial });
  const [cat, setCat] = useState('Todos');
  const [discMode, setDiscMode] = useState(spotInicial.discMode || 'pct');
  const [discInput, setDiscInput] = useState(String(spotInicial.discRaw ?? spotInicial.disc ?? 0));
  const [pmOpen, setPmOpen] = useState(false);
  const { status, buscarCNPJ } = useApiLookup();
  const pmRef = useRef(null);

  useEffect(() => { setSpot({ payMethods: ['PIX'], ...spotInicial }); setStep(1); }, [spotInicial]);

  useEffect(() => {
    function onDocClick(e) { if (pmRef.current && !pmRef.current.contains(e.target)) setPmOpen(false); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function set(campo, valor) { setSpot((s) => ({ ...s, [campo]: valor })); }

  async function onDocBlur() {
    const r = await buscarCNPJ(spot.clientDoc);
    if (r && r.fantasia && !spot.clientName.trim()) set('clientName', r.fantasia);
  }

  function step1Next() {
    if (!spot.clientName.trim()) return alert('Informe o nome do cliente.');
    const dchk = validaDoc(spot.clientDoc, false);
    if (!dchk.ok) return alert(dchk.msg);
    if (spot.clientEmail && !isValidEmail(spot.clientEmail)) return alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');
    if (spot.clientWpp && !isValidPhone(spot.clientWpp)) return alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');
    if (!spot.origem) return alert('Selecione a origem do cliente.');
    if (!spot.responsavel) return alert('Selecione o responsável interno.');
    setStep(2);
  }
  function step2Next() {
    if (!spot.services.length) return alert('Selecione ao menos um serviço.');
    setStep(3);
  }

  function toggleServico(s) {
    setSpot((sp) => {
      const idx = sp.services.findIndex((x) => x.id === s.id);
      const services = idx >= 0 ? sp.services.filter((_, i) => i !== idx) : [...sp.services, { ...s, bill: 'pontual', qtd: 1 }];
      return { ...sp, services };
    });
  }
  function removerServico(i) { setSpot((sp) => ({ ...sp, services: sp.services.filter((_, idx) => idx !== i) })); }
  function atualizarServico(i, patch) {
    setSpot((sp) => ({ ...sp, services: sp.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }
  function togglePayMethod(m) {
    setSpot((sp) => {
      const has = (sp.payMethods || []).includes(m);
      return { ...sp, payMethods: has ? sp.payMethods.filter((x) => x !== m) : [...(sp.payMethods || []), m] };
    });
  }

  const bruto = useMemo(() => calcO(spot.services, 0).p, [spot.services]);
  const discPct = useMemo(() => discToPct(discInput, discMode, bruto), [discInput, discMode, bruto]);
  const totais = useMemo(() => calcO(spot.services, discPct), [spot.services, discPct]);

  function onDiscBlur() {
    const pctDigitado = discToPct(discInput, discMode, bruto, 999999);
    if (pctDigitado > 20) {
      alert('O desconto máximo permitido é 20%. Ajustei o valor para 20%.');
      if (discMode === 'brl') setDiscInput(String(Math.round(bruto * 20 / 100 * 100) / 100).replace('.', ','));
      else setDiscInput('20');
    }
  }

  function finalizar() {
    onSalvar({ ...spot, disc: discPct, discMode, discRaw: discInput, status: spot.status || 'Em avaliação' }, { pdf: true });
  }

  const lista = cat === 'Todos' ? catalog.services : catalog.services.filter((s) => s.cat === cat);

  return (
    <div id="tab-novo-spot" className="tab active">
      <div className="steps-nav">
        <button className={`sn${step === 1 ? ' active' : ''}`} onClick={() => setStep(1)}><span className="snum">1</span> Dados do Cliente</button>
        <button className={`sn${step === 2 ? ' active' : ''}`} onClick={() => spot.clientName.trim() && setStep(2)}><span className="snum">2</span> Serviços</button>
        <button className={`sn${step === 3 ? ' active' : ''}`} onClick={() => spot.services.length && setStep(3)}><span className="snum">3</span> Resumo & PDF</button>
      </div>

      {step === 1 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Dados do Cliente</h2>
            <div className="fgrid">
              <div className="field">
                <label>CPF / CNPJ</label>
                <input value={spot.clientDoc} onChange={(e) => set('clientDoc', mDoc(e.target.value))} onBlur={onDocBlur} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                {status.msg && <span className={`api-status ${status.type}`}>{status.msg}</span>}
              </div>
              <div className="field"><label>Nome / Empresa *</label><input value={spot.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Ex: João Silva ou Empresa Ltda" /></div>
              <div className="field"><label>WhatsApp</label><input value={spot.clientWpp} onChange={(e) => set('clientWpp', mPhone(e.target.value))} placeholder="(41) 99999-9999" /></div>
              <div className="field"><label>E-mail</label><input value={spot.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} placeholder="email@empresa.com" /></div>
              <div className="field"><label>Validade da proposta (dias)</label><input type="number" min="1" max="90" value={spot.validity} onChange={(e) => set('validity', parseInt(e.target.value) || 15)} /></div>
              <div className="field">
                <label>Origem do cliente *</label>
                <select value={spot.origem} onChange={(e) => set('origem', e.target.value)}>
                  <option value="">Selecione...</option>
                  {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Responsável interno *</label>
                <select value={spot.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
                  <option value="">Selecione...</option>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field full">
                <label>Formas de pagamento</label>
                <div className={`pm-dropdown${pmOpen ? ' open' : ''}`} ref={pmRef}>
                  <button type="button" className="pm-trigger" onClick={() => setPmOpen((o) => !o)}>
                    <span className="pm-trigger-text">{spot.payMethods.length ? spot.payMethods.join(', ') : 'Selecione...'}</span>
                    <svg className="pm-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  <div className="pm-panel">
                    {PAY_OPCOES.map((m) => (
                      <label className="pm-opt" key={m}><input type="checkbox" checked={spot.payMethods.includes(m)} onChange={() => togglePayMethod(m)} /> <span>{m}</span></label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field full"><label>Observações comerciais</label><textarea value={spot.finObs} onChange={(e) => set('finObs', e.target.value)} placeholder="Condições de pagamento, parcelamento, prazo de entrega, informações extras..." /></div>
              <div className="field full"><label>Observações internas</label><textarea value={spot.clientObs} onChange={(e) => set('clientObs', e.target.value)} placeholder="Anotações internas sobre o cliente e contexto da negociação..." /></div>
            </div>
            <div className="step-actions"><button className="btn-p" onClick={step1Next}>Próximo: Serviços →</button></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step active">
          <div className="card services-layout">
            <div className="services-left">
              <h2 className="ctitle">Selecionar Serviços</h2>
              <div className="cat-bar">
                {catalog.cats.map((c) => (
                  <button key={c} className={`cat-btn${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>
                ))}
              </div>
              <div className="pcatalog">
                {lista.map((s) => {
                  const sel = spot.services.find((x) => x.id === s.id);
                  return (
                    <div key={s.id} className={`pitem${sel ? ' sel' : ''}`} onClick={() => toggleServico(s)}>
                      <div className="pcat">{s.cat}</div>
                      <div className="pname">{s.name}</div>
                      <div className="pdesc">{s.desc}</div>
                      <div className="pprice">{R(sel ? sel.price : s.price)}</div>
                      <div className="pbill">pontual</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="services-right">
              <h3 className="panel-title">Selecionados</h3>
              <div className="sel-plans">
                {spot.services.length === 0 && <p className="empty-sel">Nenhum serviço selecionado.</p>}
                {spot.services.map((s, i) => (
                  <div className="sitem" key={i}>
                    <div className="si-head"><span className="si-name">{s.name}</span><button className="btn-d" onClick={() => removerServico(i)}>✕</button></div>
                    <div className="si-pr">
                      <MoneyInput value={s.price} onChange={(v) => atualizarServico(i, { price: v })} />
                      <label style={{ marginLeft: 4 }}>Qtd</label>
                      <input type="number" min="1" step="1" style={{ width: 48 }} value={s.qtd || 1} onChange={(e) => atualizarServico(i, { qtd: Math.max(1, parseInt(e.target.value) || 1) })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mini-tot">
                <div className="mrow"><span>Total do SPOT (pontual)</span><strong>{R(bruto)}</strong></div>
              </div>
              <div className="step-actions">
                <button className="btn-g" onClick={() => setStep(1)}>← Voltar</button>
                <button className="btn-p" onClick={step2Next}>Próximo: Resumo →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Resumo do SPOT</h2>
            <div className="summary-layout">
              <div>
                <div className="sum-client-card"><h4>Cliente</h4><p><strong>{spot.clientName}</strong>{spot.clientWpp ? <><br />📱 {spot.clientWpp}</> : null}</p></div>
                <div className="sum-services">
                  {spot.services.map((s, i) => (
                    <div className="sum-svc" key={i}>
                      <div className="sum-svc-head">
                        <span className="sum-svc-name">{s.name}{qOf(s) > 1 ? ` (x${qOf(s)})` : ''}</span>
                        <span className="sum-svc-price">{qOf(s) > 1 ? `${qOf(s)} × ${R(s.price)} = ${R(s.price * qOf(s))}` : R(s.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="financial-panel">
                <h3 className="panel-title">Financeiro</h3>
                <div className="fin-row"><label>Total Pontual</label><span>{R(totais.p)}</span></div>
                <div className="fin-row">
                  <label>Desconto</label>
                  <div className="disc-control">
                    <div className="disc-toggle">
                      <button type="button" className={`dt-btn${discMode === 'pct' ? ' active' : ''}`} onClick={() => setDiscMode('pct')}>%</button>
                      <button type="button" className={`dt-btn${discMode === 'brl' ? ' active' : ''}`} onClick={() => setDiscMode('brl')}>R$</button>
                    </div>
                    <input value={discInput} onChange={(e) => setDiscInput(e.target.value)} onBlur={onDiscBlur} placeholder={discMode === 'pct' ? '% (máx. 20%)' : 'R$ de desconto'} />
                  </div>
                </div>
                <div className="fin-row"><label>Desconto aplicado</label><span>{discMode === 'pct' ? `${discPct}%` : R(totais.d)}</span></div>
                <div className="fin-row total"><label>Valor Final</label><span>{R(totais.net)}</span></div>
                <div className="step-actions col">
                  <button className="btn-g" onClick={() => setStep(2)}>← Voltar</button>
                  <button className="btn-s" onClick={finalizar}>📄 Exportar SPOT PDF</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
