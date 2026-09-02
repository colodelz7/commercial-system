import { useState, useRef, useEffect } from 'react';

// Dropdown customizado (botão + painel flutuante), usado no Buscador pra
// segmento e raio — igual ao widget .dd-* do sistema de referência, em vez
// de <select> nativo (cujo popup não dá pra estilizar no tema escuro).
// Fecha sozinho ao clicar em qualquer opção da lista (bubbling) ou fora dele.
export default function Dropdown({ valueLabel, children, searchPlaceholder, onSearch }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [aberto]);

  return (
    <div className="dd" ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="dd-btn" onClick={() => setAberto((v) => !v)}>
        <span className="dd-val">{valueLabel}</span>
        <svg className="dd-caret" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {aberto && (
        <div className="dd-panel">
          {onSearch && (
            <div className="dd-search-wrap">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" className="dd-search" placeholder={searchPlaceholder} autoFocus onChange={(e) => onSearch(e.target.value)} />
            </div>
          )}
          <div className="dd-list" onClickCapture={() => setAberto(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}
