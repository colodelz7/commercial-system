import { useState, useEffect, useRef, useCallback } from 'react';
import { isValidPhone } from '../lib/format';
import { ORIGENS, RESPONSAVEIS } from '../lib/constants';
import { DB } from '../lib/db';

function tamanhoKB(bytes) { return Math.max(1, Math.round((bytes || 0) / 1024)) + ' KB'; }

export default function DiagnosticoWizard({ diag: diagInicial, onSalvar, onExcluir, onNovo, onConverterOrcamento }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState(diagInicial);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');
  const timerRef = useRef(null);
  const idAtualRef = useRef(diagInicial.id);

  useEffect(() => {
    setD(diagInicial);
    if (diagInicial.id !== idAtualRef.current) { setStep(1); idAtualRef.current = diagInicial.id; }
  }, [diagInicial]);

  const autosalvar = useCallback((next) => {
    if (next.empresa && next.empresa.trim()) onSalvar(next);
  }, [onSalvar]);

  function set(campo, valor) {
    setD((prev) => {
      const next = { ...prev, [campo]: valor };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => autosalvar(next), 800);
      return next;
    });
  }

  function step1Next() {
    if (d.wpp && !isValidPhone(d.wpp)) return alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');
    setStep(2);
  }

  async function onAnexarArquivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!d.empresa || !d.empresa.trim()) { setErroAnexo('Informe ao menos a Empresa (etapa 1) antes de anexar arquivos.'); return; }
    setErroAnexo(''); setEnviandoAnexo(true);
    try {
      const meta = await DB.uploadAnexo(d.id, file);
      set('anexos', [...(d.anexos || []), meta]);
    } catch (err) {
      setErroAnexo(err.message || 'Erro ao enviar o arquivo.');
    } finally {
      setEnviandoAnexo(false);
    }
  }

  async function onRemoverAnexo(anexo) {
    if (!confirm(`Remover o anexo "${anexo.nome}"?`)) return;
    await DB.deleteAnexo(anexo.path);
    set('anexos', (d.anexos || []).filter((a) => a.path !== anexo.path));
  }

  function gerarPdf() {
    if (!d.empresa.trim()) { alert('Informe ao menos a Empresa (etapa 1) para gerar o PDF.'); setStep(1); return; }
    onSalvar(d, { pdf: true });
  }

  return (
    <div id="tab-diagnostico" className="tab active">
      <div className="steps-nav">
        <button className={`sn${step === 1 ? ' active' : ''}`} onClick={() => setStep(1)}><span className="snum">1</span> Cliente</button>
        <button className={`sn${step === 2 ? ' active' : ''}`} onClick={() => setStep(2)}><span className="snum">2</span> Diagnóstico</button>
      </div>

      {step === 1 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Cliente</h2>
            <div className="fgrid">
              <div className="field"><label>Empresa</label><input value={d.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nome da empresa" /></div>
              <div className="field"><label>Segmento / Ramo</label><input value={d.segmento} onChange={(e) => set('segmento', e.target.value)} placeholder="Ex: Clínica odontológica" /></div>
              <div className="field"><label>Responsável / Contato</label><input value={d.contato} onChange={(e) => set('contato', e.target.value)} placeholder="Ex: Pedro Rosa" /></div>
              <div className="field"><label>WhatsApp</label><input value={d.wpp} onChange={(e) => set('wpp', e.target.value)} placeholder="(41) 99999-9999" /></div>
              <div className="field"><label>Instagram</label><input value={d.insta} onChange={(e) => set('insta', e.target.value)} placeholder="@perfil" /></div>
              <div className="field"><label>Site</label><input value={d.site} onChange={(e) => set('site', e.target.value)} placeholder="site.com.br" /></div>
              <div className="field">
                <label>Origem do cliente</label>
                <select value={d.origem} onChange={(e) => set('origem', e.target.value)}>
                  <option value="">Selecione...</option>
                  {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Responsável interno</label>
                <select value={d.resp} onChange={(e) => set('resp', e.target.value)}>
                  <option value="">Selecione...</option>
                  {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="step-actions"><button className="btn-p" onClick={step1Next}>Próximo: Diagnóstico →</button></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step active">
          <div className="card">
            <h2 className="ctitle">Diagnóstico Estratégico</h2>
            <p className="hint-txt" style={{ marginTop: -6 }}>Preencha o que for relevante, campos em branco não aparecem no PDF. Cada linha vira um item no dossiê.</p>

            <div className="dg-sub">Diagnóstico-resumo <span>· aparece logo na frente do PDF</span></div>
            <div className="dg2-grid">
              <div className="field"><label>Principais problemas</label><textarea className="dg-ta" value={d.rz_problemas} onChange={(e) => set('rz_problemas', e.target.value)} placeholder="Um por linha..." /></div>
              <div className="field"><label>Prioridades</label><textarea className="dg-ta" value={d.rz_prioridades} onChange={(e) => set('rz_prioridades', e.target.value)} placeholder="Um por linha..." /></div>
              <div className="field"><label>Base da análise</label><textarea className="dg-ta" value={d.rz_base} onChange={(e) => set('rz_base', e.target.value)} placeholder="Em que dados/observações se baseia..." /></div>
              <div className="field"><label>Objetivo geral do dossiê</label><textarea className="dg-ta" value={d.rz_objetivo} onChange={(e) => set('rz_objetivo', e.target.value)} placeholder="O que este diagnóstico busca..." /></div>
            </div>

            <div className="dg-sub">Google e busca local</div>
            <div className="dg2-grid">
              <div className="field"><label>Palavras-chave pesquisadas</label><textarea className="dg-ta" value={d.g_palavras} onChange={(e) => set('g_palavras', e.target.value)} placeholder="Uma por linha..." /></div>
              <div className="field"><label>Tráfego pago no Google (Google Ads)</label><textarea className="dg-ta" value={d.g_ads} onChange={(e) => set('g_ads', e.target.value)} /></div>
              <div className="field"><label>Ranqueamento orgânico e SEO local</label><textarea className="dg-ta" value={d.g_seo} onChange={(e) => set('g_seo', e.target.value)} /></div>
              <div className="field"><label>Google Empresas (Google Meu Negócio)</label><textarea className="dg-ta" value={d.g_gmn} onChange={(e) => set('g_gmn', e.target.value)} /></div>
              <div className="field full"><label>Potencial de busca local</label><textarea className="dg-ta" value={d.g_potencial} onChange={(e) => set('g_potencial', e.target.value)} /></div>
            </div>

            <div className="dg-sub">Site, anúncios Meta e concorrentes</div>
            <div className="dg2-grid">
              <div className="field"><label>Site / Landing page</label><textarea className="dg-ta" value={d.s_site} onChange={(e) => set('s_site', e.target.value)} /></div>
              <div className="field"><label>Anúncios Meta e redes (resumo)</label><textarea className="dg-ta" value={d.s_meta} onChange={(e) => set('s_meta', e.target.value)} /></div>
              <div className="field full"><label>Concorrentes</label><textarea className="dg-ta" value={d.s_concorrentes} onChange={(e) => set('s_concorrentes', e.target.value)} /></div>
            </div>

            <div className="dg-sub">Oportunidades e fechamento</div>
            <div className="dg2-grid">
              <div className="field"><label>Oportunidades identificadas</label><textarea className="dg-ta" value={d.o_oportunidades} onChange={(e) => set('o_oportunidades', e.target.value)} /></div>
              <div className="field"><label>Próximos passos sugeridos</label><textarea className="dg-ta" value={d.o_passos} onChange={(e) => set('o_passos', e.target.value)} /></div>
            </div>

            <div className="dg-sub">Rodapé do PDF</div>
            <div className="dg2-grid">
              <div className="field"><label>Seu contato</label><textarea className="dg-ta" value={d.f_contato} onChange={(e) => set('f_contato', e.target.value)} placeholder="Nome, WhatsApp, e-mail..." /></div>
              <div className="field"><label>Chamada para ação (CTA final)</label><textarea className="dg-ta" value={d.f_cta} onChange={(e) => set('f_cta', e.target.value)} placeholder="Ex: Vamos tornar sua demanda previsível." /></div>
            </div>

            <div className="dg-sub">Anexos</div>
            <div className="anexos-box">
              <input type="file" onChange={onAnexarArquivo} disabled={enviandoAnexo} />
              {enviandoAnexo && <p className="hint-txt">Enviando...</p>}
              {erroAnexo && <div className="msg-err">{erroAnexo}</div>}
              <div className="anexos-lista">
                {(d.anexos || []).map((a) => (
                  <div className="anexo-item" key={a.path}>
                    <a href={DB.getAnexoUrl(a.path)} target="_blank" rel="noreferrer">📎 {a.nome}</a>
                    <span className="anx-meta">{tamanhoKB(a.tamanho)}</span>
                    <button type="button" className="btn-g" onClick={() => onRemoverAnexo(a)}>🗑</button>
                  </div>
                ))}
                {(!d.anexos || !d.anexos.length) && <p className="hint-txt">Nenhum anexo ainda.</p>}
              </div>
            </div>

            <div className="diag-actions-bar">
              <button className="btn-g" onClick={() => setStep(1)}>← Voltar</button>
              <span className="dab-spacer"></span>
              {diagInicial.empresa && <button className="btn-g" onClick={() => onExcluir(d.id)}>🗑 Excluir</button>}
              <button className="btn-g" onClick={onNovo}>＋ Novo</button>
              <button className="btn-s" onClick={() => onConverterOrcamento(d)}>➡️ Transformar em Orçamento</button>
              <button className="btn-p" onClick={gerarPdf}>📄 Gerar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
