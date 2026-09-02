import { useState, useEffect } from 'react';
import { mPhone } from '../../lib/format';
import { ORIGENS } from '../../lib/constants';
import { LEAD_STAGES } from '../../hooks/useLeads';
import MoneyInput from '../MoneyInput';

const VAZIO = { name: '', empresa: '', wpp: '', email: '', valor: '', obs: '', temp: 'Fria', origem: '', stage: 'leads' };

export default function LeadModal({ open, editando, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editando ? { ...VAZIO, ...editando, valor: editando.valor ?? '' } : VAZIO);
    setErro('');
  }, [open, editando]);

  if (!open) return null;

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  function salvar() {
    if (!form.name.trim()) return setErro('Informe o nome do contato.');
    onSave({ ...form, id: editando?.id, valor: parseFloat(String(form.valor).replace(',', '.')) || 0 });
  }

  return (
    <div className="modal">
      <div className="mbox">
        <h2>{editando ? 'Editar Lead' : 'Adicionar Lead'}</h2>
        <div className="field"><label>Nome do contato</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label>Empresa</label><input value={form.empresa} onChange={(e) => set('empresa', e.target.value)} /></div>
        <div className="field-row">
          <div className="field"><label>WhatsApp</label><input value={form.wpp} onChange={(e) => set('wpp', mPhone(e.target.value))} /></div>
          <div className="field"><label>E-mail</label><input value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Valor estimado</label><MoneyInput value={form.valor} onChange={(v) => set('valor', v)} /></div>
          <div className="field">
            <label>Temperatura</label>
            <select value={form.temp} onChange={(e) => set('temp', e.target.value)}>
              <option value="Quente">🔥 Quente</option>
              <option value="Morna">🌤️ Morna</option>
              <option value="Fria">❄️ Fria</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Origem</label>
            <select value={form.origem} onChange={(e) => set('origem', e.target.value)}>
              <option value="">—</option>
              {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Etapa</label>
            <select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Observações</label><textarea rows="2" value={form.obs} onChange={(e) => set('obs', e.target.value)} /></div>
        {erro && <div className="msg-err">{erro}</div>}
        <div className="modal-acts">
          {editando && <button className="btn-g" onClick={() => onDelete(editando.id)}>🗑 Excluir</button>}
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
