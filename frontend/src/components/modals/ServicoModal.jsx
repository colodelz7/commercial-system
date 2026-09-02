import { useState, useEffect } from 'react';
import MoneyInput from '../MoneyInput';

export default function ServicoModal({ open, editando, cats, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', cat: '', desc: '', inc: '', price: '', bill: 'mensal' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      name: editando?.name || '', cat: editando?.cat || '', desc: editando?.desc || '',
      inc: (editando?.inc || []).join('\n'), price: editando?.price ?? '', bill: editando?.bill || 'mensal',
    });
    setErro('');
  }, [open, editando]);

  if (!open) return null;

  function salvar() {
    const name = form.name.trim(), cat = form.cat.trim();
    const inc = form.inc.split('\n').map((x) => x.trim()).filter(Boolean);
    const price = parseFloat(String(form.price).replace(',', '.'));
    if (!name) return setErro('Dê um nome para o serviço.');
    if (!cat) return setErro('Informe a categoria.');
    if (isNaN(price) || price <= 0) return setErro('Informe um preço válido maior que zero.');
    onSave({ id: editando?.id, name, cat, desc: form.desc.trim(), inc, price, bill: form.bill === 'pontual' ? 'pontual' : 'mensal' });
  }

  return (
    <div className="modal">
      <div className="mbox">
        <h2>{editando ? 'Editar serviço' : 'Cadastrar novo serviço'}</h2>
        <div className="field"><label>Nome</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field">
          <label>Categoria</label>
          <input list="svc-cats-list" value={form.cat} onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value }))} />
          <datalist id="svc-cats-list">{cats.filter((c) => c !== 'Todos').map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field"><label>Descrição</label><textarea rows="2" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} /></div>
        <div className="field"><label>Itens inclusos (um por linha)</label><textarea rows="4" value={form.inc} onChange={(e) => setForm((f) => ({ ...f, inc: e.target.value }))} /></div>
        <div className="field-row">
          <div className="field"><label>Preço</label><MoneyInput value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} /></div>
          <div className="field">
            <label>Cobrança</label>
            <select value={form.bill} onChange={(e) => setForm((f) => ({ ...f, bill: e.target.value }))}>
              <option value="mensal">Mensal</option>
              <option value="pontual">Pontual</option>
            </select>
          </div>
        </div>
        {erro && <div className="msg-err">{erro}</div>}
        <div className="modal-acts">
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
