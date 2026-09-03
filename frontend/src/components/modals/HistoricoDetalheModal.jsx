import { R } from '../../lib/format';
import { parseHoraLog } from '../../hooks/useHistorico';

/* Detalhes de um evento do histórico. Mostra tudo que foi gravado no momento
   em que aconteceu e, quando o evento se refere a um registro do sistema
   (orçamento, contrato, SPOT...), também o estado ATUAL desse registro, com
   atalho para abrir. Assim dá para ver o que mudou desde então. */

const TABELA_LABEL = {
  orcamentos: 'orçamento', contratos: 'contrato', spots: 'SPOT', clientes: 'cliente',
  servicos: 'serviço', leads: 'lead', diagnosticos: 'diagnóstico', relatorios: 'relatório',
};

function dataPorExtenso(l) {
  const d = l.timeISO ? new Date(l.timeISO) : parseHoraLog(l.time);
  if (!d || isNaN(d.getTime())) return l.time || 'Sem data';
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, às ${hora}`;
}

function Linha({ rotulo, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="hd-linha">
      <span className="hd-rot">{rotulo}</span>
      <span className="hd-val">{children}</span>
    </div>
  );
}

export default function HistoricoDetalheModal({ evento, registro, onClose, onAbrir }) {
  if (!evento) return null;
  const l = evento;
  const ehLogin = l.tipo === 'login';
  const podeAbrir = registro && onAbrir && ['orcamentos', 'contratos', 'spots'].includes(l.tipo);

  return (
    <div className="modal" onClick={onClose}>
      <div className="mbox hd-box" onClick={(e) => e.stopPropagation()}>
        <div className="hd-cab">
          <div className="hd-icone">{l.icon || '•'}</div>
          <div className="hd-cab-txt">
            <span className="hd-tipo">{l.tipoLabel || l.tipo}</span>
            <h3 className="hd-acao">{l.action}</h3>
          </div>
          <button className="hd-fechar" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="hd-quando">{dataPorExtenso(l)}</div>

        <div className="hd-secao">
          <h4 className="hd-titulo-secao">Quem e de onde</h4>
          <Linha rotulo="Pessoa">{l.user || (ehLogin ? null : 'Não identificada')}</Linha>
          <Linha rotulo="Conta">{l.nome}</Linha>
          <Linha rotulo="Permissão">{l.papel === 'admin' ? 'Administrador' : (l.papel ? 'Usuário' : null)}</Linha>
          <Linha rotulo="Endereço IP">{l.ip ? <code className="hd-code">{l.ip}</code> : null}</Linha>
          <Linha rotulo="Navegador">{l.agente}</Linha>
        </div>

        {ehLogin && (l.motivo || l.tentativasRestantes !== undefined || l.segundosRestantes) ? (
          <div className="hd-secao">
            <h4 className="hd-titulo-secao">Sobre a tentativa</h4>
            <Linha rotulo="Motivo da falha">{l.motivo}</Linha>
            <Linha rotulo="Tentativas restantes">
              {l.tentativasRestantes !== undefined ? `${l.tentativasRestantes} antes do bloqueio` : null}
            </Linha>
            <Linha rotulo="Bloqueio">
              {l.segundosRestantes ? `Faltavam ${Math.ceil(l.segundosRestantes / 60)} minuto(s) para liberar` : null}
            </Linha>
          </div>
        ) : null}

        {!ehLogin && (l.cliente || l.statusRegistro || l.valor > 0 || l.operacao) ? (
          <div className="hd-secao">
            <h4 className="hd-titulo-secao">Como estava no momento do evento</h4>
            <Linha rotulo="O que aconteceu">
              {l.operacao === 'criado' ? 'Registro criado' : l.operacao === 'atualizado' ? 'Registro editado' : l.operacao === 'excluido' ? 'Registro excluído' : null}
            </Linha>
            <Linha rotulo="Cliente">{l.cliente}</Linha>
            <Linha rotulo="Situação">{l.statusRegistro}</Linha>
            <Linha rotulo="Valor">{l.valor > 0 ? R(l.valor) : null}</Linha>
          </div>
        ) : null}

        {registro ? (
          <div className="hd-secao hd-atual">
            <h4 className="hd-titulo-secao">Como está hoje</h4>
            <Linha rotulo="Cliente">{registro.clientName || registro.name || registro.nome || registro.empresa}</Linha>
            <Linha rotulo="Situação">{registro.status}</Linha>
            <Linha rotulo="Responsável">{registro.responsavel}</Linha>
            <Linha rotulo="Origem">{registro.origem}</Linha>
            <Linha rotulo="Criado em">{registro.createdAt}</Linha>
            {podeAbrir ? (
              <button className="btn-p hd-abrir" onClick={() => onAbrir(l.tipo, registro.id)}>
                Abrir {TABELA_LABEL[l.tipo] || 'registro'}
              </button>
            ) : null}
          </div>
        ) : null}

        {!ehLogin && l.refId && !registro ? (
          <p className="hd-sumiu">Este registro não existe mais no sistema (foi excluído depois deste evento).</p>
        ) : null}

        <div className="hd-rodape">
          <span>Evento <code className="hd-code">{l.id}</code></span>
          {l.refId ? <span>Registro <code className="hd-code">{l.refId}</code></span> : null}
        </div>
      </div>
    </div>
  );
}
