// Cliente do chat do MorningBot (POST /api/chat, streaming SSE).
// Adaptado de arquivos/extraido/ColodelBot/ColodelBot/frontend/src/lib/api.js.

/**
 * Envia mensagem e consome o streaming SSE de /api/chat.
 * callbacks: { onDelta(textoAcumulado), onStatus(texto), onFim(textoCompleto) }
 */
export async function enviarMensagemChat({ mensagem, historico }, { onDelta, onStatus, onFim } = {}) {
  const resposta = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem, historico }),
  });

  if (resposta.status === 429) {
    const dados = await resposta.json().catch(() => ({}));
    throw new Error(dados.erro || 'Limite de mensagens atingido. Aguarde um pouco.');
  }
  if (!resposta.ok || !resposta.body) {
    const dados = await resposta.json().catch(() => ({}));
    throw new Error(dados.erro || dados.error || 'Não consegui falar com o assistente agora.');
  }

  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let buffer = '';
  let textoAcumulado = '';

  while (true) {
    const { value, done } = await leitor.read();
    if (done) break;
    buffer += decodificador.decode(value, { stream: true });

    let corte;
    while ((corte = buffer.indexOf('\n\n')) !== -1) {
      const bloco = buffer.slice(0, corte);
      buffer = buffer.slice(corte + 2);
      const linhaDados = bloco.split('\n').find((l) => l.startsWith('data:'));
      if (!linhaDados) continue;
      const jsonTexto = linhaDados.slice(5).trim();
      if (!jsonTexto) continue;

      let evento;
      try { evento = JSON.parse(jsonTexto); } catch { continue; }

      if (evento.tipo === 'delta') {
        textoAcumulado += evento.trecho;
        onDelta?.(textoAcumulado);
      } else if (evento.tipo === 'status') {
        onStatus?.(evento.texto);
      } else if (evento.tipo === 'fim') {
        textoAcumulado = evento.textoCompleto || textoAcumulado;
        onFim?.(textoAcumulado);
      } else if (evento.tipo === 'erro') {
        throw new Error(evento.mensagem);
      }
    }
  }

  if (!textoAcumulado) throw new Error('O MorningBot não respondeu nada. Tenta de novo.');
  return textoAcumulado;
}
