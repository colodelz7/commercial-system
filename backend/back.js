// ==================================================================
// Morning — Sistema Comercial · BACKEND
// ------------------------------------------------------------------
// Node/Express + PostgreSQL local (Docker, ver docker-compose.yml na raiz).
//
// Este backend substitui o antigo modelo 100% localStorage do frontend:
//   - banco   -> PostgreSQL local (pg)
//   - API     -> os endpoints /api/* deste arquivo
//   - auth    -> bcrypt + JWT em cookie httpOnly
//   - storage -> upload em disco (multer)
//
// ⚠️ Quem protege os dados é ESTE ARQUIVO: todo endpoint /api/* (exceto o
// link público de contrato, que é protegido por token) passa por exigeAuth.
//
// Portado e adaptado de uma versão de referência (arquivos/extraido/Sistema
// Comercial/BACKEND/back.js) para rodar localmente como projeto de portfólio:
// sem push notifications, sem scripts de deploy/backup de VPS, sem os
// contornos de WAF de hospedagem compartilhada.
// ==================================================================

try { require('dotenv').config(); } catch (e) { /* segue sem dotenv, usando env do sistema */ }

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ipDe, segredoIgual, rateLimit } = require('./lib/rateLimit');
const { pool, q } = require('./lib/db');
const chatRouter = require('./routes/chat');

let nodemailer = null;
try { nodemailer = require('nodemailer'); }
catch (e) { console.warn('[AVISO] nodemailer não instalado — aviso por e-mail desativado.'); }

const app = express();
app.set('trust proxy', 1);

// Cabeçalhos de segurança em toda resposta.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), usb=()');
  next();
});

/* ==================================================================
   CONFIGURAÇÃO / SEGREDOS (vêm do .env)
================================================================== */
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRA = process.env.JWT_EXPIRA || '12h';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_NOME = 'comercial_sessao';
const UPLOAD_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads-local');

const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN || '';
const AUTENTIQUE_URL = 'https://api.autentique.com.br/v2/graphql';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const API_SECRET = process.env.API_SECRET || '';
const CRIADOR_EMAIL = (process.env.CRIADOR_EMAIL || '').toLowerCase();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const META_PAGE_TOKEN = process.env.META_PAGE_TOKEN || '';
// Segredo do app Meta (Configurações > Básico), usado só pra CONFERIR a
// assinatura HMAC do webhook — sem isso, POST /meta/webhook aceitaria
// payload de qualquer origem sem provar que veio da Meta de verdade.
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_GRAPH = 'https://graph.facebook.com/v21.0';

const MAIL_USER = process.env.MAIL_USER || '';
const MAIL_PASS = process.env.MAIL_PASS || '';
const MAIL_TO = process.env.MAIL_TO || '';
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || '';
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || '';

if (!JWT_SECRET) console.warn('[AVISO] JWT_SECRET não definido — defina no .env (qualquer texto longo e aleatório).');
if (!AUTENTIQUE_TOKEN) console.warn('[AVISO] AUTENTIQUE_TOKEN não definido — assinatura digital fica desativada.');

const ALLOWED = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ALLOWED.length) console.warn('[AVISO] ALLOWED_ORIGIN não definido — o CORS fica aberto.');
app.use(cors(ALLOWED.length ? {
  origin: (origin, cb) => {
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('Origem não permitida pelo CORS: ' + origin));
  },
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: true, // necessário para o cookie de sessão viajar
} : { origin: false }));

// verify guarda o corpo bruto (req.rawBody) — necessário pra conferir a
// assinatura HMAC do webhook do Meta (ver POST /meta/webhook mais abaixo).
app.use(express.json({ limit: '12mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cookieParser());

function exigeOrigemConhecida(req, res, next) {
  if (!ALLOWED.length) return next();
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) return next();
  return res.status(403).json({ error: 'Origem não autorizada.' });
}

function exigeApiSecret(req, res, next) {
  if (!API_SECRET) return res.status(404).json({ error: 'Endpoint indisponível.' });
  if (!segredoIgual(req.get('x-api-key'), API_SECRET)) return res.status(401).json({ error: 'Não autorizado.' });
  next();
}

/* ==================================================================
   POSTGRESQL — pool/q vêm de ./lib/db (compartilhado com routes/chat.js)
================================================================== */
(async () => {
  try {
    const r = await q('SELECT current_database() AS db, current_user AS usr');
    console.log('[pg] conectado:', r.rows[0].db, 'como', r.rows[0].usr);
  } catch (e) {
    console.error('[FATAL] Não consegui conectar no PostgreSQL:', e.message);
    console.error('        Confira se `docker compose up -d` está rodando e se PGHOST/PGUSER/PGDATABASE/PGPASSWORD no .env batem com o docker-compose.yml.');
  }
})();

// As tabelas genéricas (id TEXT PK + data JSONB). O nome de tabela nunca
// vem direto do usuário para o SQL sem passar por esta allowlist.
const TABELAS = ['orcamentos', 'contratos', 'servicos', 'relatorios', 'leads', 'clientes', 'diagnosticos', 'spots', 'handoffs', 'logs', 'prospeccao'];
function tabelaValida(t) { return TABELAS.includes(t); }

/* ==================================================================
   AUTENTICAÇÃO — bcrypt + JWT em cookie httpOnly
================================================================== */
function gerarToken(u) {
  return jwt.sign({ sub: u.id, usuario: u.usuario, nome: u.nome, papel: u.papel }, JWT_SECRET, { expiresIn: JWT_EXPIRA });
}
function enviarCookie(res, token) {
  res.cookie(COOKIE_NOME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}
function exigeAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NOME];
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.clearCookie(COOKIE_NOME, { path: '/' });
    return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
}
function exigeAdmin(req, res, next) {
  if (!req.usuario || req.usuario.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  next();
}

async function registrarLog(entry) {
  try {
    const id = 'log' + Date.now() + Math.random().toString(36).slice(2, 7);
    const rec = Object.assign({ id, time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), user: '', refId: '' }, entry);
    await q('INSERT INTO logs (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING', [id, JSON.stringify(rec)]);
  } catch (e) { console.error('[log] falha ao registrar:', e.message); }
}

// 5 falhas seguidas do mesmo IP => bloqueia 5 min o login de qualquer conta.
const LOGIN_MAX_FALHAS = 5;
const LOGIN_BLOQUEIO_MS = 5 * 60 * 1000;
const _loginFalhas = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, f] of _loginFalhas) if (now > (f.blockedUntil || 0) && !f.count) _loginFalhas.delete(ip);
}, 60 * 1000).unref();
function loginBloqueado(ip) {
  const f = _loginFalhas.get(ip);
  return (f && f.blockedUntil > Date.now()) ? Math.ceil((f.blockedUntil - Date.now()) / 60000) : 0;
}
function registrarFalhaLogin(ip) {
  let f = _loginFalhas.get(ip);
  if (!f) f = { count: 0, blockedUntil: 0 };
  else if (f.blockedUntil && Date.now() > f.blockedUntil) f = { count: 0, blockedUntil: 0 };
  f.count++;
  let bloqueou = false;
  if (f.count >= LOGIN_MAX_FALHAS) { f.blockedUntil = Date.now() + LOGIN_BLOQUEIO_MS; f.count = 0; bloqueou = true; }
  _loginFalhas.set(ip, f);
  return bloqueou;
}
function limparFalhasLogin(ip) { _loginFalhas.delete(ip); }

