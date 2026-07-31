import { useState, useEffect, useMemo } from 'react';
import { R, calcO, qOf, mDoc, mPhone, discToPct, isValidEmail, isValidPhone, validaDoc } from '../lib/format';
import { ORIGENS, RESPONSAVEIS } from '../lib/constants';
import { useApiLookup } from '../hooks/useApiLookup';

const PAY_OPCOES = ['Mensal - todo dia 05', 'Mensal - todo dia 10', 'Mensal - todo dia 15', 'Mensal - todo dia 20', 'Mensal - todo dia 25', 'À vista no ato da assinatura'];

export default function OrcamentoWizard({ orc: orcInicial, catalog, clientesLista, onSalvar }) {
  const [step, setStep] = useState(1);
  const [orc, setOrc] = useState({ payment: PAY_OPCOES[0], duration: '6', ...orcInicial });
  const [cat, setCat] = useState('Todos');
  const [discMode, setDiscMode] = useState(orcInicial.discMode || 'pct');
  const [discInput, setDiscInput] = useState(String(orcInicial.discRaw ?? orcInicial.disc ?? 0));
  const { status, buscarCNPJ } = useApiLookup();

  useEffect(() => { setOrc({ payment: PAY_OPCOES[0], duration: '6', ...orcInicial }); setStep(1); }, [orcInicial]);

  function set(campo, valor) { setOrc((o) => ({ ...o, [campo]: valor })); }

  async function onDocBlur() {
    const r = await buscarCNPJ(orc.clientDoc);
    if (r && r.fantasia && !orc.clientName.trim()) set('clientName', r.fantasia);
  }

  function autofillPorNomeOuDoc() {
    const porDoc = clientesLista.find((c) => c.doc && c.doc.replace(/\D/g, '') === (orc.clientDoc || '').replace(/\D/g, '') && c.doc.replace(/\D/g, '').length >= 11);
    const porNome = clientesLista.find((c) => (c.name || '').trim().toLowerCase() === (orc.clientName || '').trim().toLowerCase());
    const c = porDoc || porNome;
    if (c) setOrc((o) => ({ ...o, clientName: c.name || o.clientName, clientDoc: c.doc || o.clientDoc, clientWpp: c.wpp || o.clientWpp, clientEmail: c.email || o.clientEmail }));
  }

  function step1Next() {
    if (!orc.clientName.trim()) return alert('Informe o nome/empresa do cliente.');
    const dchk = validaDoc(orc.clientDoc, false);
    if (!dchk.ok) return alert(dchk.msg);
    if (orc.clientEmail && !isValidEmail(orc.clientEmail)) return alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');
    if (orc.clientWpp && !isValidPhone(orc.clientWpp)) return alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');
    if (!orc.origem) return alert('Selecione a origem do cliente.');
    if (!orc.responsavel) return alert('Selecione o responsável interno.');
    setStep(2);
  }
  function step2Next() {
    if (!orc.services.length) return alert('Selecione ao menos um serviço.');
    setStep(3);
  }

  function toggleServico(s) {
    setOrc((o) => {
      const idx = o.services.findIndex((x) => x.id === s.id);
      const services = idx >= 0 ? o.services.filter((_, i) => i !== idx) : [...o.services, { ...s, qtd: 1 }];
      return { ...o, services };
    });
  }
  function removerServico(i) { setOrc((o) => ({ ...o, services: o.services.filter((_, idx) => idx !== i) })); }
  function atualizarServico(i, patch) {
    setOrc((o) => ({ ...o, services: o.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  const bruto = useMemo(() => { const b = calcO(orc.services, 0); return b.m + b.p; }, [orc.services]);
  const discPct = useMemo(() => discToPct(discInput, discMode, bruto), [discInput, discMode, bruto]);
  const totais = useMemo(() => calcO(orc.services, discPct), [orc.services, discPct]);

  function onDiscBlur() {
    if (discPct > 10) {
      const ok = confirm(`O desconto informado é de ${String(discPct).replace('.', ',')}%, acima dos 10% recomendados.\n\nConfirmar mesmo assim?`);
      if (!ok) {
        if (discMode === 'brl') setDiscInput(String(Math.round(bruto * 10 / 100 * 100) / 100).replace('.', ','));
        else setDiscInput('10');
      }
    }
  }

  function toggleDiscMode(novoModo) {
    if (novoModo === discMode) return;
    const pct = discToPct(discInput, discMode, bruto);
    if (novoModo === 'brl') { const brl = Math.round(bruto * pct / 100 * 100) / 100; setDiscInput(brl ? String(brl).replace('.', ',') : ''); }
    else setDiscInput(pct ? String(pct).replace('.', ',') : '0');
    setDiscMode(novoModo);
  }

  function finalizar(statusFinal) {
    const orcFinal = { ...orc, disc: discPct, discMode, discRaw: discInput };
    onSalvar(orcFinal, statusFinal);
  }

  function baixarPdf() {
    const orcFinal = { ...orc, disc: discPct, discMode, discRaw: discInput };
    onSalvar(orcFinal, 'Proposta em avaliação', { pdf: true });
  }

  const lista = cat === 'Todos' ? catalog.services : catalog.services.filter((s) => s.cat === cat);

  return (
    <div id="tab-novo-orcamento" className="tab active">
      <div className="steps-nav">
        <button className={`sn${step === 1 ? ' active' : ''}`} onClick={() => setStep(1)}><span className="snum">1</span> Dados do Cliente</button>
        <button className={`sn${step === 2 ? ' active' : ''}`} onClick={() => orc.clientName.trim() && setStep(2)}><span className="snum">2</span> Serviços</button>
        <button className={`sn${step === 3 ? ' active' : ''}`} onClick={() => orc.services.length && setStep(3)}><span className="snum">3</span> Resumo & PDF</button>
      </div>

      {step === 1 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Dados do Cliente</h2>
            <div className="fgrid">
              <div className="field">
                <label>CPF / CNPJ</label>
                <input value={orc.clientDoc} onChange={(e) => set('clientDoc', mDoc(e.target.value))} onBlur={() => { onDocBlur(); autofillPorNomeOuDoc(); }} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                {status.msg && <span className={`api-status ${status.type}`}>{status.msg}</span>}
              </div>
              <div className="field">
                <label>Nome / Empresa *</label>
                <input list="o-cli-list" value={orc.clientName} onChange={(e) => set('clientName', e.target.value)} onBlur={autofillPorNomeOuDoc} placeholder="Ex: João Silva ou Empresa Ltda" />
                <datalist id="o-cli-list">{clientesLista.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <div className="field"><label>WhatsApp</label><input value={orc.clientWpp} onChange={(e) => set('clientWpp', mPhone(e.target.value))} placeholder="(41) 99999-9999" /></div>
              <div className="field"><label>E-mail</label><input value={orc.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} placeholder="email@empresa.com" /></div>
              <div className="field"><label>Validade da proposta (dias)</label><input type="number" min="1" max="90" value={orc.validity} onChange={(e) => set('validity', parseInt(e.target.value) || 15)} /></div>
              <div className="field">
                <label>Origem do cliente *</label>
                <select value={orc.origem} onChange={(e) => set('origem', e.target.value)}>
                  <option value="">Selecione...</option>
                  {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Responsável interno *</label>
                <select value={orc.responsavel} onChange={(e) => set('responsavel', e.target.value)}>
                  <option value="">Selecione...</option>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field full"><label>Observações internas</label><textarea value={orc.clientObs} onChange={(e) => set('clientObs', e.target.value)} placeholder="Anotações internas sobre o cliente e contexto da negociação..." /></div>
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
                  const sel = orc.services.find((x) => x.id === s.id);
                  return (
                    <div key={s.id} className={`pitem${sel ? ' sel' : ''}`} onClick={() => toggleServico(s)}>
                      <div className="pcat">{s.cat}</div>
                      <div className="pname">{s.name}</div>
                      <div className="pdesc">{s.desc}</div>
                      <div className="pprice">{R(sel ? sel.price : s.price)}</div>
                      <div className="pbill">{s.bill}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="services-right">
              <h3 className="panel-title">Selecionados</h3>
              <div className="sel-plans">
                {orc.services.length === 0 && <p className="empty-sel">Nenhum serviço selecionado.</p>}
                {orc.services.map((s, i) => (
                  <div className="sitem" key={i}>
                    <div className="si-head"><span className="si-name">{s.name}</span><button className="btn-d" onClick={() => removerServico(i)}>✕</button></div>
                    <div className="si-pr">
                      <label>R$</label>
                      <input type="number" min="0" step="0.01" value={s.price} onChange={(e) => atualizarServico(i, { price: parseFloat(e.target.value) || 0 })} />
                      <label style={{ marginLeft: 4 }}>Qtd</label>
                      <input type="number" min="1" step="1" style={{ width: 48 }} value={s.qtd || 1} onChange={(e) => atualizarServico(i, { qtd: Math.max(1, parseInt(e.target.value) || 1) })} />
                      <select className="cbill-sel" value={s.bill} onChange={(e) => atualizarServico(i, { bill: e.target.value })}>
                        <option value="mensal">Mensal</option>
                        <option value="pontual">Pontual</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mini-tot">
                <div className="mrow"><span>Total Mensal</span><strong>{R(calcO(orc.services, 0).m)}</strong></div>
                <div className="mrow"><span>Total Pontual</span><strong>{R(calcO(orc.services, 0).p)}</strong></div>
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
            <h2 className="ctitle">Resumo do Orçamento</h2>
            <div className="summary-layout">
              <div>
                <div className="sum-client-card">
                  <h4>Cliente</h4>
                  <p><strong>{orc.clientName}</strong>{orc.clientWpp ? <><br />📱 {orc.clientWpp}</> : null}{orc.clientEmail ? <><br />✉ {orc.clientEmail}</> : null}<br />Validade: {orc.validity} dias</p>
                </div>
                <div className="sum-services">
                  {orc.services.map((s, i) => (
                    <div className="sum-svc" key={i}>
                      <div className="sum-svc-head">
                        <span className="sum-svc-name">{s.name}{qOf(s) > 1 ? ` (x${qOf(s)})` : ''}</span>
                        <span className="sum-svc-price">{qOf(s) > 1 ? `${qOf(s)} × ${R(s.price)} = ${R(s.price * qOf(s))}` : R(s.price)} <small style={{ color: 'var(--g2)' }}>{s.bill}</small></span>
                      </div>
                      <ul className="sum-inc">{(s.inc || []).map((inc, idx) => <li key={idx}>{inc}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
              <div className="financial-panel">
                <h3 className="panel-title">Financeiro</h3>
                <div className="fin-row"><label>Total Mensal</label><span>{R(totais.m)}</span></div>
                <div className="fin-row"><label>Total Pontual</label><span>{R(totais.p)}</span></div>
                <div className="fin-row">
                  <label>Desconto</label>
                  <div className="disc-control">
                    <div className="disc-toggle">
                      <button type="button" className={`dt-btn${discMode === 'pct' ? ' active' : ''}`} onClick={() => toggleDiscMode('pct')}>%</button>
                      <button type="button" className={`dt-btn${discMode === 'brl' ? ' active' : ''}`} onClick={() => toggleDiscMode('brl')}>R$</button>
                    </div>
                    <input value={discInput} onChange={(e) => setDiscInput(e.target.value)} onBlur={onDiscBlur} placeholder={discMode === 'pct' ? '% (máx. 20%)' : 'R$ de desconto'} />
                  </div>
                </div>
                <div className="fin-row"><label>Desconto aplicado</label><span>{discMode === 'pct' ? `${discPct}%` : R(totais.d)}</span></div>
                <div className="fin-row total"><label>Valor Final</label><span>{R(totais.net)}</span></div>
                <hr className="divider" />
                <div className="fin-row">
                  <label>Prazo do contrato</label>
                  <select value={orc.duration} onChange={(e) => set('duration', e.target.value)}>
                    <option value="1">Spot</option>
                    <option value="6">Semestral (6 meses)</option>
                    <option value="12">Anual (12 meses)</option>
                  </select>
                </div>
                <div className="fin-row">
                  <label>Condição de pagamento</label>
                  <select value={orc.payment} onChange={(e) => set('payment', e.target.value)}>
                    {PAY_OPCOES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="fin-row"><label>Observações comerciais</label><textarea value={orc.finObs} onChange={(e) => set('finObs', e.target.value)} placeholder="Condições especiais, descontos em combo..." /></div>
                <div className="step-actions col">
                  <button className="btn-g" onClick={() => setStep(2)}>← Voltar</button>
                  <button className="btn-s" onClick={() => finalizar('Rascunho')}>Salvar rascunho</button>
                  <button className="btn-p" onClick={baixarPdf}>📄 Gerar PDF e enviar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
