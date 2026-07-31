import { useState, useEffect } from 'react';
import { mDoc, mPhone, mCEP } from '../../lib/format';
import { useApiLookup } from '../../hooks/useApiLookup';

const CAMPOS_VAZIOS = { name: '', doc: '', wpp: '', email: '', resp: '', cpf: '', cep: '', cidade: '', rua: '', bairro: '', comp: '', obs: '' };

export default function ClienteModal({ open, editando, onClose, onSave }) {
  const [form, setForm] = useState(CAMPOS_VAZIOS);
  const [erro, setErro] = useState('');
  const { status, buscarCEP, buscarCNPJ } = useApiLookup();

  useEffect(() => {
    if (!open) return;
    setForm(editando ? { ...CAMPOS_VAZIOS, ...editando } : CAMPOS_VAZIOS);
    setErro('');
  }, [open, editando]);

  if (!open) return null;

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function onDocBlur() {
    const r = await buscarCNPJ(form.doc);
    if (!r) return;
    setForm((f) => ({
      ...f,
      name: f.name || r.fantasia,
      rua: f.rua || r.rua,
      comp: f.comp || r.comp,
      bairro: f.bairro || r.bairro,
      cidade: r.cidade || f.cidade,
      cep: f.cep ? f.cep : (r.cep ? mCEP(r.cep) : f.cep),
      email: f.email || r.email,
      wpp: f.wpp || (r.telefone ? mPhone(r.telefone) : f.wpp),
    }));
  }

  async function onCepBlur() {
    const r = await buscarCEP(form.cep);
    if (!r) return;
    setForm((f) => ({ ...f, rua: f.rua || r.rua, bairro: f.bairro || r.bairro, cidade: r.cidade || f.cidade }));
  }

  function salvar() {
    if (!form.name.trim()) return setErro('Informe o nome do cliente.');
    onSave({ ...form, id: editando?.id });
  }

  return (
    <div className="modal">
      <div className="mbox">
        <h2>{editando ? 'Editar cliente' : 'Cadastrar cliente'}</h2>
        <div className="field"><label>Nome</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field">
          <label>CPF/CNPJ</label>
          <input value={form.doc} onChange={(e) => set('doc', mDoc(e.target.value))} onBlur={onDocBlur} />
          {status.msg && <span className={`api-status ${status.type}`}>{status.msg}</span>}
        </div>
        <div className="field-row">
          <div className="field"><label>WhatsApp</label><input value={form.wpp} onChange={(e) => set('wpp', mPhone(e.target.value))} /></div>
          <div className="field"><label>E-mail</label><input value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Responsável</label><input value={form.resp} onChange={(e) => set('resp', e.target.value)} /></div>
          <div className="field"><label>CPF do responsável</label><input value={form.cpf} onChange={(e) => set('cpf', mDoc(e.target.value))} /></div>
        </div>
        <div className="field"><label>CEP</label><input value={form.cep} onChange={(e) => set('cep', mCEP(e.target.value))} onBlur={onCepBlur} /></div>
        <div className="field"><label>Rua</label><input value={form.rua} onChange={(e) => set('rua', e.target.value)} /></div>
        <div className="field-row">
          <div className="field"><label>Bairro</label><input value={form.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
          <div className="field"><label>Complemento</label><input value={form.comp} onChange={(e) => set('comp', e.target.value)} /></div>
        </div>
        <div className="field"><label>Cidade</label><input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
        <div className="field"><label>Observações</label><textarea rows="2" value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
        {erro && <div className="msg-err">{erro}</div>}
        <div className="modal-acts">
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