app.post('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, chave: 'login' }), async (req, res) => {
  const ip = ipDe(req);
  try {
    const body = req.body || {};
    const usuario = String(body.usuario || '').trim().toLowerCase();
    const senha = String(body.senha || '');

    const minsBloq = loginBloqueado(ip);
    if (minsBloq > 0) {
      registrarLog({ tipo: 'login', tipoLabel: 'Login', icon: '🚫', action: 'Tentativa durante bloqueio temporário (IP ' + ip + ')', nome: usuario || '—' });
      return res.status(429).json({ error: 'Acesso bloqueado por excesso de tentativas. Aguarde ' + minsBloq + ' minuto(s).', bloqueado: true, minutos: minsBloq });
    }
    if (!usuario || !senha) return res.status(400).json({ error: 'Informe usuário e senha.' });

    const r = await q('SELECT id, usuario, nome, senha_hash, papel, ativo FROM usuarios WHERE lower(usuario) = $1 LIMIT 1', [usuario]);
    const u = r.rows[0];
    const generico = { error: 'Usuário ou senha inválidos.' };

    function bloqMsg() {
      const mins = loginBloqueado(ip) || Math.ceil(LOGIN_BLOQUEIO_MS / 60000);
      return { error: 'Você errou o login 5 vezes. Acesso bloqueado por ' + mins + ' minuto(s).', bloqueado: true, minutos: mins };
    }
    function falhou(motivo) {
      const bloqueou = registrarFalhaLogin(ip);
      registrarLog({ tipo: 'login', tipoLabel: 'Login', icon: bloqueou ? '🚫' : '⛔', action: (bloqueou ? 'IP bloqueado por 5 min após 5 falhas. ' : '') + 'Tentativa de login falhou (' + motivo + '): usuário "' + (usuario || '—') + '" · IP ' + ip, nome: usuario || '—' });
      return bloqueou;
    }

    if (!u) { if (falhou('usuário inexistente')) return res.status(429).json(bloqMsg()); return res.status(401).json(generico); }
    if (!u.ativo) { if (falhou('usuário desativado')) return res.status(429).json(bloqMsg()); return res.status(403).json({ error: 'Usuário desativado. Fale com um administrador.' }); }

    const ok = await bcrypt.compare(senha, u.senha_hash);
    if (!ok) { if (falhou('senha incorreta')) return res.status(429).json(bloqMsg()); return res.status(401).json(generico); }

    limparFalhasLogin(ip);
    await q('UPDATE usuarios SET ultimo_login = now() WHERE id = $1', [u.id]);
    enviarCookie(res, gerarToken(u));
    registrarLog({ tipo: 'login', tipoLabel: 'Login', icon: '🔓', action: 'Login efetuado (IP ' + ip + ')', nome: u.usuario, user: u.nome });
    res.json({ ok: true, usuario: { id: u.id, usuario: u.usuario, nome: u.nome, papel: u.papel } });
  } catch (e) {
    console.error('[auth] erro no login:', e.message);
    res.status(500).json({ error: 'Erro ao entrar.' });
  }
});

app.post('/api/logout', (req, res) => { res.clearCookie(COOKIE_NOME, { path: '/' }); res.json({ ok: true }); });

app.get('/api/session', (req, res) => {
  const token = req.cookies && req.cookies[COOKIE_NOME];
  if (!token) return res.status(401).json({ error: 'Sem sessão.' });
  try {
    const u = jwt.verify(token, JWT_SECRET);
    res.json({ ok: true, usuario: { id: u.sub, usuario: u.usuario, nome: u.nome, papel: u.papel } });
  } catch (e) {
    res.clearCookie(COOKIE_NOME, { path: '/' });
    res.status(401).json({ error: 'Sessão expirada.' });
  }
});

/* ==================================================================
   GESTÃO DE USUÁRIOS (só admin). Senha nunca sai daqui.
================================================================== */
app.get('/api/usuarios', exigeAuth, exigeAdmin, async (req, res) => {
  try {
    const r = await q('SELECT id, usuario, nome, papel, ativo, ultimo_login, criado_em FROM usuarios ORDER BY nome');
    res.json(r.rows);
  } catch (e) {
    console.error('[usuarios] erro ao listar:', e.message);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

app.post('/api/usuarios', exigeAuth, exigeAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const usuario = String(b.usuario || '').trim().toLowerCase();
    const nome = String(b.nome || '').trim();
    const senha = String(b.senha || '');
    const papel = b.papel === 'admin' ? 'admin' : 'usuario';

    if (!/^[a-z0-9_.-]{3,32}$/.test(usuario)) return res.status(400).json({ error: 'Usuário inválido (3 a 32 caracteres, sem espaço nem acento).' });
    if (!nome) return res.status(400).json({ error: 'Informe o nome.' });
    if (senha.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

    const id = 'u' + Date.now() + crypto.randomBytes(3).toString('hex');
    const hash = await bcrypt.hash(senha, 12);
    await q('INSERT INTO usuarios (id, usuario, nome, senha_hash, papel) VALUES ($1,$2,$3,$4,$5)', [id, usuario, nome, hash, papel]);
    res.json({ ok: true, id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe um usuário com esse login.' });
    console.error('[usuarios] erro ao criar:', e.message);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

app.put('/api/usuarios/:id', exigeAuth, exigeAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const campos = [], vals = [];
    if (b.usuario !== undefined) {
      const novoLogin = String(b.usuario).trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,32}$/.test(novoLogin)) return res.status(400).json({ error: 'Login inválido (3 a 32 caracteres, sem espaço nem acento).' });
      campos.push('usuario = $' + vals.push(novoLogin));
    }
    if (b.nome !== undefined) campos.push('nome = $' + vals.push(String(b.nome).trim()));
    if (b.papel !== undefined) campos.push('papel = $' + vals.push(b.papel === 'admin' ? 'admin' : 'usuario'));
    if (b.ativo !== undefined) campos.push('ativo = $' + vals.push(!!b.ativo));
    if (b.senha) {
      if (String(b.senha).length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
      campos.push('senha_hash = $' + vals.push(await bcrypt.hash(String(b.senha), 12)));
    }
    if (!campos.length) return res.status(400).json({ error: 'Nada para atualizar.' });

    // Um admin não pode se rebaixar/desativar sozinho (senão ninguém mais administra).
    if (req.params.id === req.usuario.sub && (b.papel === 'usuario' || b.ativo === false)) {
      return res.status(400).json({ error: 'Você não pode remover o próprio acesso de administrador. Peça para outro admin.' });
    }

    vals.push(req.params.id);
    const r = await q('UPDATE usuarios SET ' + campos.join(', ') + ' WHERE id = $' + vals.length, vals);
    if (!r.rowCount) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe um usuário com esse login.' });
    console.error('[usuarios] erro ao editar:', e.message);
    res.status(500).json({ error: 'Erro ao editar usuário.' });
  }
});

app.delete('/api/usuarios/:id', exigeAuth, exigeAdmin, async (req, res) => {
  try {
    if (req.params.id === req.usuario.sub) return res.status(400).json({ error: 'Você não pode apagar a si mesmo.' });
    const r = await q('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[usuarios] erro ao remover:', e.message);
    res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
});

/* ==================================================================
   HEALTHCHECK — precisa ficar ANTES do roteador genérico /api/:tabela,
   senão "health" seria tratado como nome de tabela.
================================================================== */
app.get('/api/health', async (req, res) => {
  try {
    await q('SELECT 1');
    res.json({ ok: true, banco: 'conectado' });
  } catch (e) {
    res.status(503).json({ ok: false, banco: 'indisponível' });
  }
});

/* ==================================================================
   ANEXOS — upload em disco (multer). Precisa ficar ANTES do roteador
   genérico pelo mesmo motivo do healthcheck.
================================================================== */
const TIPOS_OK = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];
const EXT_OK = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];

try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); }
catch (e) { console.error('[anexos] não consegui criar a pasta de uploads:', e.message); }

function nomeLimpo(s) { return String(s || 'arquivo').replace(/[^\w.-]+/g, '_').slice(0, 120); }
function idValido(s) { return /^[A-Za-z0-9_-]{1,64}$/.test(String(s || '')); }

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!TIPOS_OK.includes(file.mimetype) || !EXT_OK.includes(ext)) {
      return cb(new Error('Tipo de arquivo não permitido: ' + (file.mimetype || ext)));
    }
    cb(null, true);
  },
});

