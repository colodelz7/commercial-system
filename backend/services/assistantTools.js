// Ferramentas que o MorningBot pode executar de verdade dentro do sistema
// (consultar dados e criar orçamentos), via function calling do Gemini.
// Usa o mesmo pool de conexão do back.js (./lib/db) — sem HTTP interno.
const crypto = require('crypto');
const { q } = require('../lib/db');

const ORIGENS_VALIDAS = ['Indicação', 'Instagram', 'Google', 'WhatsApp', 'Prospecção ativa', 'Cliente antigo', 'Tráfego pago', 'Evento', 'Outro'];

function ymAtual() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function normalizarTexto(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function resumoComercial(args) {
  const ym = (args && /^\d{4}-\d{2}$/.test(args.mes)) ? args.mes : ymAtual();
  const [ano, mes] = ym.split('-').map(Number);

  const [orcs, cts, spts, relRows] = await Promise.all([
    q('SELECT data FROM orcamentos'),
    q('SELECT data FROM contratos'),
    q('SELECT data FROM spots'),
    q("SELECT data FROM relatorios WHERE id LIKE $1 OR id = $2", [`${ym}-%`, `meta-${ym}`]),
  ]);

  const noMes = (item) => {
    const raw = item.competencia || item.createdAt || '';
    if (item.competencia) return item.competencia.slice(0, 7) === ym;
    // createdAt vem como "DD/MM/AAAA, HH:mm:ss" (contratos/spots) ou "DD/MM/AAAA" (diagnósticos)
    const dp = String(raw).split(',')[0].trim().split('/');
    if (dp.length !== 3) return false;
    return `${dp[2]}-${dp[1]}` === ym;
  };

  const orcamentos = orcs.rows.map((r) => r.data).filter(noMes);
  const contratos = cts.rows.map((r) => r.data).filter(noMes);
  const spots = spts.rows.map((r) => r.data).filter(noMes);

  const contarPorStatus = (lista) => lista.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  let receitaMensal = 0, receitaPontual = 0, receitaSpot = 0;
  contratos.forEach((c) => { if (c.status === 'Assinado') { receitaMensal += parseFloat(c.finalM) || 0; receitaPontual += parseFloat(c.finalP) || 0; } });
  spots.forEach((s) => {
    if (s.status !== 'Aprovado') return;
    const bruto = (s.services || []).reduce((a, sv) => a + (sv.price || 0) * (sv.qtd || 1), 0);
    receitaSpot += bruto * (1 - (s.disc || 0) / 100);
  });

  let metaMes = 0, supermetaMes = 0, vendidoNoMes = 0;
  relRows.rows.forEach((r) => {
    const d = r.data;
    if (!d) return;
    if (d.meta !== undefined) { metaMes = d.meta || 0; supermetaMes = d.supermeta || 0; }
    else if (d.valor) vendidoNoMes += d.valor;
  });

  return {
    mes: ym,
    orcamentos: { total: orcamentos.length, porStatus: contarPorStatus(orcamentos) },
    contratos: { total: contratos.length, porStatus: contarPorStatus(contratos) },
    spots: { total: spots.length, porStatus: contarPorStatus(spots) },
    receita: { mensal: Math.round(receitaMensal), pontual: Math.round(receitaPontual), spot: Math.round(receitaSpot), total: Math.round(receitaMensal + receitaPontual + receitaSpot) },
    metaDoMes: { meta: metaMes, supermeta: supermetaMes, vendidoRegistradoNosRelatorios: Math.round(vendidoNoMes) },
  };
}

async function buscarClientes(args) {
  const termo = normalizarTexto(args && args.busca);
  if (!termo) return { clientes: [], aviso: 'Informe um termo de busca.' };
  const r = await q('SELECT data FROM clientes');
  const encontrados = r.rows
    .map((row) => row.data)
    .filter((c) => {
      const alvo = normalizarTexto([c.name, c.doc, c.email, c.wpp, c.resp, c.cidade].filter(Boolean).join(' '));
      return alvo.includes(termo);
    })
    .slice(0, 8)
    .map((c) => ({ id: c.id, name: c.name, doc: c.doc, wpp: c.wpp, email: c.email, cidade: c.cidade }));
  return { clientes: encontrados };
}

async function carregarCatalogo() {
  const r = await q('SELECT data FROM servicos ORDER BY criado_em');
  return r.rows.map((row) => row.data);
}

async function listarServicos() {
  const catalogo = await carregarCatalogo();
  return {
    servicos: catalogo.map((s) => ({
      id: s.id, nome: s.name, categoria: s.cat,
      preco: s.price, cobranca: s.bill === 'mensal' ? 'mensal' : 'pontual',
    })),
  };
}

function resolverServicos(nomesPedidos, catalogo) {
  const resolvidos = [];
  const naoEncontrados = [];
  for (const nomePedido of nomesPedidos || []) {
    const alvo = normalizarTexto(nomePedido);
    let match = catalogo.find((s) => normalizarTexto(s.name) === alvo);
    if (!match) match = catalogo.find((s) => normalizarTexto(s.name).includes(alvo) || alvo.includes(normalizarTexto(s.name)));
    if (match) resolvidos.push({ id: match.id, cat: match.cat, name: match.name, desc: match.desc || '', price: match.price, bill: match.bill, inc: match.inc || [], qtd: 1 });
    else naoEncontrados.push(nomePedido);
  }
  return { resolvidos, naoEncontrados };
}

async function nextOrcSeq() {
  const r = await q('SELECT data FROM orcamentos');
  const max = r.rows.reduce((m, row) => Math.max(m, parseInt(row.data.seq, 10) || 0), 149);
  return max + 1;
}

async function criarOrcamento(args, contexto) {
  const clientName = String((args && args.clientName) || '').trim();
  if (!clientName) return { erro: 'Informe o nome do cliente para criar o orçamento.' };

  const nomesServicos = Array.isArray(args.servicos) ? args.servicos : [];
  if (!nomesServicos.length) return { erro: 'Informe ao menos um serviço para criar o orçamento.' };

  const catalogo = await carregarCatalogo();
  const { resolvidos, naoEncontrados } = resolverServicos(nomesServicos, catalogo);
  if (!resolvidos.length) return { erro: 'Nenhum dos serviços informados foi encontrado no catálogo.', naoEncontrados, dica: 'Use a ferramenta listar_servicos para ver os nomes exatos.' };

  const origem = ORIGENS_VALIDAS.includes(args.origem) ? args.origem : 'Outro';
  const agora = new Date();
  const id = 'orc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const seq = await nextOrcSeq();

  const orcamento = {
    id, seq, status: 'Rascunho',
    createdAt: agora.toLocaleString('pt-BR'), createdAtRaw: agora.getTime(),
    clientName, clientDoc: String(args.clientDoc || ''), clientWpp: String(args.clientWpp || ''),
    clientEmail: String(args.clientEmail || ''), clientObs: String(args.observacoes || ''),
    origem, responsavel: (contexto && contexto.nome) || '', validity: 15,
    services: resolvidos, disc: 0, discMode: 'pct', discRaw: '0',
    duration: '6', payment: 'Mensal - todo dia 05', finObs: '', notes: '',
    history: [{ action: `Orçamento criado pelo MorningBot (a pedido de ${(contexto && contexto.nome) || 'um usuário'})`, icon: '🤖', time: agora.toLocaleString('pt-BR') }],
  };

  await q('INSERT INTO orcamentos (id, data) VALUES ($1, $2::jsonb)', [id, JSON.stringify(orcamento)]);

  const totalMensal = resolvidos.filter((s) => s.bill === 'mensal').reduce((a, s) => a + s.price, 0);
  const totalPontual = resolvidos.filter((s) => s.bill === 'pontual').reduce((a, s) => a + s.price, 0);

  return {
    ok: true, id, seq, clientName, status: 'Rascunho',
    servicosIncluidos: resolvidos.map((s) => s.name),
    servicosNaoEncontrados: naoEncontrados,
    totalMensal, totalPontual,
    aviso: 'O orçamento foi salvo como Rascunho na aba Orçamentos — revise e envie ao cliente por lá.',
  };
}

const FERRAMENTAS = {
  resumo_comercial: (args) => resumoComercial(args),
  buscar_clientes: (args) => buscarClientes(args),
  listar_servicos: () => listarServicos(),
  criar_orcamento: (args, contexto) => criarOrcamento(args, contexto),
};

async function executarFerramenta(nome, args, contexto) {
  const fn = FERRAMENTAS[nome];
  if (!fn) return { erro: `Ferramenta desconhecida: ${nome}` };
  return fn(args || {}, contexto);
}

module.exports = { executarFerramenta };
