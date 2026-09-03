import { useState, useMemo, useRef, useCallback } from 'react';
import { useProspeccao } from '../../hooks/useProspeccao';
import ProspeccaoMap from '../ProspeccaoMap';
import Dropdown from '../Dropdown';

const RAIOS = [5, 10, 25, 50, 100];
const GRUPOS = [
  { g: '', itens: [{ v: '', l: '✨ Todos os segmentos' }] },
  { g: 'Serviços profissionais', itens: ['Advocacia', 'Contabilidade', 'Arquitetura', 'Imobiliária', 'Seguros'] },
  { g: 'Saúde', itens: ['Clínica médica', 'Clínica odontológica', 'Farmácia', 'Veterinário', 'Estética'] },
  { g: 'Alimentação', itens: ['Restaurante', 'Lanchonete', 'Cafeteria', 'Bar', 'Padaria'] },
  { g: 'Beleza', itens: ['Salão de beleza', 'Barbearia'] },
  { g: 'Comércio & Serviços', itens: ['Loja de roupas', 'Supermercado', 'Pet shop', 'Oficina mecânica'] },
  { g: 'Outros', itens: ['Academia', 'Hotel', 'Escola', 'Indústria'] },
];
const FILTROS_DEF = [
  { k: 'tel', label: 'Com telefone' },
  { k: 'wpp', label: 'Com WhatsApp' },
  { k: 'site', label: 'Com site' },
  { k: 'semsite', label: 'Sem site' },
  { k: 'insta', label: 'Com Instagram' },
  { k: 'end', label: 'Com endereço' },
];