app.post('/api/anexos', exigeAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const diagId = String((req.body && req.body.diagId) || '');
    if (!idValido(diagId)) return res.status(400).json({ error: 'Diagnóstico inválido.' });

    const nome = nomeLimpo(req.file.originalname);
    const relativo = diagId + '/' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '-' + nome;
    const destino = path.join(UPLOAD_DIR, relativo);
    if (!path.resolve(destino).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      return res.status(400).json({ error: 'Caminho inválido.' });
    }

    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, req.file.buffer);

    res.json({ nome: req.file.originalname, path: relativo, tipo: req.file.mimetype, tamanho: req.file.size, criadoEm: new Date().toISOString() });
  } catch (e) {
    console.error('[anexos] erro no upload:', e.message);
    res.status(400).json({ error: e.message || 'Erro ao enviar o arquivo.' });
  }
});

app.get(/^\/api\/anexos\/(.+)$/, exigeAuth, (req, res) => {
  try {
    const relativo = decodeURIComponent(req.params[0] || '');
    const alvo = path.resolve(UPLOAD_DIR, relativo);
    if (!alvo.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return res.status(400).json({ error: 'Caminho inválido.' });
    if (!fs.existsSync(alvo)) return res.status(404).json({ error: 'Arquivo não encontrado.' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(alvo);
  } catch (e) {
    console.error('[anexos] erro ao ler:', e.message);
    res.status(500).json({ error: 'Erro ao abrir o arquivo.' });
  }
});

app.delete(/^\/api\/anexos\/(.+)$/, exigeAuth, (req, res) => {
  try {
    const relativo = decodeURIComponent(req.params[0] || '');
    const alvo = path.resolve(UPLOAD_DIR, relativo);
    if (!alvo.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return res.status(400).json({ error: 'Caminho inválido.' });
    if (fs.existsSync(alvo)) fs.unlinkSync(alvo);
    res.json({ ok: true });
  } catch (e) {
    console.error('[anexos] erro ao remover:', e.message);
    res.status(500).json({ error: 'Erro ao excluir o arquivo.' });
  }
});

/* ==================================================================
   CHAT (MorningBot) — botão flutuante.
================================================================== */
app.use('/api/chat', exigeAuth, chatRouter);

/* ==================================================================
   PROSPECÇÃO — busca de empresas por cidade/segmento (OSM + IBGE, grátis).
   Precisa ficar antes do roteador genérico /api/:tabela.
================================================================== */
const OSM_UA = 'ComercialLocal/1.0 (portfolio)';
const SEG_OSM = {
  'advocacia': ['nwr["office"="lawyer"]'],
  'clinica odontologica': ['nwr["amenity"="dentist"]', 'nwr["healthcare"="dentist"]', 'nwr["office"="dentist"]'],
  'odontologia': ['nwr["amenity"="dentist"]', 'nwr["healthcare"="dentist"]', 'nwr["office"="dentist"]'],
  'dentista': ['nwr["amenity"="dentist"]', 'nwr["healthcare"="dentist"]', 'nwr["office"="dentist"]'],
  'contabilidade': ['nwr["office"="accountant"]', 'nwr["office"="tax_advisor"]'],
  'restaurante': ['nwr["amenity"="restaurant"]', 'nwr["amenity"="food_court"]'],
  'arquitetura': ['nwr["office"="architect"]'],
  'industria': ['nwr["landuse"="industrial"]', 'nwr["office"="company"]', 'nwr["man_made"="works"]'],
  'clinica medica': ['nwr["amenity"="clinic"]', 'nwr["healthcare"="clinic"]', 'nwr["amenity"="doctors"]', 'nwr["healthcare"="doctor"]'],
  'medico': ['nwr["amenity"="doctors"]', 'nwr["healthcare"="doctor"]', 'nwr["amenity"="clinic"]', 'nwr["healthcare"="clinic"]'],
  'farmacia': ['nwr["amenity"="pharmacy"]', 'nwr["shop"="chemist"]'],
  'academia': ['nwr["leisure"="fitness_centre"]', 'nwr["leisure"="sports_centre"]', 'nwr["sport"="fitness"]'],
  'salao de beleza': ['nwr["shop"="hairdresser"]', 'nwr["shop"="beauty"]', 'nwr["shop"="cosmetics"]'],
  'barbearia': ['nwr["shop"="hairdresser"]', 'nwr["shop"="barber"]'],
  'estetica': ['nwr["shop"="beauty"]', 'nwr["shop"="massage"]', 'nwr["shop"="cosmetics"]', 'nwr["leisure"="spa"]'],
  'pet shop': ['nwr["shop"="pet"]', 'nwr["shop"="pet_grooming"]'],
  'veterinario': ['nwr["amenity"="veterinary"]', 'nwr["healthcare"="veterinary"]'],
  'imobiliaria': ['nwr["office"="estate_agent"]'],
  'oficina mecanica': ['nwr["shop"="car_repair"]', 'nwr["shop"="tyres"]', 'nwr["shop"="car_parts"]'],
  'loja de roupas': ['nwr["shop"="clothes"]', 'nwr["shop"="boutique"]', 'nwr["shop"="fashion"]', 'nwr["shop"="fashion_accessories"]'],
  'supermercado': ['nwr["shop"="supermarket"]', 'nwr["shop"="convenience"]', 'nwr["shop"="grocery"]', 'nwr["shop"="greengrocer"]'],
  'padaria': ['nwr["shop"="bakery"]', 'nwr["shop"="pastry"]'],
  'hotel': ['nwr["tourism"="hotel"]', 'nwr["tourism"="motel"]', 'nwr["tourism"="guest_house"]', 'nwr["tourism"="hostel"]', 'nwr["tourism"="apartment"]'],
  'escola': ['nwr["amenity"="school"]', 'nwr["amenity"="kindergarten"]', 'nwr["amenity"="language_school"]', 'nwr["amenity"="music_school"]', 'nwr["amenity"="driving_school"]', 'nwr["amenity"="college"]'],
  'cafeteria': ['nwr["amenity"="cafe"]', 'nwr["shop"="coffee"]'],
  'lanchonete': ['nwr["amenity"="fast_food"]'],
  'bar': ['nwr["amenity"="bar"]', 'nwr["amenity"="pub"]', 'nwr["amenity"="biergarten"]'],
  'seguros': ['nwr["office"="insurance"]'],
};
const OVERPASS_EPS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
async function overpassFetch(ql, startIdx, abortMs) {
  let ultimoErro = 'sem resposta';
  let vazioOk = null;
  const base = Number.isInteger(startIdx) ? startIdx : 0;
  const espera = abortMs || 25000;
  const eps = OVERPASS_EPS.map((_, i) => OVERPASS_EPS[(base + i) % OVERPASS_EPS.length]);
  for (const ep of eps) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), espera);
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': OSM_UA },
        body: 'data=' + encodeURIComponent(ql),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      if (!r.ok) { ultimoErro = ep + ' HTTP ' + r.status; continue; }
      const txt = await r.text();
      if (txt[0] !== '{') { ultimoErro = ep + ' resposta não-JSON'; continue; }
      const data = JSON.parse(txt);
      if (data.elements && data.elements.length) return data;
      if (data.remark && /timed out|error|runtime/i.test(data.remark)) { ultimoErro = ep + ' remark'; continue; }
      vazioOk = data; ultimoErro = ep + ' vazio';
    } catch (e) { ultimoErro = ep + ' ' + (e.name === 'AbortError' ? 'timeout' : e.message); }
  }
  if (vazioOk) return vazioOk;
  throw new Error('Overpass indisponível (' + ultimoErro + ')');
}
const _prospCache = new Map();
function prospCacheGet(k, ttlMs) { const e = _prospCache.get(k); if (e && (Date.now() - e.t) < ttlMs) return e.v; return null; }
function prospCacheSet(k, v) { _prospCache.set(k, { t: Date.now(), v }); if (_prospCache.size > 300) { const f = _prospCache.keys().next().value; _prospCache.delete(f); } }
function normSeg(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
function limparTermo(s) { return String(s || '').replace(/[^\w\sáéíóúâêôãõç-]/gi, '').trim().slice(0, 40); }

async function geocodeCidade(cidade, estado) {
  const query = [cidade, estado, 'Brasil'].filter(Boolean).join(', ');
  const ck = 'geo:' + query.toLowerCase();
  const cached = prospCacheGet(ck, 24 * 60 * 60 * 1000);
  if (cached) return cached;
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(query);
  const r = await fetch(url, { headers: { 'User-Agent': OSM_UA, 'Accept-Language': 'pt-BR' } });
  if (!r.ok) throw new Error('Nominatim HTTP ' + r.status);
  const arr = await r.json();
  if (!arr || !arr.length) return null;
  const out = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), nome: arr[0].display_name };
  prospCacheSet(ck, out);
  return out;
}

