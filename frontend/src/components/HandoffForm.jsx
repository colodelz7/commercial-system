import { useState, useEffect, useRef, useCallback } from 'react';
import { HANDOFF_SECTIONS } from '../lib/constants';
import { handoffProgress } from '../hooks/useHandoffs';
import { gerarPdfHandoff } from '../lib/pdfHandoff';

export default function HandoffForm({ handoff, clientesLista, onSalvar, onVoltar }) {
  const [h, setH] = useState(handoff);
  const [statusMsg, setStatusMsg] = useState('As informações são salvas automaticamente.');
  const [faltando, setFaltando] = useState(new Set());
  const timerRef = useRef(null);

  useEffect(() => { setH(handoff); setFaltando(new Set()); }, [handoff]);

  const autosalvar = useCallback((next) => {
    const temAlgo = !!next.clientId || Object.values(next.respostas || {}).some((v) => (v || '').trim());
    if (!temAlgo) return;
    const salvo = onSalvar(next);
    setStatusMsg('Salvo às ' + new Date().toLocaleTimeString('pt-BR') + '.');
    return salvo;
  }, [onSalvar]);

  function set(campo, valor) {
    setH((prev) => {
      const next = { ...prev, [campo]: valor };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => autosalvar(next), 700);
      return next;
    });
  }

  function setResposta(k, valor) {
    setH((prev) => {
      const next = { ...prev, respostas: { ...prev.respostas, [k]: valor } };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => autosalvar(next), 700);
      return next;
    });
  }

  function gerarPdf() {
    if (!h.clientId) return alert('Selecione o cliente antes de gerar o PDF.');
    if (!h.prioridade) return alert('Defina a prioridade (baixa, média ou alta) antes de gerar o PDF.');
    const pr = handoffProgress(h);
    if (pr.done < pr.total) {
      const faltam = new Set();
      const allQs = [];
      HANDOFF_SECTIONS.forEach((s) => s.perguntas.forEach((p) => allQs.push(p)));
      allQs.forEach((p) => { if (!(h.respostas[p.k] || '').trim()) faltam.add(p.k); });
      setFaltando(faltam);
      alert(`O PDF só pode ser gerado com o handoff COMPLETO.\n\nFaltam ${pr.total - pr.done} de ${pr.total} resposta(s) — os campos em vermelho mostram onde.`);
      return;
    }
    setFaltando(new Set());
    const final = { ...h, status: 'Concluído' };
    onSalvar(final);
    setStatusMsg('Handoff concluído e salvo.');
    gerarPdfHandoff(final);
  }

  return (
    <section className="tab-content wizard">
      <div className="ho-head">
        <div className="ho-cli-field">
          <label>Cliente</label>
          <select value={h.clientId} onChange={(e) => {
            const cliente = clientesLista.find((c) => c.id === e.target.value);
            set('clientId', e.target.value);
            setH((prev) => ({ ...prev, clientId: e.target.value, clientName: cliente ? cliente.name : prev.clientName }));
          }}>
            <option value="">Selecione o cliente cadastrado</option>
            {clientesLista.map((c) => <option key={c.id} value={c.id}>{c.name || '(sem nome)'}</option>)}
          </select>
        </div>
        <div className="ho-cli-field ho-pri-field">
          <label>Prioridade</label>
          <select value={h.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
            <option value="">Selecione...</option>
            <option value="baixa">🟢 Baixa</option>
            <option value="media">🟡 Média</option>
            <option value="alta">🔴 Alta</option>
          </select>
        </div>
        <div className="ho-head-actions">
          <button className="btn-s" onClick={onVoltar}>← Voltar</button>
          <button className="btn-p" onClick={gerarPdf}>📄 Gerar PDF para CS</button>
        </div>
      </div>
      <p className="ho-autosave">{statusMsg}</p>

      <div className="ho-sections">
        {HANDOFF_SECTIONS.map((sec) => (
          <div className="ho-sec" key={sec.titulo}>
            <h3 className="ho-sec-title">{sec.titulo}</h3>
            <div className="ho-grid">
              {sec.perguntas.map((p) => (
                <div className="ho-card" key={p.k}>
                  <label className="ho-q">{p.q}</label>
                  <p className="ho-help">{p.ajuda}</p>
                  <textarea
                    className={`ho-input${faltando.has(p.k) ? ' ho-missing' : ''}`}
                    rows="3" placeholder="Digite as informações..."
                    value={h.respostas[p.k] || ''}
                    onChange={(e) => setResposta(p.k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
