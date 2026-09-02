import { useState } from 'react';
import { gerarPdfOrcamento } from '../lib/pdf';
import { gerarPdfSpot } from '../lib/pdfSpot';
import { gerarPdfDiagnostico } from '../lib/pdfDiagnostico';
import { newClientToken, addHist, now, gid } from '../lib/format';
import { DB } from '../lib/db';
import { useCatalog } from '../hooks/useCatalog';
import { useEntity } from '../hooks/useEntity';
import { useOrcamentos } from '../hooks/useOrcamentos';
import { useContratos } from '../hooks/useContratos';
import { useSpots } from '../hooks/useSpots';
import { useDiagnosticos } from '../hooks/useDiagnosticos';
import { useLeads } from '../hooks/useLeads';
import { useRelatorios } from '../hooks/useRelatorios';

import Sidebar from './Sidebar';
import ServicosTab from './tabs/ServicosTab';
import ClientesTab from './tabs/ClientesTab';
import OverviewTab from './tabs/OverviewTab';
import OrcamentosTab from './tabs/OrcamentosTab';
import OrcamentoWizard from './OrcamentoWizard';
import OrcamentoViewModal from './modals/OrcamentoViewModal';
import ContratosTab from './tabs/ContratosTab';
import ContratoWizard from './ContratoWizard';
import ContratoViewModal from './modals/ContratoViewModal';
import LinkModal from './modals/LinkModal';
import SpotsTab from './tabs/SpotsTab';
import SpotWizard from './SpotWizard';
import SpotViewModal from './modals/SpotViewModal';
import DiagnosticoWizard from './DiagnosticoWizard';
import FunilTab from './tabs/FunilTab';
import LeadFunilTab from './tabs/LeadFunilTab';
import RelatoriosTab from './tabs/RelatoriosTab';
import ProspeccaoTab from './tabs/ProspeccaoTab';
import UsuariosTab from './tabs/UsuariosTab';
import FloatingChatButton from './FloatingChatButton';

const DASH_TITLES = {
  overview: 'Visão Geral', orcamentos: 'Orçamentos', contratos: 'Contratos', spots: 'SPOT',
  diagnostico: 'Diagnóstico', funil: 'Funil Comercial', servicos: 'Serviços', clientes: 'Clientes',
  leadfunil: 'Funil de Leads', relatorios: 'Relatórios',
  prospeccao: 'Buscador', usuarios: 'Usuários',
};