const CAT_PT = {
  lawyer: 'Advocacia', accountant: 'Contabilidade', architect: 'Arquitetura', estate_agent: 'Imobiliária',
  insurance: 'Seguros', company: 'Empresa', dentist: 'Odontologia', clinic: 'Clínica', doctors: 'Consultório médico',
  pharmacy: 'Farmácia', veterinary: 'Veterinário', hospital: 'Hospital', restaurant: 'Restaurante', cafe: 'Cafeteria',
  bar: 'Bar', pub: 'Bar', fast_food: 'Lanchonete', bakery: 'Padaria', supermarket: 'Supermercado', clothes: 'Loja de roupas',
  hairdresser: 'Salão / Barbearia', beauty: 'Estética', massage: 'Estética', pet: 'Pet shop', car_repair: 'Oficina mecânica',
  fitness_centre: 'Academia', hotel: 'Hotel', school: 'Escola', bank: 'Banco', fuel: 'Posto de combustível',
  convenience: 'Conveniência', shoes: 'Calçados', furniture: 'Móveis', jewelry: 'Joalheria', optician: 'Ótica',
  electronics: 'Eletrônicos', hardware: 'Materiais de construção', florist: 'Floricultura', butcher: 'Açougue',
};
function traduzCat(v) { return CAT_PT[v] || (v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : ''); }

function montarOverpass(seg, lat, lon, raioM) {
  const chave = normSeg(seg);
  let filtros;
  if (chave === 'todos' || chave === 'todos os segmentos' || chave === '') {
    filtros = [
      'node["amenity"="restaurant"]["name"]', 'node["amenity"="pharmacy"]["name"]',
      'node["amenity"="dentist"]["name"]', 'node["office"="lawyer"]["name"]', 'node["shop"="clothes"]["name"]',
    ];
  } else {
    filtros = SEG_OSM[chave];
    if (!filtros) {
      const t = limparTermo(seg);
      filtros = t ? ['nwr["name"~"' + t + '",i][~"^(shop|office|amenity|craft|healthcare|tourism|leisure)$"~"."]'] : [];
    }
  }
  if (!filtros.length) return null;
  const corpo = filtros.map((f) => f + '(around:' + raioM + ',' + lat + ',' + lon + ');').join('\n  ');
  return '[out:json][timeout:90];\n(\n  ' + corpo + '\n);\nout center tags;';
}

function nomePareceGoverno(nome) {
  const n = String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /\b(ubs|upa|caps|posto de saude|unidade basica|unidade de saude|centro de saude|prefeitura|secretaria|ministerio|camara municipal|hospital municipal|hospital estadual|hospital publico|pronto socorro|pronto-socorro|inss|receita federal|detran|cras|forum|tribunal|delegacia|batalhao|corpo de bombeiros)\b/.test(n);
}
function ehGovernoOuPublico(t) {
  if (!t) return false;
  if (t.government || t.office === 'government') return true;
  if (t['operator:type'] === 'government' || t['operator:type'] === 'public') return true;
  if (['townhall', 'public_building', 'community_centre', 'social_facility', 'courthouse', 'police', 'fire_station', 'prison'].indexOf(t.amenity) >= 0) return true;
  if (t.healthcare === 'centre') return true;
  return nomePareceGoverno(t.name);
}

