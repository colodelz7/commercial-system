/* ============================================================
   db.js — Camada de Dados (portado do vanilla JS original)
   Colodel Sistema Comercial — STORAGE: localStorage
============================================================ */

const PREFIX = 'colodel_';
const KEY_SESSION = PREFIX + 'session';
const KEY_ORC = PREFIX + 'orcamentos';
const KEY_CT = PREFIX + 'contratos';
const KEY_SPOT = PREFIX + 'spots';
const KEY_SV = PREFIX + 'servicos';
const KEY_CL = PREFIX + 'clientes';
const KEY_LD = PREFIX + 'leads';
const KEY_DG = PREFIX + 'diagnosticos';
const KEY_REL = PREFIX + 'relatorios';
const KEY_HO = PREFIX + 'handoffs';
const KEY_ANEXO_PREFIX = PREFIX + 'anexo_';
const ANEXO_MAX_BYTES = 5 * 1024 * 1024;

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error('[db] Erro ao salvar no localStorage:', e); return false; }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* USUÁRIOS — edite aqui para adicionar/remover acessos. */
const USERS = {
  admin: { nome: 'Admin', senha: 'colodel' },
};

let _hashes = null;
async function _getHashes() {
  if (_hashes) return _hashes;
  _hashes = {};
  for (const [key, val] of Object.entries(USERS)) {
    _hashes[key] = { nome: val.nome, hash: await sha256(val.senha) };
  }
  return _hashes;
}

async function login(user, pass) {
  const hashes = await _getHashes();
  const key = (user || '').trim().toLowerCase();
  const entry = hashes[key];
  if (!entry) return false;
  if ((await sha256(pass)) !== entry.hash) return false;
  lsSet(KEY_SESSION, { user: key, nome: entry.nome, at: Date.now() });
  return true;
}

async function logout() { localStorage.removeItem(KEY_SESSION); }

async function isAuthenticated() {
  const session = lsGet(KEY_SESSION);
  if (!session) return false;
  const OITO_HORAS = 8 * 60 * 60 * 1000;
  if (Date.now() - session.at > OITO_HORAS) { localStorage.removeItem(KEY_SESSION); return false; }
  return true;
}

function getSessao() { return lsGet(KEY_SESSION); }

function _crud(key) {
  const getAll = () => lsGet(key) || [];
  const saveAll = (list) => lsSet(key, list || []);
  const saveOne = (item) => {
    const list = getAll();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(key, list);
  };
  const deleteOne = (id) => lsSet(key, getAll().filter((x) => x.id !== id));
  return { getAll, saveAll, saveOne, deleteOne };
}

const orcCrud = _crud(KEY_ORC);
const ctCrud = _crud(KEY_CT);
const spotCrud = _crud(KEY_SPOT);
const svcCrud = _crud(KEY_SV);
const cliCrud = _crud(KEY_CL);
const ldCrud = _crud(KEY_LD);
const dgCrud = _crud(KEY_DG);
const relCrud = _crud(KEY_REL);
const hoCrud = _crud(KEY_HO);

function _fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error || new Error('Falha ao ler o arquivo.'));
    fr.readAsDataURL(file);
  });
}

async function uploadAnexo(diagId, file) {
  if (file && file.size > ANEXO_MAX_BYTES) throw new Error('Arquivo acima do limite de 5MB (modo offline).');
  const nomeLimpo = (file.name || 'arquivo').replace(/[^\w.-]+/g, '_');
  const path = (diagId || 'sem-id') + '/' + Date.now() + '-' + nomeLimpo;
  const dataUrl = await _fileToDataUrl(file);
  try { localStorage.setItem(KEY_ANEXO_PREFIX + path, dataUrl); }
  catch { throw new Error('Sem espaço no armazenamento local (localStorage cheio). Tente um arquivo menor.'); }
  return { nome: file.name || 'arquivo', path, tipo: file.type || '', tamanho: file.size || 0, criadoEm: new Date().toISOString() };
}

async function getAnexoUrl(path) {
  if (!path) return null;
  try { return localStorage.getItem(KEY_ANEXO_PREFIX + path) || null; } catch { return null; }
}

async function deleteAnexo(path) {
  if (!path) return false;
  try { localStorage.removeItem(KEY_ANEXO_PREFIX + path); return true; } catch { return false; }
}

export const DB = {
  login, logout, isAuthenticated, getSessao,
  getOrcamentos: orcCrud.getAll, saveOrcamentos: orcCrud.saveAll, saveOrcamento: orcCrud.saveOne, deleteOrcamento: orcCrud.deleteOne,
  getContratos: ctCrud.getAll, saveContratos: ctCrud.saveAll, saveContrato: ctCrud.saveOne, deleteContrato: ctCrud.deleteOne,
  getContratoPorLink: (token) => ctCrud.getAll().find((c) => c.clientLink === token) || null,
  getSpots: spotCrud.getAll, saveSpots: spotCrud.saveAll, saveSpot: spotCrud.saveOne, deleteSpot: spotCrud.deleteOne,
  getServicos: svcCrud.getAll, saveServicos: svcCrud.saveAll, saveServico: svcCrud.saveOne, deleteServico: svcCrud.deleteOne,
  getClientes: cliCrud.getAll, saveCliente: cliCrud.saveOne, deleteCliente: cliCrud.deleteOne,
  getLeads: ldCrud.getAll, saveLead: ldCrud.saveOne, deleteLead: ldCrud.deleteOne,
  getDiagnosticos: dgCrud.getAll, saveDiagnostico: dgCrud.saveOne, deleteDiagnostico: dgCrud.deleteOne,
  getRelatorios: relCrud.getAll, saveRelatorio: relCrud.saveOne, deleteRelatorio: relCrud.deleteOne,
  getHandoffs: hoCrud.getAll, saveHandoff: hoCrud.saveOne, deleteHandoff: hoCrud.deleteOne,
  uploadAnexo, getAnexoUrl, deleteAnexo,
  _sha256: sha256,
};