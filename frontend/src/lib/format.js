/* Funções utilitárias portadas do index.js original */

export function gid() { return 'id' + Date.now() + Math.random().toString(36).slice(2, 5); }

/* O token do link de contrato NÃO é mais gerado aqui: fora de contexto seguro
   (HTTP na rede) crypto.randomUUID não existe e o fallback com Math.random
   produzia token adivinhável. Agora quem gera é o servidor, com
   crypto.randomBytes — ver POST /api/contratos/:id/link. */

function _semCent(v) { return Math.round((Number(v) || 0) * 100) % 100 === 0; }

export function R(v) {
  const c = _semCent(v) ? 0 : 2;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: c, maximumFractionDigits: c }).format(v || 0);
}

export function Rint(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
}

export function compactBRL(v) {
  v = Math.round(v || 0);
  if (v >= 1000) { const k = v / 1000; const s = (k % 1 === 0 ? String(k) : k.toFixed(1)).replace('.', ','); return 'R$ ' + s + 'k'; }
  return 'R$ ' + v;
}

// Escapa também aspas: sem isso, usar esc() dentro de um atributo HTML
// (value="...", title="...") deixaria escapar um XSS silenciosamente.
export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function sl(s) { return String(s || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 28); }
export function now() { return new Date().toLocaleString('pt-BR'); }

export function qOf(s) { const q = parseFloat(s && s.qtd); return q > 0 ? q : 1; }

export function calcO(svcs, disc) {
  const m = svcs.filter((s) => s.bill === 'mensal').reduce((a, s) => a + s.price * qOf(s), 0);
  const p = svcs.filter((s) => s.bill === 'pontual').reduce((a, s) => a + s.price * qOf(s), 0);
  const d = (m + p) * (disc / 100);
  return { m, p, d, net: m + p - d };
}

export function fmtSeq(n) { return String(n || 0).padStart(4, '0'); }

/* Máscara CPF/CNPJ combinada */
export function mDoc(v) {
  v = v.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    if (v.length > 9) return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
    if (v.length > 6) return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
    if (v.length > 3) return v.slice(0, 3) + '.' + v.slice(3);
    return v;
  }
  return v.slice(0, 2) + '.' + v.slice(2, 5) + '.' + v.slice(5, 8) + '/' + v.slice(8, 12) + (v.length > 12 ? '-' + v.slice(12) : '');
}

export function mCEP(v) {
  v = v.replace(/\D/g, '').slice(0, 8);
  return v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
}

export function mPhone(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
  if (v.length > 6) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
  if (v.length > 2) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
  return v;
}

export function clampDisc(v) { let d = parseFloat(v) || 0; if (d < 0) d = 0; if (d > 20) d = 20; return d; }

export function parseNum(v) {
  return parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
}

/** Converte o valor digitado (modo % ou R$) para o % efetivo, dado o total bruto (base). */
export function discToPct(rawVal, mode, base, cap = 20) {
  let val = parseNum(rawVal); if (val < 0) val = 0;
  let pct = mode === 'brl' ? (base > 0 ? (val / base) * 100 : 0) : val;
  if (pct > cap) pct = cap; if (pct < 0) pct = 0;
  return Math.round(pct * 100) / 100;
}

export function isValidEmail(e) {
  e = (e || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function isValidCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== parseInt(cpf[9], 10)) return false;
  s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; if (d2 !== parseInt(cpf[10], 10)) return false;
  return true;
}

export function isValidCNPJ(cnpj) {
  cnpj = (cnpj || '').replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len) => {
    let s = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { s += parseInt(cnpj[len - i], 10) * pos--; if (pos < 2) pos = 9; }
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  };
  if (calc(12) !== parseInt(cnpj[12], 10)) return false;
  if (calc(13) !== parseInt(cnpj[13], 10)) return false;
  return true;
}

export function validaDoc(v, obrigatorio) {
  const d = (v || '').replace(/\D/g, '');
  if (!d) return obrigatorio ? { ok: false, msg: 'Informe o CPF ou CNPJ.' } : { ok: true };
  if (d.length === 11) return isValidCPF(d) ? { ok: true } : { ok: false, msg: 'CPF inválido. Confira os números.' };
  if (d.length === 14) return isValidCNPJ(d) ? { ok: true } : { ok: false, msg: 'CNPJ inválido. Confira os números.' };
  return { ok: false, msg: 'Documento incompleto: CPF tem 11 dígitos e CNPJ tem 14.' };
}

export function isValidPhone(v) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 10 && d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}

/** Quebra um combo nos serviços que o compõem, consultando o catálogo atual. */
export function comboParts(item, services) {
  if (!item) return [];
  const cat = services.find((s) => s.id === item.id) || services.find((s) => s.name === item.name);
  const ids = (cat && cat.parts) || item.parts;
  if (!ids || !ids.length) return [];
  return ids.map((id) => services.find((s) => s.id === id)).filter(Boolean);
}
export function isCombo(item, services) { return comboParts(item, services).length > 0; }

export function addHist(item, action, icon) {
  if (!item.history) item.history = [];
  item.history.push({ action, icon: icon || '📝', time: now() });
}

/* ══ DATA DE COMPETÊNCIA ══════════════════════════════════════════
   `competencia` (string 'AAAA-MM-DD') diz em que mês o valor do item
   conta nos relatórios, independente de quando foi cadastrado. Caso
   clássico: orçamento criado em junho, cliente aprovou em julho — sem
   isto o valor aparecia em junho. Item sem competência segue usando a
   data de criação, então nada muda nos registros antigos. */
export function dataCompetencia(i) {
  if (i && i.competencia) {
    const d = new Date(i.competencia + 'T12:00:00'); // meio-dia: imune a fuso
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
export function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function fmtComp(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
}
/** Data efetiva pra cálculos de receita: competência > data de criação (string BR) > createdAtRaw. */
export function parseDateBR(s) {
  if (!s) return null;
  const str = String(s).split(',')[0].trim();
  const dp = str.split('/');
  if (dp.length === 3) {
    const dt = new Date(parseInt(dp[2], 10), parseInt(dp[1], 10) - 1, parseInt(dp[0], 10));
    if (!isNaN(dt.getTime())) return dt;
  }
  const fb = new Date(s);
  return isNaN(fb.getTime()) ? null : fb;
}
export function dataEfetiva(i) {
  return dataCompetencia(i) || parseDateBR(i.createdAt) || (i.createdAtRaw ? new Date(i.createdAtRaw) : null);
}