function normalizaEmpresa(el) {
  const t = el.tags || {};
  const nome = t.name || t['brand'] || '';
  if (!nome) return null;
  if (ehGovernoOuPublico(t)) return null;
  const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
  const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
  const tel = t.phone || t['contact:phone'] || t['contact:mobile'] || '';
  const site = t.website || t['contact:website'] || t.url || t['contact:url'] || '';
  const inst = (t['contact:instagram'] || t.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  const face = (t['contact:facebook'] || t.facebook || '');
  const wpp = (t['contact:whatsapp'] || t.whatsapp || '');
  const horario = t.opening_hours || '';
  const rua = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ');
  const bairro = t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:district'] || '';
  const cidade = t['addr:city'] || t['addr:town'] || t['addr:municipality'] || '';
  const cep = t['addr:postcode'] || '';
  const endereco = [rua, bairro].filter(Boolean).join(' - ');
  const catRaw = t.office || t.amenity || t.shop || t.healthcare || t.tourism || t.leisure || t.craft || '';
  return {
    osmId: (el.type || 'node') + '/' + el.id, nome, categoria: traduzCat(catRaw),
    telefone: tel, whatsapp: wpp, site, instagram: inst, facebook: face, horario,
    endereco, bairro, cidade, cep, lat, lon,
  };
}

const TODOS_GRUPOS = [
  ['amenity', 'restaurant|fast_food|cafe|bar|pub|pharmacy|dentist|clinic|doctors|veterinary|fuel|bank|school|kindergarten|language_school|driving_school|college'],
  ['office', 'lawyer|accountant|estate_agent|insurance|company|architect|tax_advisor'],
  ['shop', 'clothes|boutique|fashion|hairdresser|barber|beauty|cosmetics|supermarket|convenience|grocery|greengrocer|bakery|pastry|car_repair|tyres|car_parts|pet|pet_grooming|mobile_phone|furniture|hardware|optician|jewelry|shoes|electronics|florist|butcher|chemist|coffee'],
  ['leisure', 'fitness_centre|sports_centre|spa'],
  ['tourism', 'hotel|motel|guest_house|hostel|apartment'],
  ['healthcare', 'clinic|dentist|doctor|veterinary'],
];
async function buscarTodosParalelo(lat, lon, raioM) {
  const clauses = TODOS_GRUPOS.map((grp) => 'node["' + grp[0] + '"~"^(' + grp[1] + ')$"]["name"](around:' + raioM + ',' + lat + ',' + lon + ');').join('\n  ');
  const ql = '[out:json][timeout:60];\n(\n  ' + clauses + '\n);\nout center tags;';
  const data = await overpassFetch(ql, 0, 25000);
  const vistos = {}, out = [];
  (data.elements || []).map(normalizaEmpresa).filter(Boolean).forEach((e) => { if (!vistos[e.osmId]) { vistos[e.osmId] = 1; out.push(e); } });
  return out;
}

app.get('/api/prospeccao/cidades', exigeAuth, async (req, res) => {
  const ck = 'ibge:cidades';
  const cached = prospCacheGet(ck, 7 * 24 * 60 * 60 * 1000);
  if (cached) return res.json(cached);
  try {
    const r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome', { headers: { 'User-Agent': OSM_UA } });
    if (!r.ok) throw new Error('IBGE HTTP ' + r.status);
    const arr = await r.json();
    const out = arr.map((m) => {
      let uf = '';
      try { uf = m.microrregiao.mesorregiao.UF.sigla; }
      catch (e) { try { uf = m['regiao-imediata']['regiao-intermediaria'].UF.sigla; } catch (_e) {} }
      return [m.nome, uf];
    }).filter((x) => x[0]);
    prospCacheSet(ck, out);
    res.json(out);
  } catch (e) {
    console.error('[cidades] erro:', e.message);
    res.status(502).json({ error: 'Não consegui carregar as cidades.' });
  }
});

async function buscarNaCidade(centro, seg, raioM, ehTodos) {
  const ck = 'ovp:' + normSeg(seg) + ':' + centro.lat.toFixed(3) + ':' + centro.lon.toFixed(3) + ':' + raioM;
  let empresas = prospCacheGet(ck, 30 * 60 * 1000);
  if (empresas) return empresas;
  if (ehTodos) {
    empresas = await buscarTodosParalelo(centro.lat, centro.lon, raioM);
  } else {
    const ql = montarOverpass(seg, centro.lat, centro.lon, raioM);
    if (!ql) throw new Error('Segmento inválido.');
    const data = await overpassFetch(ql);
    empresas = (data.elements || []).map(normalizaEmpresa).filter(Boolean);
  }
  const v = {};
  empresas = empresas.filter((e) => { if (v[e.osmId]) return false; v[e.osmId] = 1; return true; });
  prospCacheSet(ck, empresas);
  return empresas;
}

app.post('/api/prospeccao/buscar', exigeAuth, rateLimit({ windowMs: 5 * 60 * 1000, max: 40, chave: 'prosp' }), async (req, res) => {
  try {
    const b = req.body || {};
    const seg = String(b.segmento || '').trim();
    let raioKm = parseFloat(b.raio) || 10;
    if (raioKm < 1) raioKm = 1; if (raioKm > 100) raioKm = 100;
    const ehTodos = ['todos', 'todos os segmentos', ''].indexOf(normSeg(seg)) >= 0;
    let raioM = Math.round(raioKm * 1000);
    if (ehTodos) raioM = Math.min(raioM, 12000);

    let cidades = [];
    if (Array.isArray(b.cidades) && b.cidades.length) {
      cidades = b.cidades.map((c) => (Array.isArray(c) ? { nome: String(c[0] || ''), uf: String(c[1] || '') } : { nome: String(c.nome || ''), uf: String(c.uf || '') }));
    } else if (b.cidade) {
      cidades = [{ nome: String(b.cidade), uf: String(b.estado || '') }];
    }
    cidades = cidades.filter((c) => c.nome.trim()).slice(0, 4);
    if (!cidades.length) return res.status(400).json({ error: 'Informe ao menos uma cidade.' });

    const geos = await Promise.all(cidades.map((c) => geocodeCidade(c.nome, c.uf).catch(() => null)));
    const centros = geos.map((gc, i) => (gc ? { nome: cidades[i].nome, uf: cidades[i].uf, lat: gc.lat, lon: gc.lon } : null)).filter(Boolean);
    if (!centros.length) return res.status(404).json({ error: 'Não encontrei essa(s) cidade(s). Confira o nome e o UF.' });

    const parts = await Promise.allSettled(centros.map((centro) => buscarNaCidade(centro, seg, raioM, ehTodos)));
    const vistos = {}, todas = [];
    let ok = 0;
    parts.forEach((p) => {
      if (p.status === 'fulfilled') { ok++; p.value.forEach((e) => { if (!vistos[e.osmId]) { vistos[e.osmId] = 1; todas.push(e); } }); }
    });
    if (!ok) return res.status(502).json({ error: 'Não consegui buscar agora (OpenStreetMap indisponível). Tente de novo em instantes.' });

    const c0 = centros[0];
    res.json({ centro: { lat: c0.lat, lon: c0.lon }, cidades: centros.map((c) => c.nome + (c.uf ? '/' + c.uf : '')), total: todas.length, empresas: todas });
  } catch (e) {
    console.error('[prospeccao] erro:', e.message);
    res.status(502).json({ error: 'Não consegui buscar agora (OpenStreetMap indisponível). Tente de novo em instantes.' });
  }
});

/* ==================================================================
   OS DADOS — roteador genérico das tabelas (id TEXT + data JSONB).
   TODOS passam por exigeAuth.
================================================================== */
app.get('/api/:tabela', exigeAuth, async (req, res) => {
  const t = req.params.tabela;
  if (!tabelaValida(t)) return res.status(404).json({ error: 'Tabela não encontrada.' });
  try {
    if (t === 'logs' && (!req.usuario || req.usuario.papel !== 'admin')) {
      const r = await q("SELECT data FROM logs WHERE (data->>'tipo') IS DISTINCT FROM 'login' ORDER BY criado_em");
      return res.json(r.rows.map((x) => x.data));
    }
    const r = await q('SELECT data FROM ' + t + ' ORDER BY criado_em');
    res.json(r.rows.map((x) => x.data));
  } catch (e) {
    console.error('[api] erro ao ler', t + ':', e.message);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
});

app.post('/api/:tabela', exigeAuth, async (req, res) => {
  const t = req.params.tabela;
  if (!tabelaValida(t)) return res.status(404).json({ error: 'Tabela não encontrada.' });
  const itens = Array.isArray(req.body) ? req.body : [req.body];
  if (!itens.length) return res.json({ ok: true, gravados: 0 });

  if (t === 'logs') {
    const nome = (req.usuario && req.usuario.nome) || '';
    const ip = ipDe(req);
    for (const item of itens) if (item && typeof item === 'object') { item.user = nome; item.ip = ip; }
  }

  const cliente = await pool.connect();
  try {
    const onConflict = t === 'logs' ? 'ON CONFLICT (id) DO NOTHING' : 'ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data';
    await cliente.query('BEGIN');
    for (const item of itens) {
      if (!item || !item.id) throw new Error('Item sem id.');
      await cliente.query('INSERT INTO ' + t + ' (id, data) VALUES ($1, $2::jsonb) ' + onConflict, [String(item.id), JSON.stringify(item)]);
    }
    await cliente.query('COMMIT');
    res.json({ ok: true, gravados: itens.length });
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('[api] erro ao gravar', t + ':', e.message);
    res.status(500).json({ error: 'Erro ao salvar.' });
  } finally {
    cliente.release();
  }
});

app.delete('/api/:tabela/:id', exigeAuth, async (req, res) => {
  const t = req.params.tabela;
  if (!tabelaValida(t)) return res.status(404).json({ error: 'Tabela não encontrada.' });
  if (t === 'logs' && (!req.usuario || req.usuario.papel !== 'admin')) {
    return res.status(403).json({ error: 'Apenas administradores podem apagar registros de auditoria.' });
  }
  try {
    await q('DELETE FROM ' + t + ' WHERE id = $1', [String(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api] erro ao apagar de', t + ':', e.message);
    res.status(500).json({ error: 'Erro ao excluir.' });
  }
});

/* ==================================================================
   CONTRATO DO CLIENTE — tela pública de assinatura (sem login).
   MERGE, nunca REPLACE: só os 12 campos do formulário, autentiqueId (se
   ainda vazio) e history (só acrescenta) entram. Status "Assinado" só vem
   do webhook da Autentique — o cliente nunca consegue setar isso.
================================================================== */
const CAMPOS_CLIENTE = ['razao', 'fantasia', 'cnpj', 'email', 'rua', 'comp', 'bairro', 'cidade', 'cep', 'resp', 'cpf', 'wpp'];
const STATUS_CLIENTE_OK = ['Aguardando assinatura'];
function limparTexto(v, max) { if (v === undefined || v === null) return ''; return String(v).slice(0, max || 200).trim(); }

app.get('/api/contrato-link/:token', rateLimit({ windowMs: 60 * 1000, max: 30, chave: 'ctlink' }), async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(400).json({ error: 'Link inválido.' });
    const r = await q('SELECT data FROM contratos WHERE client_link = $1 LIMIT 1', [token]);
    if (!r.rows.length) return res.status(404).json({ error: 'Contrato não encontrado para este link.' });
    const data = r.rows[0].data || {};
    ['internalNotes', 'history', 'lossReason', 'lossReasonObs', 'responsavel', 'origem', 'competencia'].forEach((k) => { delete data[k]; });
    // O cliente não tem login, então não pode chamar /api/servicos (exigeAuth).
    // O catálogo vai embutido aqui só para resolver nomes de combos no contrato.
    const svc = await q('SELECT data FROM servicos ORDER BY criado_em');
    data._servicosCatalogo = svc.rows.map((x) => x.data);
    res.json(data);
  } catch (e) {
    console.error('[contrato-link] erro ao buscar:', e.message);
    res.status(500).json({ error: 'Erro ao carregar o contrato.' });
  }
});

app.post('/api/contrato-link/:token', rateLimit({ windowMs: 60 * 1000, max: 20, chave: 'ctsave' }), async (req, res) => {
  const cliente = await pool.connect();
  try {
    const token = String(req.params.token || '');
    if (!token) return res.status(400).json({ error: 'Link inválido.' });

    await cliente.query('BEGIN');
    const r = await cliente.query('SELECT id, data FROM contratos WHERE client_link = $1 LIMIT 1 FOR UPDATE', [token]);
    if (!r.rows.length) { await cliente.query('ROLLBACK'); return res.status(404).json({ error: 'Contrato não encontrado para este link.' }); }

    const atual = r.rows[0].data || {};
    const env = req.body || {};
    const novo = Object.assign({}, atual);

    if (env.clientData && typeof env.clientData === 'object') {
      const cd = {};
      for (const k of CAMPOS_CLIENTE) if (env.clientData[k] !== undefined) cd[k] = limparTexto(env.clientData[k], 200);
      novo.clientData = Object.assign({}, atual.clientData || {}, cd);
    }
    if (env.autentiqueId && !atual.autentiqueId) novo.autentiqueId = limparTexto(env.autentiqueId, 100);
    if (env.status && STATUS_CLIENTE_OK.includes(env.status) && atual.status !== 'Assinado') novo.status = env.status;
    if (Array.isArray(env.history)) {
      const antigo = Array.isArray(atual.history) ? atual.history : [];
      const chave = (h) => JSON.stringify([h && h.action, h && h.time]);
      const jaTem = new Set(antigo.map(chave));
      const novos = env.history.filter((h) => h && typeof h === 'object' && !jaTem.has(chave(h))).slice(0, 10)
        .map((h) => ({ action: limparTexto(h.action, 200), icon: limparTexto(h.icon, 8), time: limparTexto(h.time, 40) }));
      novo.history = novos.concat(antigo).slice(0, 200);
    }

    novo.id = atual.id;
    novo.clientLink = atual.clientLink;
    novo.signedAt = atual.signedAt;
    if (atual.status === 'Assinado') novo.status = 'Assinado';

    await cliente.query('UPDATE contratos SET data = $1::jsonb WHERE id = $2', [JSON.stringify(novo), r.rows[0].id]);
    await cliente.query('COMMIT');
    res.json(novo);
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('[contrato-link] erro ao salvar:', e.message);
    res.status(500).json({ error: 'Erro ao salvar o contrato.' });
  } finally {
    cliente.release();
  }
});

async function marcarAssinadoNoBanco(documentId, signedAt) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const r = await cliente.query("SELECT id, data FROM contratos WHERE data->>'autentiqueId' = $1 LIMIT 1 FOR UPDATE", [String(documentId)]);
    if (!r.rows.length) { await cliente.query('ROLLBACK'); return null; }
    const atual = r.rows[0].data || {};
    if (atual.status === 'Assinado') { await cliente.query('ROLLBACK'); return null; }
    const novo = Object.assign({}, atual, { status: 'Assinado', signedAt: signedAt || new Date().toISOString() });
    await cliente.query('UPDATE contratos SET data = $1::jsonb WHERE id = $2', [JSON.stringify(novo), r.rows[0].id]);
    await cliente.query('COMMIT');
    return novo;
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('[webhook] Falha ao gravar assinado:', e.message);
    return null;
  } finally {
    cliente.release();
  }
}
async function marcarAssinadoEAvisar(documentId, signedAt) {
  const contrato = await marcarAssinadoNoBanco(documentId, signedAt);
  if (!contrato) return;
  enviarAvisos(contrato, documentId).catch((e) => console.warn('[aviso] Falha ao enviar avisos:', e.message));
}

