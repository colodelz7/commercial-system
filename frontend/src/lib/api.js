// Vazio = caminho relativo, passa pelo proxy do Vite (/autentique -> backend local).
export const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Envia o contrato para assinatura. O destinatário NÃO vai daqui: o servidor
 * usa o e-mail gravado no próprio contrato (senão qualquer um com o link
 * mandaria e-mail em nome da empresa para onde quisesse).
 */
export async function enviarParaAutentique(contrato, pdfBase64) {
  const resp = await fetch(`${API_BASE}/autentique/criar-documento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contratoId: contrato.id,
      clientLink: contrato.clientLink,
      nome: `Contrato - ${contrato.clientName || 'Cliente'}`,
      pdfBase64,
    }),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || `Erro ${resp.status} ao enviar para a Autentique`);
  }
  return resp.json();
}

export async function statusAssinatura(autentiqueId) {
  const resp = await fetch(`${API_BASE}/autentique/status/${encodeURIComponent(autentiqueId)}`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/** Pede ao servidor o link de assinatura (token gerado lá, com aleatoriedade forte). */
export async function gerarLinkAssinatura(contratoId) {
  const resp = await fetch(`${API_BASE}/api/contratos/${encodeURIComponent(contratoId)}/link`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.error || `Erro ${resp.status} ao gerar o link.`);
  }
  return resp.json();
}
