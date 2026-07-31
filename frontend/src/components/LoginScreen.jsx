import { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setCarregando(true);
    const ok = await onLogin(usuario, senha);
    setCarregando(false);
    setErro(!ok);
  }

  return (
    <div id="screen-login" className="screen active">
      <div className="login-bg"><div className="orb o1"></div><div className="orb o2"></div></div>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand lg"><span className="bt">Colodel</span><span className="bd">.</span></div>
        <p className="login-sub">Sistema Comercial Interno</p>
        <div className="field">
          <label>Usuário</label>
          <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Seu usuário" autoComplete="username" />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" autoComplete="current-password" />
        </div>
        <div className={`msg-err${erro ? '' : ' hidden'}`}>Usuário ou senha incorretos.</div>
        <button type="submit" className="btn-p w100" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
        <p className="login-hint">Acesso somente à equipe Colodel.</p>
      </form>
    </div>
  );
}
