import { useState, useCallback, useEffect } from 'react';
import { DB } from '../lib/db';
import { BASE_SERVICES, SERVICES_VERSION } from '../lib/constants';
import { gid } from '../lib/format';

const VERSION_KEY = 'colodel_servicos_versao';

function computar() {
  const doBanco = DB.getServicos() || [];
  const services = doBanco.length ? doBanco.slice() : BASE_SERVICES.slice();
  const cats = ['Todos', ...new Set(services.map((s) => s.cat))];
  return { services, cats };
}

/**
 * Sincroniza o catálogo salvo no navegador com o BASE_SERVICES atual.
 * Sempre que SERVICES_VERSION mudar (o dono do sistema alterou o catálogo
 * padrão), o catálogo salvo é substituído pelo novo — evitando que
 * serviços removidos/renomeados fiquem "presos" no localStorage antigo.
 * Serviços com id novo/desconhecido criados manualmente pelo usuário
 * (id gerado por gid(), não por BASE_SERVICES) são preservados.
 */
function sincronizarComVersaoAtual() {
  let versaoSalva = null;
  try { versaoSalva = localStorage.getItem(VERSION_KEY); } catch { /* ignora */ }

  if (String(versaoSalva) === String(SERVICES_VERSION)) return false;

  const atuais = DB.getServicos() || [];
  const idsBase = new Set(BASE_SERVICES.map((b) => b.id));
  const criadosManualmente = atuais.filter((s) => !idsBase.has(s.id));

  const novaLista = [...BASE_SERVICES.map((b) => JSON.parse(JSON.stringify(b))), ...criadosManualmente];
  DB.saveServicos(novaLista);

  try { localStorage.setItem(VERSION_KEY, String(SERVICES_VERSION)); } catch { /* ignora */ }
  return true;
}

export function useCatalog() {
  const [{ services, cats }, setState] = useState(computar);

  useEffect(() => {
    const mudou = sincronizarComVersaoAtual();
    if (mudou) setState(computar());
  }, []);

  const salvar = useCallback((dados) => {
    const id = dados.id || gid();
    const existente = services.find((s) => s.id === id) || {};
    DB.saveServico({ ...existente, ...dados, id });
    setState(computar());
  }, [services]);

  const excluir = useCallback((id) => {
    DB.deleteServico(id);
    setState(computar());
  }, []);

  const usadoEmCombos = useCallback((id) => services.filter((s) => (s.parts || []).includes(id)).map((s) => s.name), [services]);

  return { services, cats, salvar, excluir, usadoEmCombos };
}