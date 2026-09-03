import { useState, useMemo } from 'react';
import { useHistorico, parseHoraLog } from '../../hooks/useHistorico';
import { DB } from '../../lib/db';
import HistoricoDetalheModal from '../modals/HistoricoDetalheModal';

const POR_PAGINA = 50;

/* Um filtro por tipo de coisa que acontece no sistema. A cor acompanha o
   assunto (comercial em azul, cadastro em ciano, acesso em verde/vermelho),
   e é a mesma cor usada na borda de cada linha da lista. */
const TIPOS = [
  { key: 'login', label: 'Acessos', icon: '🔑', cor: 'verde' },
  { key: 'orcamentos', label: 'Orçamentos', icon: '📄', cor: 'azul' },
  { key: 'contratos', label: 'Contratos', icon: '📝', cor: 'azul' },
  { key: 'spots', label: 'SPOTs', icon: '⚡', cor: 'violeta' },
  { key: 'diagnosticos', label: 'Diagnósticos', icon: '🔍', cor: 'ciano' },
  { key: 'leads', label: 'Leads', icon: '🎯', cor: 'ciano' },
  { key: 'clientes', label: 'Clientes', icon: '🏢', cor: 'ciano' },
  { key: 'servicos', label: 'Serviços', icon: '🏷️', cor: 'ambar' },
  { key: 'relatorios', label: 'Relatórios', icon: '📊', cor: 'ambar' },
  { key: 'prospeccao', label: 'Prospecção', icon: '🔎', cor: 'ambar' },
  { key: 'anexos', label: 'Anexos', icon: '📎', cor: 'cinza' },
  { key: 'usuarios', label: 'Usuários', icon: '👥', cor: 'rosa' },
  { key: 'bot', label: 'MorningBot', icon: '🤖', cor: 'violeta' },
];
const COR_POR_TIPO = TIPOS.reduce((acc, t) => { acc[t.key] = t.cor; return acc; }, {});

const ACOES = [
  { key: 'todas', label: 'Qualquer ação' },
  { key: 'criado', label: 'Criações' },
  { key: 'atualizado', label: 'Edições' },
  { key: 'excluido', label: 'Exclusões' },
  { key: 'falha', label: 'Senhas erradas e bloqueios' },
];

function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Classifica a ação pelo texto para permitir filtrar por criação/edição/exclusão. */
function classeDaAcao(l) {
  const a = normalizar(l.action);
  if (l.tipo === 'login') {
    if (a.includes('bloquead')) return 'bloqueio';
    if (a.includes('falhou')) return 'falha';
    if (a.includes('logout')) return 'saida';
    return 'entrada';
  }
  if (a.includes('excluid') || a.includes('removid')) return 'excluido';
  if (a.includes('assinado')) return 'assinado';
  if (a.includes('criad') || a.includes('enviado') || a.includes('gerado')) return 'criado';
  if (a.includes('atualizad') || a.includes('editad') || a.includes('preencheu') || a.includes('abriu')) return 'atualizado';
  return 'outro';
}

const BADGE_ACAO = {
  entrada: { txt: 'entrou', cls: 'b-ok' },
  saida: { txt: 'saiu', cls: 'b-neutro' },
  falha: { txt: 'senha errada', cls: 'b-warn' },
  bloqueio: { txt: 'bloqueado', cls: 'b-err' },
  criado: { txt: 'criou', cls: 'b-ok' },
  atualizado: { txt: 'editou', cls: 'b-info' },
  excluido: { txt: 'excluiu', cls: 'b-err' },
  assinado: { txt: 'assinado', cls: 'b-ok' },
  outro: { txt: '', cls: 'b-neutro' },
};

/** "agora", "há 5 min", "há 2 h" para os eventos recentes. */
function tempoRelativo(l) {
  const d = parseHoraLog(l.time);
  if (!d) return '';
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 0 || seg > 86400) return '';
  if (seg < 60) return 'agora';
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  return `há ${Math.floor(seg / 3600)} h`;
}