function brl(v) {
  const n = Number(v) || 0;
  try { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  catch (e) { return 'R$ ' + n.toFixed(2); }
}
async function enviarAvisos(contrato, documentId) {
  const c = contrato || {};
  const nome = c.clientName || (c.clientData && c.clientData.razao) || 'Cliente';
  const valor = brl(c.finalM);
  const resp = c.responsavel || '';
  const quando = c.signedAt || new Date().toLocaleDateString('pt-BR');
  const assunto = '✅ Contrato assinado: ' + nome;
  const linhas = ['Boa notícia! Um contrato acabou de ser assinado.', '', 'Cliente: ' + nome, 'Valor mensal: ' + valor, (resp ? 'Responsável: ' + resp : ''), 'Assinado em: ' + quando, (documentId ? 'Documento (Autentique): ' + documentId : '')].filter(Boolean);
  const corpoTexto = linhas.join('\n');
  await Promise.allSettled([enviarEmail(assunto, corpoTexto), enviarWhatsApp(corpoTexto)]);
}
async function enviarEmail(assunto, corpo) {
  if (!nodemailer) return;
  if (!MAIL_USER || !MAIL_PASS) return;
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: MAIL_USER, pass: MAIL_PASS } });
  const destinatarios = MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean).join(',');
  await transporter.sendMail({ from: 'Morning Sistema Comercial <' + MAIL_USER + '>', to: destinatarios, subject: assunto, text: corpo });
}
async function enviarWhatsApp(mensagem) {
  if (!WHATSAPP_PHONE || !CALLMEBOT_APIKEY) return;
  const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(WHATSAPP_PHONE) + '&text=' + encodeURIComponent(mensagem) + '&apikey=' + encodeURIComponent(CALLMEBOT_APIKEY);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('CallMeBot HTTP ' + resp.status);
}

async function exigeContratoValido(req, res, next) {
  try {
    const token = (req.body && req.body.clientLink) ? String(req.body.clientLink) : '';
    if (!token) return res.status(400).json({ error: 'Link do contrato ausente.' });
    const r = await q('SELECT 1 FROM contratos WHERE client_link = $1 LIMIT 1', [token]);
    if (!r.rows.length) return res.status(403).json({ error: 'Contrato não encontrado para este link.' });
    next();
  } catch (e) {
    console.error('Falha ao validar contrato:', e.message);
    return res.status(502).json({ error: 'Não foi possível validar o contrato.' });
  }
}

/* ==================================================================
   AUTENTIQUE — assinatura digital de contrato.
================================================================== */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_CONTRATO_ID = /^[A-Za-z0-9_-]{1,64}$/;
function isBase64(s) { return typeof s === 'string' && /^[A-Za-z0-9+/=\r\n]+$/.test(s); }
const assinados = new Map();
const mapaContratos = new Map();

app.post('/autentique/criar-documento', exigeOrigemConhecida, rateLimit({ windowMs: 60 * 1000, max: 5 }), exigeContratoValido, async (req, res) => {
  try {
    const { contratoId, nome, sandbox, signer, pdfBase64 } = req.body || {};
    if (!contratoId || !RE_CONTRATO_ID.test(String(contratoId))) return res.status(400).json({ error: 'contratoId ausente ou inválido.' });
    if (!signer || !signer.email || !RE_EMAIL.test(String(signer.email))) return res.status(400).json({ error: 'E-mail do signatário inválido.' });
    if (!pdfBase64 || !isBase64(pdfBase64)) return res.status(400).json({ error: 'pdfBase64 ausente ou inválido.' });
    if (pdfBase64.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Arquivo muito grande.' });

    const nomeDoc = String(nome || 'Contrato').slice(0, 200);
    const signerName = String(signer.name || 'Signatário').slice(0, 200);

    const query = `mutation CriarDocumento($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!, $sandbox: Boolean) {
      createDocument(sandbox: $sandbox, document: $document, signers: $signers, file: $file) { id name signatures { public_id name email link { short_link } } }
    }`;
    const variables = { sandbox: !!sandbox, document: { name: nomeDoc }, signers: [{ name: signerName, email: String(signer.email), action: 'SIGN' }], file: null };
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const form = new FormData();
    form.append('operations', JSON.stringify({ query, variables }));
    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    form.append('0', new Blob([pdfBuffer], { type: 'application/pdf' }), 'contrato.pdf');

    const apiResp = await fetch(AUTENTIQUE_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + AUTENTIQUE_TOKEN }, body: form });
    const json = await apiResp.json();
    if (json.errors) { console.error('Erro Autentique (criar):', JSON.stringify(json.errors)); return res.status(502).json({ error: 'Não foi possível criar o documento.' }); }

    const doc = json.data && json.data.createDocument;
    const sigs = (doc && doc.signatures) || [];
    const emailCliente = String(signer.email).toLowerCase();
    const sigCliente = sigs.find((s) => (s.email || '').toLowerCase() === emailCliente) || sigs[0];
    const signUrl = sigCliente && sigCliente.link && sigCliente.link.short_link ? sigCliente.link.short_link : null;

    if (doc && doc.id) {
      const extras = sigs.filter((s) => s.public_id && (s.email || '').toLowerCase() !== emailCliente);
      for (const ex of extras) {
        try { await removerSignatario(doc.id, ex.public_id); }
        catch (e) { console.warn('[criar] Falha ao remover signatário extra (' + ex.email + '):', e.message); }
      }
    }
    if (contratoId && doc && doc.id) mapaContratos.set(String(contratoId), doc.id);
    return res.json({ documentId: doc ? doc.id : null, signUrl });
  } catch (err) {
    console.error('Falha criar-documento:', err);
    return res.status(500).json({ error: 'Falha interna.' });
  }
});

