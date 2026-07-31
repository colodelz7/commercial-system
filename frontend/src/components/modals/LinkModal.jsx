export default function LinkModal({ token, onClose }) {
  if (!token) return null;
  const url = `${window.location.origin}${window.location.pathname}?cliente=${token}`;

  function copiar() {
    navigator.clipboard.writeText(url).then(() => alert('Link copiado!'));
  }

  return (
    <div className="modal">
      <div className="mbox">
        <h3>🔗 Link do Cliente Gerado!</h3>
        <p>Envie este link para o cliente preencher os dados e assinar o contrato.</p>
        <div className="link-row"><input type="text" readOnly value={url} onClick={(e) => e.target.select()} /><button className="btn-p" onClick={copiar}>Copiar</button></div>
        <div className="modal-ok">✅ Status atualizado: Aguardando assinatura</div>
        <button className="btn-g w100 mt10" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
