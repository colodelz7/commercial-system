import { useState } from 'react';
import CatBar from '../CatBar';
import ServicoModal from '../modals/ServicoModal';
import { R } from '../../lib/format';

export default function ServicosTab({ catalog }) {
  const { services, cats, salvar, excluir, usadoEmCombos } = catalog;
  const [cat, setCat] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const lista = cat === 'Todos' ? services : services.filter((s) => s.cat === cat);

  function onDelete(s) {
    const usadoEm = usadoEmCombos(s.id);
    let msg = `Excluir o serviço "${s.name}"? Esta ação não pode ser desfeita.\n\n(Orçamentos e contratos já criados com ele não são afetados.)`;
    if (usadoEm.length) msg = `ATENÇÃO: "${s.name}" faz parte do(s) combo(s): ${usadoEm.join(', ')}.\nExcluir vai deixar esse(s) combo(s) incompleto(s).\n\n${msg}`;
    if (!confirm(msg)) return;
    excluir(s.id);
  }

  return (
    <div id="tab-servicos" className="tab active">
      <div className="tab-toolbar">
        <CatBar cats={cats} active={cat} onChange={setCat} />
        <button className="btn-p tt-action" onClick={() => { setEditando(null); setModalOpen(true); }}>＋ Cadastrar serviço</button>
      </div>
      <div className="svc-catalog">
        {lista.map((s) => (
          <div className="svc-card" key={s.id}>
            <div className="svc-card-top">
              <span className="svc-cat-tag">{s.cat}</span>
              <span className={`svc-bill-tag ${s.bill === 'mensal' ? 'b-m' : 'b-p'}`}>{s.bill === 'mensal' ? 'Mensal' : 'Pontual'}</span>
            </div>
            <h3 className="svc-name">{s.name}</h3>
            <p className="svc-desc">{s.desc}</p>
            <ul className="svc-inc">{(s.inc || []).map((i, idx) => <li key={idx}>{i}</li>)}</ul>
            <div className="svc-price">{R(s.price)}{s.bill === 'mensal' ? <span>/mês</span> : <span> pontual</span>}</div>
            <div className="svc-actions">
              <button className="btn-s" onClick={() => { setEditando(s); setModalOpen(true); }}>✏️ Editar</button>
              <button className="btn-g" onClick={() => onDelete(s)}>🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>
      <ServicoModal
        open={modalOpen} editando={editando} cats={cats}
        onClose={() => setModalOpen(false)}
        onSave={(dados) => { salvar(dados); setModalOpen(false); }}
      />
    </div>
  );
}
