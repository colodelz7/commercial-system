import { useState, useRef, useEffect } from 'react';
import { enviarMensagemChat } from '../lib/chat';
import { renderMarkdown } from '../lib/markdown';

const TAMANHO_MAX_HISTORICO = 12;

export default function ChatPopup({ onClose }) {
  const [mensagens, setMensagens] = useState([
    { role: 'bot', text: 'Oi! Sou o MorningBot. Posso explicar as telas do sistema, consultar dados reais (ex: "quantos contratos fechamos em julho?") e até criar um orçamento pra você. Quer começar por onde?' },
  ]);
  const [texto, setTexto] = useState('');
  const [streamText, setStreamText] = useState(null);
  const [statusFerramenta, setStatusFerramenta] = useState('');
  const [aguardando, setAguardando] = useState(false);
  const [erro, setErro] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens, streamText, statusFerramenta]);

  async function enviar(e) {
    e.preventDefault();
    const msg = texto.trim();
    if (!msg || aguardando) return;

    const historico = mensagens.slice(-TAMANHO_MAX_HISTORICO).map((m) => ({ role: m.role, text: m.text }));
    setMensagens((m) => [...m, { role: 'user', text: msg }]);
    setTexto('');
    setErro('');
    setAguardando(true);
    setStatusFerramenta('');
    setStreamText(null);

    try {
      const textoFinal = await enviarMensagemChat(
        { mensagem: msg, historico },
        {
          onStatus: (t) => setStatusFerramenta(t),
          onDelta: (acumulado) => { setStatusFerramenta(''); setStreamText(acumulado); },
        }
      );
      setMensagens((m) => [...m, { role: 'bot', text: textoFinal }]);
    } catch (err) {
      setErro(err.message || 'Não consegui responder agora.');
    } finally {
      setStreamText(null);
      setStatusFerramenta('');
      setAguardando(false);
    }
  }

  return (
    <div className="chat-popup">
      <div className="chat-popup__head">
        <span>🤖 MorningBot</span>
        <button type="button" className="chat-popup__close" onClick={onClose} aria-label="Fechar">✕</button>
      </div>
      <div className="chat-popup__body" ref={scrollRef}>
        {mensagens.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
        ))}
        {statusFerramenta && <div className="chat-msg chat-msg--status">🔧 {statusFerramenta}</div>}
        {streamText !== null && (
          <div className="chat-msg chat-msg--bot" dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText || '...') }} />
        )}
        {erro && <div className="chat-msg chat-msg--erro">{erro}</div>}
      </div>
      <form className="chat-popup__input" onSubmit={enviar}>
        <input
          type="text" value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte algo sobre o sistema..." disabled={aguardando}
        />
        <button type="submit" className="btn-p" disabled={aguardando || !texto.trim()}>➤</button>
      </form>
    </div>
  );
}