async function statusDocumento(id) {
  if (assinados.has(id)) return assinados.get(id);
  const query = `query($id: UUID!){ document(id:$id){ id name signatures{ email signed{ created_at } } } }`;
  const apiResp = await fetch(AUTENTIQUE_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id } }) });
  const json = await apiResp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const doc = json.data && json.data.document;
  const sigs = (doc && doc.signatures) || [];
  const relevantes = sigs.filter((s) => (s.email || '').toLowerCase() !== CRIADOR_EMAIL);
  const base = relevantes.length ? relevantes : sigs;
  const allSigned = base.length > 0 && base.every((s) => s.signed && s.signed.created_at);
  const firstSigned = base.find((s) => s.signed && s.signed.created_at);
  const signedAt = firstSigned ? firstSigned.signed.created_at : null;
  if (allSigned) assinados.set(id, { signed: true, signedAt });
  return { signed: allSigned, signedAt };
}
async function removerSignatario(documentId, publicId) {
  const query = `mutation($pid: UUID!, $did: UUID!){ deleteSigner(public_id: $pid, document_id: $did) }`;
  const apiResp = await fetch(AUTENTIQUE_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { pid: publicId, did: documentId } }) });
  const json = await apiResp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data && json.data.deleteSigner;
}

app.post('/autentique/webhook', async (req, res) => {
  try {
    if (WEBHOOK_SECRET && !segredoIgual(req.query.key, WEBHOOK_SECRET)) return res.status(401).send('unauthorized');
    const evento = req.body || {};
    const documentId = (evento.document && evento.document.id) || (evento.data && evento.data.document && evento.data.document.id) || evento.document_id || null;
    res.status(200).send('ok');
    if (documentId) {
      try {
        const st = await statusDocumento(documentId);
        if (st.signed) await marcarAssinadoEAvisar(documentId, st.signedAt);
      } catch (e) { console.warn('Não foi possível confirmar o documento do webhook:', documentId, String(e)); }
    }
  } catch (err) {
    console.error('Erro no webhook:', err);
    if (!res.headersSent) return res.status(500).send('erro');
  }
});

app.get('/autentique/status/:id', exigeAuth, exigeOrigemConhecida, rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const st = await statusDocumento(req.params.id);
    if (st && st.signed) marcarAssinadoEAvisar(req.params.id, st.signedAt).catch(() => {});
    return res.json(st);
  } catch (err) {
    console.error('Erro status:', String(err));
    return res.status(502).json({ signed: false, error: 'Não foi possível consultar o status.' });
  }
});

async function baixarPdfAssinado(req, res) {
  try {
    const id = req.params.id;
    const query = `query($id: UUID!){ document(id:$id){ id name files{ signed } } }`;
    const apiResp = await fetch(AUTENTIQUE_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id } }) });
    const json = await apiResp.json();
    if (json.errors) { console.error('[pdf] Erro Autentique:', JSON.stringify(json.errors)); return res.status(502).json({ error: 'Não foi possível obter o PDF.' }); }
    const doc = json.data && json.data.document;
    const url = doc && doc.files && doc.files.signed;
    if (!url) return res.status(404).json({ error: 'PDF assinado ainda não disponível.' });
    const pdfResp = await fetch(url);
    if (!pdfResp.ok) { console.error('[pdf] Falha ao baixar PDF:', pdfResp.status); return res.status(502).json({ error: 'Não foi possível baixar o PDF.' }); }
    const buf = Buffer.from(await pdfResp.arrayBuffer());
    const nomeArq = 'Contrato_assinado_' + String((doc && doc.name) || id).replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + nomeArq + '"');
    return res.send(buf);
  } catch (err) {
    console.error('Erro pdf-assinado:', String(err));
    return res.status(502).json({ error: 'Não foi possível obter o PDF assinado.' });
  }
}
app.get('/autentique/arquivo/:id', exigeAuth, exigeOrigemConhecida, rateLimit({ windowMs: 60 * 1000, max: 60 }), baixarPdfAssinado);
app.get('/autentique/pdf-assinado/:id', exigeAuth, exigeOrigemConhecida, rateLimit({ windowMs: 60 * 1000, max: 60 }), baixarPdfAssinado);

app.get('/autentique/status-contrato/:contratoId', exigeAuth, exigeOrigemConhecida, rateLimit({ windowMs: 60 * 1000, max: 60 }), async (req, res) => {
  try {
    const docId = mapaContratos.get(String(req.params.contratoId));
    if (!docId) return res.json({ signed: false, known: false });
    const st = await statusDocumento(docId);
    return res.json({ ...st, known: true });
  } catch (err) {
    console.error('Erro status-contrato:', String(err));
    return res.status(502).json({ signed: false, error: 'Não foi possível consultar o status.' });
  }
});

app.get('/autentique/documento/:id', exigeApiSecret, async (req, res) => {
  try {
    const query = `query($id: UUID!){ document(id:$id){ id name signatures{ email signed{ created_at } } } }`;
    const apiResp = await fetch(AUTENTIQUE_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id: req.params.id } }) });
    return res.json(await apiResp.json());
  } catch (err) {
    console.error('Erro documento:', err);
    return res.status(500).json({ error: 'Falha interna.' });
  }
});

