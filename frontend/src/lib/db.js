/* ============================================================
   db.js — Camada de Dados
   Morning Sistema Comercial — backend Express + PostgreSQL local.
   ------------------------------------------------------------------
   Mantém a MESMA superfície síncrona (DB.getX/saveX/deleteX) que o
   app já usava com localStorage, para não precisar reescrever hooks
   e componentes. Por baixo, guarda um cache em memória alimentado
   pelo backend: getX() lê do cache; saveX()/deleteX() atualizam o
   cache na hora (otimista) e disparam o fetch real em paralelo.
============================================================ */

const API = '/api';

const TABELAS = {
  orcamentos: 'orcamentos', contratos: 'contratos', spots: 'spots', servicos: 'servicos',
  clientes: 'clientes', leads: 'leads', diagnosticos: 'diagnosticos', relatorios: 'relatorios',
  prospeccao: 'prospeccao',
};

let _cache = {};
let _sessao = null;

async function _fetchJson(url, opts) {
  const resp = await fetch(url, { credentials: 'include', ...opts });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    const err = new Error(d.error || `Erro ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  if (resp.status === 204) return null;
  return resp.json().catch(() => null);
}

async function _bootstrap() {
  const entradas = await Promise.all(
    Object.values(TABELAS).map((t) =>
      _fetchJson(`${API}/${t}`).then((lista) => [t, lista || []]).catch((e) => {
        console.error(`[db] falha ao carregar ${t}:`, e.message);
        return [t, []];
      })
    )
  );
  _cache = Object.fromEntries(entradas);
}

/* ---------- autenticação ---------- */
async function login(usuario, senha) {
  try {
    const d = await _fetchJson(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    });
    _sessao = d.usuario;
    await _bootstrap();
    return true;
  } catch (e) {
    return false;
  }
}

async function logout() {
  try { await _fetchJson(`${API}/logout`, { method: 'POST' }); } catch { /* ignora */ }
  _sessao = null;
  _cache = {};
}

async function isAuthenticated() {
  try {
    const d = await _fetchJson(`${API}/session`);
    _sessao = d.usuario;
    await _bootstrap();
    return true;
  } catch (e) {
    _sessao = null;
    return false;
  }
}

function getSessao() { return _sessao; }

/* ---------- CRUD genérico por tabela, com cache local ---------- */
function _crud(tabela) {
  const getAll = () => _cache[tabela] || [];

  const saveOne = (item) => {
    const list = getAll().slice();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    _cache[tabela] = list;
    _fetchJson(`${API}/${tabela}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item),
    }).catch((e) => console.error(`[db] falha ao salvar em ${tabela}:`, e.message));
    return true;
  };

  // Substitui a tabela inteira (usado por sincronizações de catálogo/lote).
  // Precisa apagar no backend o que saiu da lista, não só upsertar o que ficou.
  const saveAll = (list) => {
    const novos = list || [];
    const antigos = getAll();
    const idsNovos = new Set(novos.map((x) => x.id));
    const removidos = antigos.filter((x) => !idsNovos.has(x.id));
    _cache[tabela] = novos.slice();
    if (novos.length) {
      _fetchJson(`${API}/${tabela}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novos),
      }).catch((e) => console.error(`[db] falha ao salvar lote em ${tabela}:`, e.message));
    }
    removidos.forEach((r) => {
      _fetchJson(`${API}/${tabela}/${encodeURIComponent(r.id)}`, { method: 'DELETE' })
        .catch((e) => console.error(`[db] falha ao remover ${r.id} de ${tabela}:`, e.message));
    });
    return true;
  };

  const deleteOne = (id) => {
    _cache[tabela] = getAll().filter((x) => x.id !== id);
    _fetchJson(`${API}/${tabela}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch((e) => console.error(`[db] falha ao remover de ${tabela}:`, e.message));
  };

  return { getAll, saveAll, saveOne, deleteOne };
}

const orcCrud = _crud(TABELAS.orcamentos);
const ctCrud = _crud(TABELAS.contratos);
const spotCrud = _crud(TABELAS.spots);
const svcCrud = _crud(TABELAS.servicos);
const cliCrud = _crud(TABELAS.clientes);
const ldCrud = _crud(TABELAS.leads);
const dgCrud = _crud(TABELAS.diagnosticos);
const relCrud = _crud(TABELAS.relatorios);

/* ---------- anexos (upload em disco via backend) ---------- */
async function uploadAnexo(diagId, file) {
  const form = new FormData();
  form.append('file', file);
  form.append('diagId', diagId || 'sem-id');
  const meta = await _fetchJson(`${API}/anexos`, { method: 'POST', body: form });
  return meta;
}
function getAnexoUrl(path) {
  if (!path) return null;
  return `${API}/anexos/${path.split('/').map(encodeURIComponent).join('/')}`;
}
async function deleteAnexo(path) {
  if (!path) return false;
  try {
    await _fetchJson(`${API}/anexos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export const DB = {
  login, logout, isAuthenticated, getSessao,
  getOrcamentos: orcCrud.getAll, saveOrcamentos: orcCrud.saveAll, saveOrcamento: orcCrud.saveOne, deleteOrcamento: orcCrud.deleteOne,
  getContratos: ctCrud.getAll, saveContratos: ctCrud.saveAll, saveContrato: ctCrud.saveOne, deleteContrato: ctCrud.deleteOne,
  getSpots: spotCrud.getAll, saveSpots: spotCrud.saveAll, saveSpot: spotCrud.saveOne, deleteSpot: spotCrud.deleteOne,
  getServicos: svcCrud.getAll, saveServicos: svcCrud.saveAll, saveServico: svcCrud.saveOne, deleteServico: svcCrud.deleteOne,
  getClientes: cliCrud.getAll, saveCliente: cliCrud.saveOne, deleteCliente: cliCrud.deleteOne,
  getLeads: ldCrud.getAll, saveLead: ldCrud.saveOne, deleteLead: ldCrud.deleteOne,
  getDiagnosticos: dgCrud.getAll, saveDiagnostico: dgCrud.saveOne, deleteDiagnostico: dgCrud.deleteOne,
  getRelatorios: relCrud.getAll, saveRelatorio: relCrud.saveOne, deleteRelatorio: relCrud.deleteOne,
  uploadAnexo, getAnexoUrl, deleteAnexo,
};
