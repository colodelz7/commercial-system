// Rate limiter simples em memória, compartilhado entre back.js e routes/chat.js.
// Suficiente para uma instância única rodando local.
const crypto = require('crypto');

const _rateHits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, rec] of _rateHits) if (now > rec.reset) _rateHits.delete(k);
}, 60 * 1000).unref();

function ipDe(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

// Comparação de segredos em tempo constante (não vaza tamanho/prefixo por timing).
function segredoIgual(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch (e) { return false; }
}

function rateLimit({ windowMs, max, chave }) {
  return (req, res, next) => {
    const ip = ipDe(req);
    const k = (chave || '') + '|' + ip;
    const now = Date.now();
    let rec = _rateHits.get(k);
    if (!rec || now > rec.reset) { rec = { count: 0, reset: now + windowMs }; _rateHits.set(k, rec); }
    rec.count++;
    if (rec.count > max) {
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns instantes.' });
    }
    next();
  };
}

module.exports = { ipDe, segredoIgual, rateLimit };
