import { useState, useMemo } from 'react';
import ClienteModal from '../modals/ClienteModal';

function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

export default function ClientesTab({ clientes }) {
  const { items, salvar, excluir } = clientes;
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let l = items;
    if (q) {
      const qd = soDigitos(q);
      l = l.filter((c) => {
        const hay = [c.name, c.resp, c.email, c.cidade, c.bairro, c.rua, c.comp, c.obs, c.wpp, c.doc, c.cpf].map((x) => (x || '').toLowerCase()).join(' ');
        if (hay.includes(q)) return true;
        if (qd && (soDigitos(c.doc).includes(qd) || soDigitos(c.wpp).includes(qd) || soDigitos(c.cpf).includes(qd))) return true;
        return false;
      });
    }
    return [...l].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [items, busca]);

  function onDelete(c) {
    if (!confirm(`Excluir o cliente "${c.name || ''}"? Esta ação não pode ser desfeita.\n\n(Orçamentos e contratos já criados com ele não são afetados.)`)) return;
    excluir(c.id);
  }

  return (
    <div id="tab-clientes" className="tab active">
      <div className="tab-toolbar">
        <div className="search-box"><input type="text" placeholder="Buscar por nome, empresa, responsável ou CNPJ/CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <button className="btn-p tt-action" onClick={() => { setEditando(null); setModalOpen(true); }}>＋ Cadastrar cliente</button>
      </div>
      <div className="svc-catalog" id="cli-list">
        {lista.length === 0 && <p className="empty-sel">Nenhum cliente cadastrado ainda. Clique em "Cadastrar cliente".</p>}
        {lista.map((c) => (
          <div className="svc-card" key={c.id}>
            <h3 className="svc-name">{c.name || '(sem nome)'}</h3>
            {c.doc && <p className="svc-desc">🪪 {c.doc}</p>}
            <ul className="svc-inc">
              {c.email && <li>✉️ {c.email}</li>}
              {c.wpp && <li>📱 {c.wpp}</li>}
              {c.resp && <li>👤 {c.resp}{c.cpf ? ` · CPF ${c.cpf}` : ''}</li>}
              {c.cidade && <li>📍 {[c.rua, c.bairro, c.cidade].filter(Boolean).join(', ')}</li>}
            </ul>
            <div className="svc-actions">
              <button className="btn-s" onClick={() => { setEditando(c); setModalOpen(true); }}>✏️ Editar</button>
              <button className="btn-g" onClick={() => onDelete(c)}>🗑 Excluir</button>
            </div>
          </div>
        ))}
      </div>
      <ClienteModal
        open={modalOpen} editando={editando}
        onClose={() => setModalOpen(false)}
        onSave={(dados) => { salvar(dados); setModalOpen(false); }}
      />
    </div>
  );
}
