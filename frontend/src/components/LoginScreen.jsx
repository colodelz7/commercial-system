import { useState, useEffect, useRef } from 'react';

function mmss(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [restantes, setRestantes] = useState(null);
  const [bloqueioSeg, setBloqueioSeg] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const timerRef = useRef(null);

  // Cronômetro do bloqueio: conta até zerar e libera o formulário sozinho.
  useEffect(() => {
    if (bloqueioSeg <= 0) return undefined;
    timerRef.current = setInterval(() => {
      setBloqueioSeg((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setErro('');
          setRestantes(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [bloqueioSeg > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const bloqueado = bloqueioSeg > 0;

  async function onSubmit(e) {
    e.preventDefault();
    if (bloqueado || carregando) return;
    setCarregando(true);
    const r = await onLogin(usuario, senha);
    setCarregando(false);
    if (r.ok) return;

    setSenha('');
    if (r.bloqueado) {
      setBloqueioSeg(r.segundos || 300);
      setRestantes(null);
      setErro('');
    } else {
      setErro(r.erro || 'Usuário ou senha incorretos.');
      setRestantes(typeof r.tentativasRestantes === 'number' ? r.tentativasRestantes : null);
    }
  }

  const pct = bloqueado ? Math.max(0, Math.min(100, (bloqueioSeg / 300) * 100)) : 0;

  return (
    <div id="screen-login" className="screen active">
      <div className="login-bg"><div className="orb o1"></div><div className="orb o2"></div></div>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand lg"><span className="bt">Morning</span><span className="bd">.</span></div>
        <p className="login-sub">Sistema Comercial Interno</p>

        <div className="field">
          <label>Usuário</label>
          <input
            type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)}
            placeholder="Seu usuário" autoComplete="username" disabled={bloqueado}
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha" autoComplete="current-password" disabled={bloqueado}
          />
        </div>

        {bloqueado && (
          <div className="login-bloqueio" role="alert" aria-live="assertive">
            <div className="lb-top">
              <span className="lb-ico">🔒</span>
              <span className="lb-txt">Acesso bloqueado por 3 tentativas erradas</span>
            </div>
            <div className="lb-cron" aria-label={`Liberado em ${mmss(bloqueioSeg)}`}>{mmss(bloqueioSeg)}</div>
            <div className="lb-bar"><div className="lb-fill" style={{ width: `${pct}%` }}></div></div>
            <p className="lb-sub">Tente novamente quando o tempo zerar.</p>
          </div>
        )}

        {!bloqueado && erro && (
          <div className="msg-err">
            {erro}
            {restantes > 0 && <><br /><small>{restantes === 1 ? 'Falta 1 tentativa antes do bloqueio de 5 minutos.' : `Faltam ${restantes} tentativas antes do bloqueio de 5 minutos.`}</small></>}
          </div>
        )}

        <button type="submit" className="btn-p w100" disabled={carregando || bloqueado}>
          {bloqueado ? `Aguarde ${mmss(bloqueioSeg)}` : (carregando ? 'Entrando...' : 'Entrar')}
        </button>
        <p className="login-hint">Acesso somente à equipe Morning.</p>
      </form>
    </div>
  );
}