// Monta só depois que a sessão E o cache do db.js já estão prontos (ver useAuth),
// então os hooks abaixo (useState(() => DB.getX())) leem dados já carregados.
export default function Dashboard({ sessao, onToggleTheme, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');

  const catalog = useCatalog();
  const clientes = useEntity(DB.getClientes, DB.saveCliente, DB.deleteCliente);
  const orcamentos = useOrcamentos();
  const contratos = useContratos();
  const spots = useSpots();
  const diagnosticos = useDiagnosticos();
  const leads = useLeads();
  const relatorios = useRelatorios();

  // Diagnóstico: sempre um formulário (sem tela de lista), reseta ao trocar de aba
  const [diagEmEdicao, setDiagEmEdicao] = useState(() => diagnosticos.criarRascunho());

  // Orçamentos: modo de exibição da aba (lista | wizard) + modal de visualização
  const [orcModo, setOrcModo] = useState('lista');
  const [orcEmEdicao, setOrcEmEdicao] = useState(null);
  const [orcVisualizandoId, setOrcVisualizandoId] = useState(null);

  // Contratos
  const [ctModo, setCtModo] = useState('lista');
  const [ctEmEdicao, setCtEmEdicao] = useState(null);
  const [ctVisualizandoId, setCtVisualizandoId] = useState(null);
  const [linkGerado, setLinkGerado] = useState(null);

  // Spots
  const [spotModo, setSpotModo] = useState('lista');
  const [spotEmEdicao, setSpotEmEdicao] = useState(null);
  const [spotVisualizandoId, setSpotVisualizandoId] = useState(null);

  function abrirNovoOrcamento() {
    setOrcEmEdicao(orcamentos.criarRascunho());
    setOrcModo('wizard');
    setActiveTab('orcamentos');
  }

  function abrirEdicaoOrcamento(id) {
    const o = orcamentos.items.find((x) => x.id === id);
    if (!o) return;
    setOrcEmEdicao(JSON.parse(JSON.stringify(o)));
    setOrcModo('wizard');
    setOrcVisualizandoId(null);
    setActiveTab('orcamentos');
  }

  function salvarOrcamentoWizard(orcFinal, statusFinal, opts = {}) {
    orcamentos.salvar({ ...orcFinal, status: statusFinal });
    setOrcModo('lista');
    setOrcEmEdicao(null);
    if (opts.pdf) {
      setTimeout(() => {
        const salvo = DB.getOrcamentos().find((x) => x.clientName === orcFinal.clientName && x.id === orcFinal.id);
        if (salvo) gerarPdfOrcamento(salvo);
      }, 50);
    }
  }

  function converterContrato(id) {
    const ct = orcamentos.converterParaContrato(id);
    contratos.recarregar();
    setOrcVisualizandoId(null);
    if (ct) alert('Contrato gerado com sucesso! Veja na aba Contratos.');
  }

  function converterSpot(id) {
    const sp = orcamentos.converterParaSpot(id);
    spots.recarregar();
    setOrcVisualizandoId(null);
    if (sp) alert('Transformado em SPOT com sucesso! Veja na aba SPOT.');
  }

  const orcVisualizando = orcVisualizandoId ? orcamentos.items.find((o) => o.id === orcVisualizandoId) : null;

  function criarRascunhoContrato() {
    return {
      id: crypto.randomUUID?.() || String(Date.now()), clientName: '', clientWpp: '', clientEmail: '', clientObs: '',
      plans: [], finalM: 0, finalP: 0, disc: 0, discObs: '', duration: '6', due: '05', payMethods: ['PIX'],
      ctObs: '', status: 'Rascunho', createdAt: new Date().toLocaleDateString('pt-BR'), createdAtRaw: Date.now(),
      clientLink: null, clientData: null, signature: null, signedAt: null, history: [], notes: '', responsavel: '', origem: '',
    };
  }
  function abrirNovoContrato() { setCtEmEdicao(criarRascunhoContrato()); setCtModo('wizard'); setActiveTab('contratos'); }
  function gerarLinkContrato(ctFinal) {
    if (ctFinal.clientLink) {
      setCtModo('lista'); setCtEmEdicao(null);
      setLinkGerado(ctFinal.clientLink);
      return;
    }
    const token = newClientToken();
    const atualizado = { ...ctFinal, status: 'Aguardando assinatura', clientLink: token };
    if (!(atualizado.history || []).some((h) => h.action === 'Contrato criado')) {
      atualizado.history = atualizado.history || [];
      atualizado.history.unshift({ action: 'Contrato criado', icon: '🆕', time: now() });
    }
    addHist(atualizado, 'Link gerado e enviado ao cliente', '🔗');
    DB.saveContrato(atualizado);
    contratos.recarregar();
    setCtModo('lista'); setCtEmEdicao(null);
    setLinkGerado(token);
  }
  const ctVisualizando = ctVisualizandoId ? contratos.items.find((c) => c.id === ctVisualizandoId) : null;

  function abrirNovoSpot() { setSpotEmEdicao(orcamentos.criarRascunho ? { ...orcamentos.criarRascunho(), status: 'Em avaliação', payMethods: ['PIX'] } : null); setSpotModo('wizard'); setActiveTab('spots'); }
  function abrirEdicaoSpot(id) {
    const s = spots.items.find((x) => x.id === id);
    if (!s) return;
    setSpotEmEdicao(JSON.parse(JSON.stringify(s)));
    setSpotModo('wizard'); setSpotVisualizandoId(null); setActiveTab('spots');
  }
  function salvarSpotWizard(spotFinal, opts = {}) {
    spots.salvar(spotFinal);
    setSpotModo('lista'); setSpotEmEdicao(null);
    if (opts.pdf) {
      setTimeout(() => {
        const salvo = DB.getSpots().find((x) => x.clientName === spotFinal.clientName && x.id === spotFinal.id);
        if (salvo) gerarPdfSpot(salvo);
      }, 50);
    }
  }
  function excluirSpot(id) {
    if (!confirm('Excluir este SPOT? Esta ação não pode ser desfeita.')) return;
    spots.excluir(id);
    setSpotVisualizandoId(null);
  }
  const spotVisualizando = spotVisualizandoId ? spots.items.find((s) => s.id === spotVisualizandoId) : null;

  function abrirNovoDiagnostico() { setDiagEmEdicao(diagnosticos.criarRascunho()); }
  function abrirEdicaoDiagnostico(id) {
    const d = diagnosticos.items.find((x) => x.id === id);
    if (!d) return;
    setDiagEmEdicao(JSON.parse(JSON.stringify(d)));
    setActiveTab('diagnostico');
  }
  function salvarDiagnosticoWizard(dados, opts = {}) {
    const salvo = diagnosticos.salvar(dados);
    if (salvo) {
      setDiagEmEdicao(salvo);
      if (opts.pdf) setTimeout(() => gerarPdfDiagnostico(salvo), 50);
    }
    return salvo;
  }
  function excluirDiagnostico(id) {
    if (!confirm('Excluir este diagnóstico? Esta ação não pode ser desfeita.')) return;
    diagnosticos.excluir(id);
    setDiagEmEdicao(diagnosticos.criarRascunho());
  }
  function converterDiagParaOrcamento(d) {
    if (!d.empresa || !d.empresa.trim()) { alert('Informe ao menos a Empresa (etapa 1) para transformar em orçamento.'); return; }
    if (!confirm('Transformar este diagnóstico em um Orçamento (em avaliação)?\n\nO diagnóstico sairá do funil de diagnósticos e vira um orçamento.')) return;
    const novo = {
      id: gid(), status: 'Proposta em avaliação', createdAt: new Date().toLocaleDateString('pt-BR'), createdAtRaw: Date.now(),
      clientName: d.empresa, clientDoc: '', clientWpp: d.wpp || '', clientEmail: '', clientObs: '',
      origem: d.origem || '', responsavel: d.resp || '', validity: 15,
      services: [], disc: 0, discMode: 'pct', discRaw: '0',
      duration: '6', payment: 'Mensal - todo dia 05', finObs: '', notes: '', history: [],
    };
    addHist(novo, 'Orçamento criado a partir de um diagnóstico', '🔄');
    orcamentos.salvar(novo);
    if (d.id) diagnosticos.excluir(d.id);
    setDiagEmEdicao(diagnosticos.criarRascunho());
    setActiveTab('funil');
    alert('Diagnóstico transformado em Orçamento (em avaliação)!');
  }

  return (
    <div id="screen-dash" className="screen active">
      <Sidebar
        activeTab={activeTab}
        sessao={sessao}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'orcamentos') { setOrcModo('lista'); setOrcEmEdicao(null); }
          if (tab !== 'contratos') { setCtModo('lista'); setCtEmEdicao(null); }
          if (tab !== 'spots') { setSpotModo('lista'); setSpotEmEdicao(null); }
        }}
        onLogout={onLogout}
      />
      <div className="dash-main">
        <header className="dash-hdr">
          <span className="dash-title">{DASH_TITLES[activeTab] || ''}</span>
          <div className="hdr-actions">
            <button className="btn-g" onClick={abrirNovoOrcamento}>+ Orçamento</button>
            <button className="btn-p" onClick={abrirNovoContrato}>+ Contrato</button>
            <button className="hdr-icon" onClick={onToggleTheme} title="Alternar tema" aria-label="Alternar tema">
              <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            </button>
          </div>
        </header>
        {activeTab === 'overview' && (
          <OverviewTab
            orcamentos={orcamentos} contratos={contratos} spots={spots}
            onAbrirOrc={(id) => { setActiveTab('orcamentos'); setOrcVisualizandoId(id); }}
            onAbrirCt={(id) => { setActiveTab('contratos'); setCtVisualizandoId(id); }}
            onAbrirSpot={(id) => { setActiveTab('spots'); setSpotVisualizandoId(id); }}
          />
        )}
        {activeTab === 'servicos' && <ServicosTab catalog={catalog} />}
        {activeTab === 'clientes' && <ClientesTab clientes={clientes} />}
        {activeTab === 'orcamentos' && orcModo === 'lista' && (
          <OrcamentosTab orcamentos={orcamentos} onAbrir={setOrcVisualizandoId} />
        )}
        {activeTab === 'orcamentos' && orcModo === 'wizard' && orcEmEdicao && (
          <OrcamentoWizard
            orc={orcEmEdicao} catalog={catalog} clientesLista={clientes.items}
            onSalvar={salvarOrcamentoWizard}
          />
        )}
        {activeTab === 'contratos' && ctModo === 'lista' && (
          <ContratosTab contratos={contratos} onAbrir={setCtVisualizandoId} />
        )}
        {activeTab === 'contratos' && ctModo === 'wizard' && ctEmEdicao && (
          <ContratoWizard
            ct={ctEmEdicao} catalog={catalog}
            onGerarLink={gerarLinkContrato}
          />
        )}
        {activeTab === 'spots' && spotModo === 'lista' && (
          <SpotsTab spots={spots} onNovo={abrirNovoSpot} onAbrir={setSpotVisualizandoId} />
        )}
        {activeTab === 'spots' && spotModo === 'wizard' && spotEmEdicao && (
          <SpotWizard
            spot={spotEmEdicao} catalog={catalog}
            onSalvar={salvarSpotWizard}
          />
        )}
        {activeTab === 'diagnostico' && (
          <DiagnosticoWizard
            diag={diagEmEdicao}
            onSalvar={salvarDiagnosticoWizard}
            onExcluir={excluirDiagnostico}
            onNovo={abrirNovoDiagnostico}
            onConverterOrcamento={converterDiagParaOrcamento}
          />
        )}
        {activeTab === 'funil' && (
          <FunilTab
            orcamentos={orcamentos} contratos={contratos} diagnosticos={diagnosticos}
            onAbrirOrc={setOrcVisualizandoId}
            onAbrirCt={setCtVisualizandoId}
            onAbrirDiag={abrirEdicaoDiagnostico}
          />
        )}
        {activeTab === 'leadfunil' && <LeadFunilTab leads={leads} />}
        {activeTab === 'relatorios' && <RelatoriosTab relatorios={relatorios} contratos={contratos} spots={spots} catalog={catalog} />}
        {activeTab === 'prospeccao' && <ProspeccaoTab leads={leads} onVirarLead={() => setActiveTab('leadfunil')} />}
        {activeTab === 'usuarios' && sessao?.papel === 'admin' && <UsuariosTab sessao={sessao} />}
      </div>

      {orcVisualizando && (
        <OrcamentoViewModal
          orc={orcVisualizando}
          onClose={() => setOrcVisualizandoId(null)}
          onMudarStatus={orcamentos.mudarStatus}
          onDuplicar={(id) => { orcamentos.duplicar(id); setOrcVisualizandoId(null); }}
          onEditar={abrirEdicaoOrcamento}
          onConverterContrato={converterContrato}
          onConverterSpot={converterSpot}
          onSalvarNotas={orcamentos.salvarNotas}
          onEditarCompetencia={orcamentos.editarCompetencia}
        />
      )}

      {ctVisualizando && (
        <ContratoViewModal
          ct={ctVisualizando}
          onClose={() => setCtVisualizandoId(null)}
          onMudarStatus={contratos.mudarStatus}
          onSalvarNotas={contratos.salvarNotas}
          onEditarCompetencia={contratos.editarCompetencia}
          onGerarLink={(c) => { setCtVisualizandoId(null); gerarLinkContrato(c); }}
        />
      )}

      {linkGerado && <LinkModal token={linkGerado} onClose={() => setLinkGerado(null)} />}

      {spotVisualizando && (
        <SpotViewModal
          spot={spotVisualizando}
          onClose={() => setSpotVisualizandoId(null)}
          onMudarStatus={spots.mudarStatus}
          onEditar={abrirEdicaoSpot}
          onExcluir={excluirSpot}
          onEditarCompetencia={spots.editarCompetencia}
          onSalvarNotas={spots.salvarNotas}
        />
      )}

      <FloatingChatButton />
    </div>
  );
}
