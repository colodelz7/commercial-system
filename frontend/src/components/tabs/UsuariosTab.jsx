import { useState } from 'react';
import { useUsuarios } from '../../hooks/useUsuarios';
import UsuarioModal from '../modals/UsuarioModal';

export default function UsuariosTab({ sessao }) {
  const { items, carregando, criar, editar, excluir } = useUsuarios();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  function abrirNovo() { setEditando(null); setModalOpen(true); }
  function abrirEdicao(u) { setEditando(u); setModalOpen(true); }

  async function onSave(form) {
    if (editando) {
      const dados = { usuario: form.usuario, nome: form.nome, papel: form.papel, ativo: form.ativo };
      if (form.senha) dados.senha = form.senha;
      await editar(editando.id, dados);
    } else {
      await criar({ usuario: form.usuario, nome: form.nome, senha: form.senha, papel: form.papel });
    }
    setModalOpen(false);
  }

  async function onDelete(id) {
    const u = items.find((x) => x.id === id);
    if (!u) return;
    if (!confirm(`Excluir o usuário "${u.nome}" (@${u.usuario})?\n\nIsso não pode ser desfeito. Se a pessoa só saiu da equipe, prefira EDITAR e marcar como Inativo, assim o histórico dela continua fazendo sentido.`)) return;
    try { await excluir(id); setModalOpen(false); }
    catch (e) { alert(e.message || 'Não consegui excluir.'); }
  }

  const lista = items.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  return (
    <div id="tab-usuarios" className="tab active">
      <div className="pessoa-head">
        <div>
          <h2 className="pessoa-title">Usuários</h2>
          <p className="pessoa-count">{carregando ? 'Carregando…' : `${items.length} pessoa(s) na equipe`}</p>
        </div>
        <button className="btn-p" onClick={abrirNovo}>＋ Novo usuário</button>
      </div>
      <div className="pessoa-list">
        {!carregando && lista.length === 0 && <p className="empty-sel">Nenhum usuário cadastrado.</p>}
        {lista.map((u) => {
          const souEu = u.id === sessao?.id;
          const inicial = (u.nome || u.usuario || '?').trim().charAt(0).toUpperCase() || '?';
          return (
            <div className={`pessoa-row${u.ativo ? '' : ' inativo'}`} key={u.id} onClick={() => abrirEdicao(u)}>
              <div className="pessoa-av">{inicial}</div>
              <div className="pessoa-id">
                <div className="pessoa-nome">{u.nome || '(sem nome)'}{souEu && <span className="usr-eu"> · você</span>}</div>
                <div className="pessoa-sub">@{u.usuario}</div>
              </div>
              <div className="pessoa-tags">
                {!u.ativo && <span className="pessoa-pill pill-off">Inativo</span>}
                <span className={`pessoa-pill ${u.papel === 'admin' ? 'pill-admin' : 'pill-membro'}`}>{u.papel === 'admin' ? 'Admin' : 'Membro'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <UsuarioModal open={modalOpen} editando={editando} sessao={sessao} onClose={() => setModalOpen(false)} onSave={onSave} onDelete={onDelete} />
    </div>
  );
}