/* ==================================================================
   META (FACEBOOK / INSTAGRAM) LEAD ADS — webhook de leads. Opcional:
   sem META_VERIFY_TOKEN/META_PAGE_TOKEN no .env, fica inerte.
================================================================== */
app.get('/meta/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === META_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});
function metaCampo(fields, nomes) {
  for (const f of (fields || [])) if (nomes.includes(String(f.name || '').toLowerCase())) return Array.isArray(f.values) ? (f.values[0] || '') : (f.value || '');
  return '';
}
async function processarLeadMeta(leadgenId) {
  if (!META_PAGE_TOKEN) return;
  try {
    const url = META_GRAPH + '/' + encodeURIComponent(leadgenId) + '?access_token=' + encodeURIComponent(META_PAGE_TOKEN);
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) { console.error('[meta] erro ao buscar lead:', JSON.stringify(d.error)); return; }
    const fields = d.field_data || [];
    const lead = {
      id: 'meta_' + leadgenId,
      name: metaCampo(fields, ['full_name', 'nome', 'name', 'first_name']) || 'Lead Meta',
      empresa: metaCampo(fields, ['company_name', 'empresa']),
      wpp: metaCampo(fields, ['phone_number', 'telefone', 'phone', 'whatsapp_number']),
      email: metaCampo(fields, ['email', 'e-mail']),
      valor: 0, temp: 'Morna', origem: 'Meta Ads', stage: 'leads',
      obs: 'Lead recebido automaticamente da Meta (Facebook/Instagram).',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await q('INSERT INTO leads (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', [lead.id, JSON.stringify(lead)]);
  } catch (e) {
    console.error('[meta] falha ao processar lead:', e.message);
  }
}
// Confere a assinatura HMAC-SHA256 que a Meta manda no header
// 'x-hub-signature-256: sha256=<hex>', calculada sobre o CORPO BRUTO da
// requisição (por isso o req.rawBody capturado no express.json acima).
// Sem isso, qualquer um poderia forjar um POST e criar leads falsos.
function assinaturaMetaValida(req) {
  if (!META_APP_SECRET) return false; // sem segredo configurado: nunca confia
  const header = req.get('x-hub-signature-256') || '';
  const recebida = header.startsWith('sha256=') ? header.slice(7) : '';
  if (!recebida || !req.rawBody) return false;
  const esperada = crypto.createHmac('sha256', META_APP_SECRET).update(req.rawBody).digest('hex');
  return segredoIgual(recebida, esperada);
}

app.post('/meta/webhook', (req, res) => {
  res.sendStatus(200); // sempre 200 rápido, senão a Meta fica reenviando
  try {
    if (!META_APP_SECRET) {
      // Recurso ainda não configurado (META_PAGE_TOKEN também costuma estar
      // vazio nesse caso, então processarLeadMeta já não grava nada) — mas
      // não seguimos processando um payload não-verificável de propósito.
      return;
    }
    if (!assinaturaMetaValida(req)) {
      console.warn('[meta] webhook rejeitado: assinatura x-hub-signature-256 ausente ou inválida.');
      return;
    }
    const body = req.body || {};
    if (body.object !== 'page') return;
    (body.entry || []).forEach((entry) => {
      (entry.changes || []).forEach((change) => {
        if (change.field === 'leadgen' && change.value && change.value.leadgen_id) processarLeadMeta(change.value.leadgen_id);
      });
    });
  } catch (e) { console.error('[meta] erro no webhook:', e.message); }
});

/* ------------------------------------------------------------------
   Rede de segurança: erro não tratado nas rotas cai aqui.
------------------------------------------------------------------ */
app.use((err, req, res, next) => {
  console.error('[erro]', err && err.message);
  if (res.headersSent) return next(err);
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Arquivo muito grande (máximo 10 MB).' });
  res.status(500).json({ error: 'Erro interno.' });
});

/* ==================================================================
   AUTO-CRIAÇÃO DE TABELAS NO BOOT — nada de migration manual.
================================================================== */
const DEFS_TABELAS = {
  contratos: {
    extras: ["status      TEXT GENERATED ALWAYS AS (data->>'status')     STORED", "client_link TEXT GENERATED ALWAYS AS (data->>'clientLink') STORED"],
    indices: ["CREATE UNIQUE INDEX IF NOT EXISTS contratos_client_link_key ON contratos (client_link)", "CREATE INDEX IF NOT EXISTS contratos_status_idx ON contratos (status)"],
  },
  handoffs: {
    extras: ["status  TEXT GENERATED ALWAYS AS (data->>'status')     STORED", "cliente TEXT GENERATED ALWAYS AS (data->>'clientName') STORED"],
    indices: ["CREATE INDEX IF NOT EXISTS handoffs_status_idx  ON handoffs (status)", "CREATE INDEX IF NOT EXISTS handoffs_cliente_idx ON handoffs (cliente)", "CREATE INDEX IF NOT EXISTS handoffs_criado_idx  ON handoffs (criado_em DESC)"],
  },
};

async function garantirTabelas() {
  try {
    await q('CREATE OR REPLACE FUNCTION rl_touch_atualizado_em()\nRETURNS TRIGGER AS $func$\nBEGIN\n  NEW.atualizado_em := now();\n  RETURN NEW;\nEND;\n$func$ LANGUAGE plpgsql;');
  } catch (e) { console.warn('[banco] rl_touch_atualizado_em não recriada:', e.message); }

  let criadas = 0;
  for (const nome of TABELAS) {
    const reg = await q('SELECT to_regclass($1) AS oid', ['public.' + nome]);
    if (reg.rows[0] && reg.rows[0].oid) continue;

    const def = DEFS_TABELAS[nome] || {};
    const extras = (def.extras || []).map((c) => '  ' + c + ',').join('\n');
    const colsExtras = extras ? ('\n' + extras) : '';
    await q('CREATE TABLE ' + nome + ' (\n  id            TEXT PRIMARY KEY,\n  data          JSONB NOT NULL,' + colsExtras + '\n  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),\n  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()\n);');
    for (const idx of (def.indices || [])) await q(idx);
    await q('DROP TRIGGER IF EXISTS trg_' + nome + '_touch ON ' + nome + ';');
    await q('CREATE TRIGGER trg_' + nome + '_touch BEFORE UPDATE ON ' + nome + ' FOR EACH ROW EXECUTE FUNCTION rl_touch_atualizado_em();');
    criadas++;
    console.log('[banco] tabela criada:', nome);
  }
  console.log('[banco] verificação concluída (' + criadas + ' criada(s), ' + (TABELAS.length - criadas) + ' já existia(m)).');
}

// Usuário de dev inicial (só roda se a tabela `usuarios` estiver vazia).
// SEGURANÇA: a senha NUNCA é um valor fixo no código (isso seria um default
// previsível igual a "admin/admin"). Por padrão geramos uma senha aleatória
// e a mostramos SÓ UMA VEZ no log — troque pela tela de Usuários depois de
// anotar. Se quiser escolher a senha inicial, defina ADMIN_SEED_PASSWORD no
// .env (mínimo 6 caracteres); nunca comite esse valor.
function gerarSenhaAleatoria() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

async function garantirUsuarios() {
  await q('CREATE TABLE IF NOT EXISTS usuarios (\n  id            TEXT PRIMARY KEY,\n  usuario       TEXT UNIQUE NOT NULL,\n  nome          TEXT NOT NULL,\n  senha_hash    TEXT NOT NULL,\n  papel         TEXT NOT NULL DEFAULT \'usuario\',\n  ativo         BOOLEAN NOT NULL DEFAULT true,\n  ultimo_login  TIMESTAMPTZ,\n  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()\n);');

  const jaTem = await q('SELECT count(*)::int AS n FROM usuarios');
  if (jaTem.rows[0].n > 0) { console.log('[banco] usuarios: ' + jaTem.rows[0].n + ' já existem, seed não roda.'); return; }

  const senhaEscolhida = process.env.ADMIN_SEED_PASSWORD && process.env.ADMIN_SEED_PASSWORD.length >= 6
    ? process.env.ADMIN_SEED_PASSWORD
    : gerarSenhaAleatoria();
  const USUARIO_DEV = { usuario: 'admin', nome: 'Admin', senha: senhaEscolhida, papel: 'admin' };

  const id = 'u' + Date.now() + crypto.randomBytes(3).toString('hex');
  const hash = await bcrypt.hash(USUARIO_DEV.senha, 12);
  await q('INSERT INTO usuarios (id, usuario, nome, senha_hash, papel) VALUES ($1,$2,$3,$4,$5)', [id, USUARIO_DEV.usuario, USUARIO_DEV.nome, hash, USUARIO_DEV.papel]);
  console.log('');
  console.log('======================================================');
  console.log('  USUÁRIO ADMIN CRIADO — ANOTE AGORA, NÃO APARECE DE NOVO');
  console.log('  usuário: ' + USUARIO_DEV.usuario);
  console.log('  senha:   ' + USUARIO_DEV.senha);
  console.log('  (recomendado: troque pela tela de Usuários depois do 1º login)');
  console.log('======================================================');
  console.log('');
}

Promise.resolve()
  .then(() => garantirTabelas().catch((e) => console.error('[banco] garantirTabelas:', e && e.message)))
  .then(() => garantirUsuarios().catch((e) => console.error('[banco] garantirUsuarios:', e && e.message)))
  .finally(() => {
    app.listen(PORT, () => console.log('Sistema Comercial — backend rodando em http://localhost:' + PORT));
  });