function normTxt(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function labelDoSegmento(v) {
  if (!v) return '✨ Todos os segmentos';
  return v;
}
function dominioDe(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export default function ProspeccaoTab({ leads, onVirarLead }) {
  const { resultado, buscando, erro, buscar, carregarCidades, convertidos, marcarConvertido } = useProspeccao();
  const [segmento, setSegmento] = useState('');
  const [raio, setRaio] = useState(25);
  const [cidadesSel, setCidadesSel] = useState([]);
  const [cidadeInput, setCidadeInput] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [ddCidAberto, setDdCidAberto] = useState(false);
  const [filtros, setFiltros] = useState({});
  const [destacado, setDestacado] = useState(null);
  const [segBusca, setSegBusca] = useState('');
  const cidadesTodasRef = useRef(null);

  const gruposFiltrados = useMemo(() => {
    const q = normTxt(segBusca.trim());
    if (!q) return GRUPOS;
    return GRUPOS
      .map((grp) => ({ ...grp, itens: grp.g ? grp.itens.filter((it) => normTxt(it).includes(q)) : grp.itens }))
      .filter((grp) => grp.itens.length);
  }, [segBusca]);

  async function onFocusCidade() {
    if (!cidadesTodasRef.current) cidadesTodasRef.current = await carregarCidades();
  }

  function onInputCidade(v) {
    setCidadeInput(v);
    const q = normTxt(v.trim());
    if (q.length < 2 || !cidadesTodasRef.current) { setSugestoes([]); setDdCidAberto(false); return; }
    const comeca = [], contem = [];
    for (const [nome, uf] of cidadesTodasRef.current) {
      const n = normTxt(nome);
      if (n.startsWith(q)) comeca.push([nome, uf]);
      else if (n.includes(q)) contem.push([nome, uf]);
      if (comeca.length + contem.length > 60) break;
    }
    setSugestoes([...comeca, ...contem].slice(0, 12));
    setDdCidAberto(true);
  }

  function addCidade(nome, uf) {
    if (cidadesSel.length >= 4) { alert('Máximo de 4 cidades por busca.'); return; }
    if (cidadesSel.some((c) => normTxt(c.nome) === normTxt(nome))) { setCidadeInput(''); setDdCidAberto(false); return; }
    setCidadesSel((s) => [...s, { nome, uf }]);
    setCidadeInput(''); setSugestoes([]); setDdCidAberto(false);
  }
  function removeCidade(i) { setCidadesSel((s) => s.filter((_, idx) => idx !== i)); }

  function onKeyDownCidade(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cidadeInput.trim()) addCidade(cidadeInput.trim(), '');
      else { setDdCidAberto(false); onSubmit(); }
    } else if (e.key === 'Backspace' && !cidadeInput && cidadesSel.length) {
      removeCidade(cidadesSel.length - 1);
    }
  }

  function toggleFiltro(k) {
    setFiltros((f) => {
      const next = { ...f, [k]: !f[k] };
      if (k === 'site' && next.site) next.semsite = false;
      if (k === 'semsite' && next.semsite) next.site = false;
      return next;
    });
  }

  function onSubmit(e) {
    e?.preventDefault();
    let cidades = cidadesSel.slice();
    if (cidadeInput.trim() && !cidades.some((c) => normTxt(c.nome) === normTxt(cidadeInput.trim()))) {
      cidades = [...cidades, { nome: cidadeInput.trim(), uf: '' }];
    }
    if (!cidades.length) { alert('Informe ao menos uma cidade.'); return; }
    setCidadesSel(cidades); setCidadeInput('');
    buscar({ cidades: cidades.map((c) => [c.nome, c.uf]), segmento, raio });
  }

  const empresasFiltradas = useMemo(() => {
    let lista = (resultado?.empresas || []).slice();
    if (filtros.tel) lista = lista.filter((e) => e.telefone);
    if (filtros.wpp) lista = lista.filter((e) => e.whatsapp);
    if (filtros.site) lista = lista.filter((e) => e.site);
    if (filtros.semsite) lista = lista.filter((e) => !e.site);
    if (filtros.insta) lista = lista.filter((e) => e.instagram);
    if (filtros.end) lista = lista.filter((e) => e.endereco);
    lista.sort((a, b) => ((b.telefone ? 1 : 0) + (b.site ? 1 : 0)) - ((a.telefone ? 1 : 0) + (a.site ? 1 : 0)));
    return lista;
  }, [resultado, filtros]);

  const virarLead = useCallback((empresa) => {
    leads.salvar({
      name: empresa.nome, empresa: empresa.nome,
      wpp: empresa.whatsapp || empresa.telefone || '',
      email: '', valor: 0, temp: 'Morna', origem: 'Buscador', stage: 'leads',
      obs: [empresa.categoria, empresa.endereco, empresa.site].filter(Boolean).join(' · '),
    });
    marcarConvertido(empresa);
    onVirarLead?.();
  }, [leads, marcarConvertido, onVirarLead]);

  return (
    <div id="tab-prospeccao" className="tab active">
      <form className="prosp-bar" onSubmit={onSubmit}>
        <div className="prosp-field prosp-seg">
          <label>Segmento / Serviço</label>
          <Dropdown valueLabel={labelDoSegmento(segmento)} searchPlaceholder="Buscar segmento..." onSearch={setSegBusca}>
            {gruposFiltrados.map((grp) => (
              <div key={grp.g || 'todos'}>
                {grp.g && <div className="dd-grp">{grp.g}</div>}
                {grp.itens.map((it) => {
                  const valor = grp.g ? it : it.v;
                  const label = grp.g ? it : it.l;
                  return (
                    <div
                      key={valor} className={`dd-opt${segmento === valor ? ' sel' : ''}`}
                      onClick={() => { setSegmento(valor); setSegBusca(''); }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            ))}
            {gruposFiltrados.length === 0 && <div className="dd-vazio">Nenhum segmento encontrado.</div>}
          </Dropdown>
        </div>
        <div className="prosp-field prosp-cid" style={{ position: 'relative' }}>
          <label>Cidade(s)</label>
          <div className="cid-box" onClick={() => document.getElementById('prosp-cidade-input')?.focus()}>
            {cidadesSel.map((c, i) => (
              <span className="cid-chip" key={c.nome + i}>
                {c.nome}{c.uf ? <i>{c.uf}</i> : null}
                <button type="button" className="cid-x" onClick={() => removeCidade(i)}>×</button>
              </span>
            ))}
            <input
              id="prosp-cidade-input" type="text" className="cid-input" autoComplete="off"
              placeholder={cidadesSel.length ? '' : 'Digite e escolha...'}
              value={cidadeInput}
              onFocus={onFocusCidade}
              onChange={(e) => onInputCidade(e.target.value)}
              onKeyDown={onKeyDownCidade}
              onBlur={() => setTimeout(() => setDdCidAberto(false), 150)}
            />
          </div>
          {ddCidAberto && sugestoes.length > 0 && (
            <div className="dd-panel">
              <div className="dd-list">
                {sugestoes.map(([nome, uf]) => (
                  <div className="dd-opt" key={nome + uf} onMouseDown={() => addCidade(nome, uf)}>
                    {nome} {uf && <span className="dd-uf">{uf}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="prosp-field prosp-raio">
          <label>Raio</label>
          <Dropdown valueLabel={`${raio} km`}>
            {RAIOS.map((r) => (
              <div key={r} className={`dd-opt${raio === r ? ' sel' : ''}`} onClick={() => setRaio(r)}>{r} km</div>
            ))}
          </Dropdown>
        </div>
        <button className="btn-p" type="submit" disabled={buscando}>{buscando ? 'Buscando...' : '🔍 Buscar'}</button>
      </form>

      <div className="prosp-filtros">
        {FILTROS_DEF.map((f) => (
          <button type="button" key={f.k} className={`prosp-chip${filtros[f.k] ? ' active' : ''}`} onClick={() => toggleFiltro(f.k)}>
            {f.label}
          </button>
        ))}
      </div>

      {erro && <div className="msg-err">{erro}</div>}

      <div className="prosp-split">
        <div className="prosp-left">
          <div className="prosp-list-head">
            <span className="prosp-count">
              {buscando ? 'Buscando...' : resultado ? `${empresasFiltradas.length} de ${resultado.total} empresa(s)` : 'Escolha um segmento e uma cidade e clique em Buscar.'}
            </span>
          </div>
          <div className="prosp-list">
            {resultado && empresasFiltradas.length === 0 && !buscando && <p className="prosp-vazio">Nenhuma empresa encontrada com esses filtros.</p>}
            {empresasFiltradas.map((e) => {
              const jaConvertido = convertidos.has(e.osmId);
              const chips = [];
              if (e.telefone) chips.push(`📞 ${e.telefone}`);
              if (e.whatsapp && e.whatsapp !== e.telefone) chips.push(`🟢 ${e.whatsapp}`);
              if (e.site) chips.push(`🌐 ${dominioDe(e.site)}`);
              if (e.instagram) chips.push(`📷 @${e.instagram}`);
              return (
                <div
                  className={`prosp-card${destacado === e.osmId ? ' destaque' : ''}`} key={e.osmId}
                  onMouseEnter={() => setDestacado(e.osmId)}
                >
                  <div className="prosp-av" style={{ '--stc': jaConvertido ? '#1ecb7a' : '#008afc' }}>
                    <span className="prosp-ini">{(e.nome || '?').trim().charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="prosp-info">
                    <div className="prosp-nome">{e.nome}{e.categoria && <span className="prosp-cat">{e.categoria}</span>}</div>
                    {chips.length ? <div className="prosp-contato">{chips.map((c) => <span className="prosp-ci" key={c}>{c}</span>)}</div> : <div className="prosp-contato prosp-sem">Sem telefone/site cadastrados no OSM</div>}
                    {e.endereco && <div className="prosp-end">📍 {e.endereco}{e.cidade ? ` · ${e.cidade}` : ''}</div>}
                  </div>
                  <div className="prosp-acao">
                    {jaConvertido
                      ? <span className="prosp-status" style={{ '--stc': '#1ecb7a' }}>Convertida</span>
                      : <button className="btn-s prosp-add" onClick={() => virarLead(e)}>＋ Enviar pro Funil de Leads</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="prosp-right">
          <ProspeccaoMap empresas={empresasFiltradas} centro={resultado?.centro} destacado={destacado} onMarkerClick={setDestacado} />
          <div className="prosp-legend">
            <span><i className="pl-dot" style={{ background: '#008afc' }}></i> Encontrada</span>
            <span><i className="pl-dot" style={{ background: '#1ecb7a' }}></i> Convertida</span>
          </div>
        </div>
      </div>
    </div>
  );
}
