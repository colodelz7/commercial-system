import { useState } from 'react';
import ChatPopup from './ChatPopup';

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatPopup onClose={() => setOpen(false)} />}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        title="Falar com o MorningBot"
        aria-label="Abrir assistente"
      >
        {open ? '✕' : '🤖'}
      </button>
    </>
  );
}
