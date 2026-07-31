import { useState, useCallback } from 'react';
import { DB } from '../lib/db';
import { gid } from '../lib/format';

const CAMPOS_VAZIOS = {
  empresa: '', segmento: '', contato: '', wpp: '', insta: '', site: '', origem: '', resp: '',
  rz_problemas: '', rz_prioridades: '', rz_base: '', rz_objetivo: '',
  g_palavras: '', g_ads: '', g_seo: '', g_gmn: '', g_potencial: '',
  s_site: '', s_meta: '', s_concorrentes: '',
  o_oportunidades: '', o_passos: '', f_contato: '', f_cta: '',
  prazo: 'Semestral (6 meses)',
};

export function useDiagnosticos() {
  const [items, setItems] = useState(() => DB.getDiagnosticos());
  const recarregar = useCallback(() => setItems(DB.getDiagnosticos()), []);

  const criarRascunho = useCallback(() => ({ id: gid(), status: 'Diagnóstico', services: [], anexos: [], ...CAMPOS_VAZIOS }), []);

  const salvar = useCallback((rec) => {
    if (!rec.empresa || !rec.empresa.trim()) return null;
    const existente = DB.getDiagnosticos().find((d) => d.id === rec.id);
    const final = {
      ...rec,
      clientName: rec.empresa, responsavel: rec.resp,
      createdAt: existente?.createdAt || new Date().toLocaleDateString('pt-BR'),
      createdAtRaw: existente?.createdAtRaw || new Date().toISOString(),
      status: existente?.status === 'Perdido' ? 'Perdido' : (rec.status || 'Diagnóstico'),
    };
    DB.saveDiagnostico(final);
    recarregar();
    return final;
  }, [recarregar]);

  const excluir = useCallback((id) => { DB.deleteDiagnostico(id); recarregar(); }, [recarregar]);

  const mudarStatus = useCallback((id, status) => {
    const d = DB.getDiagnosticos().find((x) => x.id === id);
    if (!d) return;
    d.status = status;
    DB.saveDiagnostico(d);
    recarregar();
  }, [recarregar]);

  return { items, criarRascunho, salvar, excluir, mudarStatus, recarregar };
}
