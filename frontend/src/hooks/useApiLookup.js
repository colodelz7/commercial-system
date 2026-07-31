import { useState, useCallback, useRef } from 'react';

/**
 * Hook genérico de autopreenchimento de endereço/empresa.
 * Uso: const { status, buscarCEP, buscarCNPJ } = useApiLookup();
 * status = { type: 'load'|'ok'|'err'|'', msg }
 */
export function useApiLookup() {
  const [status, setStatus] = useState({ type: '', msg: '' });
  const lastCEP = useRef('');
  const lastCNPJ = useRef('');

  const buscarCEP = useCallback(async (cepRaw) => {
    const raw = (cepRaw || '').replace(/\D/g, '');
    if (raw.length !== 8 || lastCEP.current === raw) return null;
    lastCEP.current = raw;
    setStatus({ type: 'load', msg: 'Buscando endereço...' });
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const d = await resp.json();
      if (d.erro) { setStatus({ type: 'err', msg: 'CEP não encontrado' }); return null; }
      setStatus({ type: 'ok', msg: '✓ Endereço preenchido' });
      setTimeout(() => setStatus({ type: '', msg: '' }), 2500);
      return { rua: d.logradouro, bairro: d.bairro, cidade: d.localidade + (d.uf ? '/' + d.uf : '') };
    } catch {
      setStatus({ type: 'err', msg: 'Falha ao buscar (verifique a internet)' });
      return null;
    }
  }, []);

  const buscarCNPJ = useCallback(async (docRaw) => {
    const raw = (docRaw || '').replace(/\D/g, '');
    if (raw.length !== 14 || lastCNPJ.current === raw) return null;
    lastCNPJ.current = raw;
    setStatus({ type: 'load', msg: 'Buscando dados da empresa...' });
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
      if (!resp.ok) throw new Error('nf');
      const d = await resp.json();
      setStatus({ type: 'ok', msg: '✓ Dados da empresa preenchidos' });
      setTimeout(() => setStatus({ type: '', msg: '' }), 2500);
      return {
        razao: d.razao_social, fantasia: d.nome_fantasia || d.razao_social,
        rua: [d.logradouro, d.numero].filter(Boolean).join(', '),
        comp: d.complemento, bairro: d.bairro,
        cidade: d.municipio ? d.municipio + (d.uf ? '/' + d.uf : '') : '',
        cep: d.cep ? String(d.cep).replace(/\D/g, '').padStart(8, '0') : '',
        email: d.email,
        telefone: d.ddd_telefone_1 ? String(d.ddd_telefone_1).replace(/\D/g, '') : '',
      };
    } catch {
      setStatus({ type: 'err', msg: 'CNPJ não encontrado ou sem internet' });
      return null;
    }
  }, []);

  return { status, buscarCEP, buscarCNPJ };
}
