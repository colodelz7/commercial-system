// Vazio = caminho relativo, passa pelo proxy do Vite (/autentique -> backend local).
export const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function enviarParaAutentique(contrato, signatario, pdfBase64) {
  const resp = await fetch(`${API_BASE}/autentique/criar-documento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contratoId: contrato.id, clientLink: contrato.clientLink, signatario, pdfBase64 }),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.erro || `Erro ${resp.status} ao enviar para a Autentique`);
  }
  return resp.json();
}

export async function statusAssinatura(autentiqueId) {
  const resp = await fetch(`${API_BASE}/autentique/status/${encodeURIComponent(autentiqueId)}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
