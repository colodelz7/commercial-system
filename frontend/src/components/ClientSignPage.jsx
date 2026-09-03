import { useState, useEffect } from 'react';
import { mDoc, mCEP, mPhone, isValidEmail, isValidCPF, validaDoc, isValidPhone, addHist } from '../lib/format';
import { useApiLookup } from '../hooks/useApiLookup';
import { renderContractHTML, durLabel } from '../lib/contractDocument';
import { gerarPdfContrato } from '../lib/pdfContrato';
import { enviarParaAutentique } from '../lib/api';

const CAMPOS_VAZIOS = { cnpj: '', fantasia: '', razao: '', email: '', rua: '', comp: '', bairro: '', cidade: '', cep: '', resp: '', cpf: '', wpp: '' };

async function buscarContratoPorToken(token) {
  const resp = await fetch(`/api/contrato-link/${encodeURIComponent(token)}`);
  if (!resp.ok) return null;
  return resp.json();
}
async function salvarContratoCliente(token, patch) {
  const resp = await fetch(`/api/contrato-link/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || `Erro ${resp.status} ao salvar.`);
  }
  return resp.json();
}

export default function ClientSignPage({ token }) {
  const [carregando, setCarregando] = useState(true);
  const [contrato, setContrato] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(CAMPOS_VAZIOS);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { status, buscarCEP, buscarCNPJ } = useApiLookup();

  useEffect(() => {
    let ativo = true;
    buscarContratoPorToken(token).then((c) => {
      if (!ativo) return;
      setContrato(c);
      setCarregando(false);
      if (c) addHist(c, 'Cliente acessou o link', '👁️');
    });
    return () => { ativo = false; };
  }, [token]);

  if (carregando) {
    return <div className="client-screen client-invalid"><p>Carregando...</p></div>;
  }

  if (!contrato) {
    return (
      <div className="client-screen client-invalid">
        <div className="client-invalid-logo">Morning</div>
        <p>Link inválido ou expirado. Entre em contato com a equipe Morning.</p>
      </div>
    );
  }

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function onDocBlur() {
    const r = await buscarCNPJ(form.cnpj);
    if (!r) return;
    setForm((f) => ({
      ...f,
      fantasia: f.fantasia || r.fantasia, razao: r.razao || f.razao,
      rua: f.rua || r.rua, comp: f.comp || r.comp, bairro: f.bairro || r.bairro,
      cidade: r.cidade || f.cidade, cep: f.cep ? f.cep : (r.cep ? mCEP(r.cep) : f.cep),
      email: f.email || r.email, wpp: f.wpp || (r.telefone ? mPhone(r.telefone) : f.wpp),
    }));
  }

  async function onCepBlur() {
    const r = await buscarCEP(form.cep);
    if (!r) return;
    setForm((f) => ({ ...f, rua: f.rua || r.rua, bairro: f.bairro || r.bairro, cidade: r.cidade || f.cidade }));
  }

  async function formNext() {
    const obrigatorios = [['cnpj', 'CNPJ/CPF'], ['fantasia', 'Nome / Empresa'], ['email', 'E-mail'], ['rua', 'Endereço'], ['bairro', 'Bairro'], ['cidade', 'Município/UF'], ['cep', 'CEP'], ['resp', 'Nome do Responsável'], ['wpp', 'WhatsApp']];
    const faltando = obrigatorios.filter(([id]) => !form[id].trim());
    if (faltando.length) return setErro('Obrigatórios: ' + faltando.map((x) => x[1]).join(', '));
    if (!isValidEmail(form.email)) return setErro('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');
    const dchk = validaDoc(form.cnpj, true);
    if (!dchk.ok) return setErro(dchk.msg);
    if (form.cpf && !isValidCPF(form.cpf)) return setErro('CPF do responsável inválido. Confira os números (ou deixe em branco).');
    if (!isValidPhone(form.wpp)) return setErro('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');

    setErro('');
    const clientData = { ...form, razao: form.razao || form.fantasia };
    const historyNovo = [{ action: 'Cliente preencheu os dados do formulário', icon: '📋', time: new Date().toLocaleString('pt-BR') }];
    try {
      const salvo = await salvarContratoCliente(token, { clientData, status: 'Aguardando assinatura', history: historyNovo });
      setContrato({ ...salvo, _servicosCatalogo: contrato._servicosCatalogo });
      setStep(2);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function assinar() {
    setEnviando(true);
    try {
      const cd = contrato.clientData;
      // Gera o PDF do contrato e manda o próprio arquivo para a assinatura.
      const pdfBase64 = await gerarPdfContrato(contrato, cd, contrato._servicosCatalogo || [], { retornarBase64: true });
      const resultado = await enviarParaAutentique(contrato, pdfBase64);
      const autentiqueId = resultado.documentId || resultado.id || null;
      const historyNovo = [{ action: 'Documento enviado para assinatura na Autentique', icon: '✍️', time: new Date().toLocaleString('pt-BR') }];
      const salvo = await salvarContratoCliente(token, { autentiqueId, history: historyNovo });
      setContrato({ ...salvo, _servicosCatalogo: contrato._servicosCatalogo });
      setStep(4);
    } catch (e) {
      alert('Não foi possível enviar para assinatura agora: ' + e.message + '\n\nVocê já pode baixar o PDF do contrato e assinar por fora, entrando em contato com a equipe Morning.');
    } finally {
      setEnviando(false);
    }
  }

  const cd = contrato.clientData || {};
  const html = step >= 3 ? renderContractHTML(contrato, cd, contrato._servicosCatalogo || []) : '';

  return (
    <div className="client-screen">
      <div className="client-steps">
        {['Dados', 'Confirmação', 'Contrato', 'Assinatura'].map((label, i) => (
          <span key={label} className={step >= i + 1 ? (step > i + 1 ? 'done' : 'active') : ''}>{i + 1}. {label}</span>
        ))}
      </div>

      {step === 1 && (
        <div className="client-form">
          <h2>Preencha seus dados</h2>
          <div className="field">
            <label>CNPJ/CPF</label>
            <input value={form.cnpj} onChange={(e) => set('cnpj', mDoc(e.target.value))} onBlur={onDocBlur} />
            {status.msg && <span className={`api-status ${status.type}`}>{status.msg}</span>}
          </div>
          <div className="field"><label>Nome / Empresa (fantasia)</label><input value={form.fantasia} onChange={(e) => set('fantasia', e.target.value)} /></div>
          <div className="field"><label>Razão social (se aplicável)</label><input value={form.razao} onChange={(e) => set('razao', e.target.value)} /></div>
          <div className="field"><label>E-mail</label><input value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label>CEP</label><input value={form.cep} onChange={(e) => set('cep', mCEP(e.target.value))} onBlur={onCepBlur} /></div>
          <div className="field"><label>Endereço</label><input value={form.rua} onChange={(e) => set('rua', e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>Complemento</label><input value={form.comp} onChange={(e) => set('comp', e.target.value)} /></div>
            <div className="field"><label>Bairro</label><input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
          </div>
          <div className="field"><label>Município/UF</label><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>Nome do responsável</label><input value={form.resp} onChange={(e) => set('resp', e.target.value)} /></div>
            <div className="field"><label>CPF do responsável</label><input value={form.cpf} onChange={(e) => set('cpf', mDoc(e.target.value))} /></div>
          </div>
          <div className="field"><label>WhatsApp</label><input value={form.wpp} onChange={(e) => set('wpp', mPhone(e.target.value))} /></div>
          {erro && <div className="msg-err">{erro}</div>}
          <button className="btn-p" onClick={formNext}>Próximo →</button>
        </div>
      )}

      {step === 2 && (
        <div className="client-form">
          <h2>Confirme seus dados</h2>
          <p><strong>{cd.fantasia}</strong></p>
          <p>CNPJ/CPF: {cd.cnpj}</p>
          <p>E-mail: {cd.email}</p>
          <p>Endereço: {cd.rua}{cd.comp ? `, ${cd.comp}` : ''}, {cd.bairro}, {cd.cidade}, CEP {cd.cep}</p>
          <p>Responsável: {cd.resp} {cd.cpf ? `· CPF ${cd.cpf}` : ''}</p>
          <p>WhatsApp: {cd.wpp}</p>
          <p>Duração do contrato: {durLabel(contrato.duration)}</p>
          <div className="wizard-actions">
            <button className="btn-g" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn-p" onClick={() => setStep(3)}>Ver contrato completo →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="client-contract-view">
          <div className="ct-doc" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="wizard-actions">
            <button className="btn-g" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn-p" onClick={assinar} disabled={enviando}>{enviando ? 'Enviando...' : '✍️ Assinar contrato'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="client-form client-done">
          <h2>Documento enviado! ✅</h2>
          <p>Enviamos o contrato para o seu e-mail ({cd.email}) através da Autentique. Verifique sua caixa de entrada (e spam) para concluir a assinatura eletrônica.</p>
        </div>
      )}
    </div>
  );
}
