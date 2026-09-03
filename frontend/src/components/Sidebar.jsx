const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { id: 'orcamentos', label: 'Orçamentos', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></> },
  { id: 'contratos', label: 'Contratos', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="17" x2="8" y2="17" /></> },
  { id: 'spots', label: 'SPOT', icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /> },
  { id: 'diagnostico', label: 'Diagnóstico', icon: <><path d="M9 11H5a2 2 0 0 0-2 2v7" /><path d="M9 3v18" /><circle cx="15" cy="8" r="3" /><path d="M21 20a6 6 0 0 0-12 0" /></> },
  { id: 'funil', label: 'Funil', icon: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="9.5" y="4" width="5" height="10" rx="1" /><rect x="16" y="4" width="5" height="13" rx="1" /></> },
  { id: 'prospeccao', label: 'Buscador', icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> },
  { id: 'leadfunil', label: 'Funil de Leads', icon: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /> },
  { id: 'servicos', label: 'Serviços', icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></> },
  { id: 'clientes', label: 'Clientes', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { id: 'relatorios', label: 'Relatórios', icon: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></> },
  { id: 'historico', label: 'Histórico', icon: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></> },
];

const TAB_ADMIN = { id: 'usuarios', label: 'Usuários', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> };

export default function Sidebar({ activeTab, sessao, onTabChange, onLogout }) {
  const tabs = sessao?.papel === 'admin' ? [...TABS, TAB_ADMIN] : TABS;
  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div className="brand" style={{ cursor: 'pointer' }} title="Ir para a Visão Geral" onClick={() => onTabChange('overview')}>
          <span className="bt">Morning</span><span className="bd">.</span>
        </div>
      </div>
      <nav id="sidebar-nav">
        {tabs.map((t) => (
          <button key={t.id} className={`nb${activeTab === t.id ? ' active' : ''}`} onClick={() => onTabChange(t.id)}>
            <svg viewBox="0 0 24 24">{t.icon}</svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-av"><img src="/avatar-mascote.png" alt="" /></div>
          <div className="sb-user-info">
            <span className="sb-user-name">{sessao?.nome || 'Usuário'}</span>
            <span className="sb-user-role">{sessao?.usuario || ''}</span>
          </div>
          <button className="sb-logout" onClick={onLogout} title="Sair" aria-label="Sair">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