function rotuloDoDia(l) {
  const d = parseHoraLog(l.time);
  if (!d) return 'Sem data';
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const igual = (a, b) => a.toDateString() === b.toDateString();
  if (igual(d, hoje)) return 'Hoje';
  if (igual(d, ontem)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}
function hora(l) {
  const d = parseHoraLog(l.time);
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
}

export default function HistoricoTab({ sessao, onAbrirRegistro }) {
  const { items, usuarios, carregando, erro, recarregar } = useHistorico();
  const [tiposOn, setTiposOn] = useState([]); // vazio = todos
  const [acao, setAcao] = useState('todas');
  const [busca, setBusca] = useState('');
  const [quem, setQuem] = useState('todos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [pagina, setPagina] = useState(1);
  const [detalhe, setDetalhe] = useState(null);

  function alternarTipo(key) {
    setPagina(1);
    setTiposOn((atual) => (atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key]));
  }

  // Quantos eventos existem de cada tipo, para mostrar no chip do filtro.
  const contagem = useMemo(() => {
    const c = {};
    items.forEach((l) => { c[l.tipo] = (c[l.tipo] || 0) + 1; });
    return c;
  }, [items]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    const dtDe = de ? new Date(de + 'T00:00:00') : null;
    const dtAte = ate ? new Date(ate + 'T23:59:59') : null;

    return items.filter((l) => {
      if (tiposOn.length && !tiposOn.includes(l.tipo)) return false;
      if (quem !== 'todos' && (l.user || '') !== quem) return false;
      if (acao !== 'todas') {
        const c = classeDaAcao(l);
        if (acao === 'falha' && c !== 'falha' && c !== 'bloqueio') return false;
        if (acao === 'criado' && c !== 'criado') return false;
        if (acao === 'atualizado' && c !== 'atualizado') return false;
        if (acao === 'excluido' && c !== 'excluido') return false;
      }
      if (dtDe || dtAte) {
        const d = parseHoraLog(l.time);
        if (!d) return false;
        if (dtDe && d < dtDe) return false;
        if (dtAte && d > dtAte) return false;
      }
      if (q) {
        const alvo = normalizar([l.action, l.user, l.nome, l.tipoLabel, l.refId].filter(Boolean).join(' '));
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [items, tiposOn, acao, busca, quem, de, ate]);

  const visiveis = filtrados.slice(0, pagina * POR_PAGINA);

  function limpar() {
    setTiposOn([]); setAcao('todas'); setBusca(''); setQuem('todos'); setDe(''); setAte(''); setPagina(1);
  }

  /** Atalhos de período: preenchem os campos De e Até de uma vez. */
  function periodoRapido(dias) {
    const fim = new Date();
    const ini = new Date();
    ini.setDate(fim.getDate() - (dias - 1));
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDe(iso(ini)); setAte(iso(fim)); setPagina(1);
  }
  const diasAtalho = (() => {
    if (!de || !ate) return null;
    const d1 = new Date(de + 'T00:00:00'), d2 = new Date(ate + 'T00:00:00');
    const hoje = new Date();
    if (d2.toDateString() !== hoje.toDateString()) return null;
    return Math.round((d2 - d1) / 86400000) + 1;
  })();
  const temFiltro = tiposOn.length || acao !== 'todas' || busca || quem !== 'todos' || de || ate;

  /* Para eventos ligados a um registro, procura como esse registro está hoje.
     Se voltar vazio, é porque foi excluído depois do evento. */
  const registroDoDetalhe = useMemo(() => {
    if (!detalhe || !detalhe.refId) return null;
    const fonte = {
      orcamentos: DB.getOrcamentos, contratos: DB.getContratos, spots: DB.getSpots,
      clientes: DB.getClientes, servicos: DB.getServicos, leads: DB.getLeads,
      diagnosticos: DB.getDiagnosticos,
    }[detalhe.tipo];
    if (!fonte) return null;
    return (fonte() || []).find((x) => x.id === detalhe.refId) || null;
  }, [detalhe]);

  // Agrupa por dia para virar linha do tempo.
  const blocos = [];
  visiveis.forEach((l) => {
    const dia = rotuloDoDia(l);
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(l);
    else blocos.push({ dia, itens: [l] });
  });

  return (
    <div id="tab-historico" className="tab active">
      <div className="hist-topo">
        <div className="hist-topo-txt">
          <h2 className="hist-titulo">Histórico de atividades</h2>
        </div>
        <div className="hist-topo-acao">
          <span className="hist-total">{filtrados.length} {filtrados.length === 1 ? 'evento' : 'eventos'}</span>
          <button className="btn-g" onClick={recarregar} disabled={carregando}>{carregando ? 'Atualizando' : '↻ Atualizar'}</button>
        </div>
      </div>

      <div className="hist-painel">
        <div className="hist-chips">
          <button className={`hist-chip todos${tiposOn.length === 0 ? ' on' : ''}`} onClick={() => { setTiposOn([]); setPagina(1); }}>
            Tudo <span className="hc-n">{items.length}</span>
          </button>
          {TIPOS.map((t) => (
            <button
              key={t.key}
              className={`hist-chip cor-${t.cor}${tiposOn.includes(t.key) ? ' on' : ''}`}
              onClick={() => alternarTipo(t.key)}
              disabled={!contagem[t.key]}
              title={contagem[t.key] ? `${contagem[t.key]} evento(s)` : 'Nenhum evento desse tipo ainda'}
            >
              <span className="hc-ico">{t.icon}</span>{t.label}
              <span className="hc-n">{contagem[t.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="hist-linha-filtros">
          <div className="search-box hist-busca">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Buscar cliente, ação ou pessoa" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} />
          </div>
          <select className="hist-sel" value={acao} onChange={(e) => { setAcao(e.target.value); setPagina(1); }}>
            {ACOES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <select className="hist-sel" value={quem} onChange={(e) => { setQuem(e.target.value); setPagina(1); }}>
            <option value="todos">Todas as pessoas</option>
            {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <span className="hist-atalhos">
            <button className={`hist-atalho${diasAtalho === 1 ? ' on' : ''}`} onClick={() => periodoRapido(1)}>Hoje</button>
            <button className={`hist-atalho${diasAtalho === 7 ? ' on' : ''}`} onClick={() => periodoRapido(7)}>7 dias</button>
            <button className={`hist-atalho${diasAtalho === 30 ? ' on' : ''}`} onClick={() => periodoRapido(30)}>30 dias</button>
          </span>
          <label className="hist-data">De <input type="date" value={de} onChange={(e) => { setDe(e.target.value); setPagina(1); }} /></label>
          <label className="hist-data">Até <input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPagina(1); }} /></label>
          {temFiltro ? <button className="hist-limpar" onClick={limpar}>Limpar filtros</button> : null}
        </div>
      </div>

      {erro && <div className="msg-err">{erro}</div>}

      {!carregando && filtrados.length === 0 && (
        <div className="empty-state"><p>{items.length ? 'Nenhum evento com esses filtros.' : 'Nenhum evento registrado ainda.'}</p></div>
      )}

      <div className="hist-lista">
        {blocos.map((bloco) => (
          <div className="hist-grupo" key={bloco.dia}>
            <div className="hist-grupo-cab">
              <span className="hgc-dia">{bloco.dia}</span>
              <span className="hgc-linha"></span>
              <span className="hgc-n">{bloco.itens.length}</span>
            </div>
            {bloco.itens.map((l) => {
              const cls = classeDaAcao(l);
              const badge = BADGE_ACAO[cls] || BADGE_ACAO.outro;
              const cor = COR_POR_TIPO[l.tipo] || 'cinza';
              return (
                <div className={`hist-item cor-${cor} est-${cls}`} key={l.id} onClick={() => setDetalhe(l)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalhe(l); } }}>
                  <div className="hi-hora">
                    {hora(l)}
                    {tempoRelativo(l) ? <span className="hi-relativo">{tempoRelativo(l)}</span> : null}
                  </div>
                  <div className="hi-bolha">{l.icon || '•'}</div>
                  <div className="hi-conteudo">
                    <div className="hi-topo">
                      <span className="hi-tipo">{l.tipoLabel || l.tipo}</span>
                      {badge.txt ? <span className={`hi-badge ${badge.cls}`}>{badge.txt}</span> : null}
                    </div>
                    <div className="hi-acao">{l.action}</div>
                    <div className="hi-pe">
                      {l.user ? <span className="hi-quem">{l.user}</span> : null}
                      {!l.user && l.nome ? <span className="hi-quem">conta {l.nome}</span> : null}
                      {l.ip ? <span className="hi-ip">{l.ip}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {visiveis.length < filtrados.length && (
        <div className="hist-mais">
          <button className="btn-g" onClick={() => setPagina((p) => p + 1)}>
            Mostrar mais ({filtrados.length - visiveis.length} restantes)
          </button>
        </div>
      )}

      <HistoricoDetalheModal
        evento={detalhe}
        registro={registroDoDetalhe}
        onClose={() => setDetalhe(null)}
        onAbrir={(tipo, id) => { setDetalhe(null); if (onAbrirRegistro) onAbrirRegistro(tipo, id); }}
      />
    </div>
  );
}
