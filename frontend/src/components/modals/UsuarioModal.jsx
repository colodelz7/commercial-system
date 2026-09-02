import { useState, useEffect } from 'react';

const CAMPOS_VAZIOS = { usuario: '', nome: '', papel: 'usuario', ativo: '1', senha: '' };

export default function UsuarioModal({ open, editando, sessao, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(CAMPOS_VAZIOS);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editando
      ? { usuario: editando.usuario, nome: editando.nome, papel: editando.papel, ativo: editando.ativo ? '1' : '0', senha: '' }
      : CAMPOS_VAZIOS);
    setErro('');
  }, [open, editando]);

  if (!open) return null;

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  async function salvar() {
    const login = form.usuario.trim().toLowerCase();
    const nome = form.nome.trim();
    if (!/^[a-z0-9_.-]{3,32}$/.test(login)) return setErro('Login inválido: de 3 a 32 caracteres, sem espaço nem acento.');
    if (!nome) return setErro('Informe o nome completo.');
    if ((!editando || form.senha) && form.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    if (editando && editando.id === sessao?.id && (form.papel !== 'admin' || form.ativo !== '1')) {
      return setErro('Você não pode tirar o próprio acesso de admin nem se desativar. Peça para o outro admin fazer isso.');
    }
    setErro(''); setSalvando(true);
    try {
      await onSave({ usuario: login, nome, papel: form.papel, ativo: form.ativo === '1', senha: form.senha });
    } catch (e) {
      setErro(e.message || 'Não consegui salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const podeExcluir = editando && editando.id !== sessao?.id;

  return (
    <div className="modal">
      <div className="mbox wide">
        <h3>{editando ? 'Editar ' + editando.nome : 'Novo usuário'}</h3>
        <div className="svc-form-row">
          <div className="field">
            <label>Login</label>
            <input type="text" value={form.usuario} onChange={(e) => set('usuario', e.target.value)} placeholder="ex.: maria" autoComplete="off" />
          </div>
          <div className="field">
            <label>Nome completo</label>
            <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="ex.: Maria Silva" autoComplete="off" />
          </div>
        </div>
        <div className="svc-form-row">
          <div className="field">
            <label>Permissão</label>
            <select value={form.papel} onChange={(e) => set('papel', e.target.value)}>
              <option value="usuario">Usuário · usa o sistema</option>
              <option value="admin">Admin · também gerencia usuários</option>
            </select>
          </div>
          <div className="field">
            <label>Situação</label>
            <select value={form.ativo} onChange={(e) => set('ativo', e.target.value)}>
              <option value="1">Ativo · pode entrar</option>
              <option value="0">Inativo · bloqueado</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>{editando ? 'Nova senha (opcional)' : 'Senha (mínimo 6 caracteres)'}</label>
          <input type="text" value={form.senha} onChange={(e) => set('senha', e.target.value)} placeholder="mínimo 6 caracteres" autoComplete="new-password" />
          {editando && <p className="usr-hint">Deixe em branco para manter a senha atual.</p>}
        </div>
        {erro && <div className="msg-err">{erro}</div>}
        <div className="modal-acts">
          {podeExcluir && <button className="btn-del" onClick={() => onDelete(editando.id)}>🗑 Excluir</button>}
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : '💾 Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
