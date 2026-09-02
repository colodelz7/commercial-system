// Chat do MorningBot (popup do botão flutuante) — ver services/geminiService.js
// e services/assistantTools.js (ferramentas reais: consultar dados, criar orçamento).
// Requer sessão do sistema (exigeAuth é aplicado onde este router é montado).
const express = require('express');
const { gerarResposta } = require('../services/geminiService');
const { executarFerramenta } = require('../services/assistantTools');
const { rateLimit } = require('../lib/rateLimit');

const router = express.Router();
const TAMANHO_MAX_HISTORICO = 12;

router.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 45, chave: 'chat' }), async (req, res) => {
  const { mensagem, historico } = req.body || {};

  if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
    return res.status(400).json({ erro: 'Envie uma mensagem válida.' });
  }
  if (mensagem.length > 4000) {
    return res.status(400).json({ erro: 'Mensagem muito longa (máximo de 4000 caracteres).' });
  }

  const historicoSeguro = Array.isArray(historico) ? historico.slice(-TAMANHO_MAX_HISTORICO) : [];
  const contextoCompleto = [...historicoSeguro, { role: 'user', text: mensagem.trim() }];
  const contextoUsuario = { nome: req.usuario?.nome, papel: req.usuario?.papel };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const enviarEvento = (tipo, payload) => res.write(`data: ${JSON.stringify({ tipo, ...payload })}\n\n`);

  try {
    const texto = await gerarResposta(contextoCompleto, {
      onDelta: (trecho) => enviarEvento('delta', { trecho }),
      onStatus: (texto2) => enviarEvento('status', { texto: texto2 }),
      executarFerramenta: (nome, args) => executarFerramenta(nome, args, contextoUsuario),
    });
    enviarEvento('fim', { textoCompleto: texto });
  } catch (erro) {
    console.error('[chat] erro:', erro.message);
    let mensagemErro = 'Não consegui falar com o Gemini agora. Tente novamente em instantes.';
    if (erro.codigo === 'SEM_API_KEY') mensagemErro = 'Chave da API do Gemini não configurada no servidor.';
    if (erro.codigo === 'COTA_EXCEDIDA') mensagemErro = 'A cota gratuita diária da API do Gemini para este projeto acabou por hoje. Volte amanhã ou troque a chave/modelo no backend/.env.';
    enviarEvento('erro', { mensagem: mensagemErro });
  } finally {
    res.end();
  }
});

module.exports = router;
