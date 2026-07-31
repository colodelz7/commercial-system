const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { id: 'orcamentos', label: 'Orçamentos', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></> },
  { id: 'contratos', label: 'Contratos', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="17" x2="8" y2="17" /></> },
  { id: 'spots', label: 'SPOT', icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /> },
  { id: 'diagnostico', label: 'Diagnóstico', icon: <><path d="M9 11H5a2 2 0 0 0-2 2v7" /><path d="M9 3v18" /><circle cx="15" cy="8" r="3" /><path d="M21 20a6 6 0 0 0-12 0" /></> },
  { id: 'funil', label: 'Funil', icon: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="9.5" y="4" width="5" height="10" rx="1" /><rect x="16" y="4" width="5" height="13" rx="1" /></> },
  { id: 'leadfunil', label: 'Funil de Leads', icon: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /> },
  { id: 'handoff', label: 'Handoff', icon: <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="4" /></> },
  { id: 'servicos', label: 'Serviços', icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></> },
  { id: 'clientes', label: 'Clientes', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { id: 'relatorios', label: 'Relatórios', icon: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></> },
];

export default function Sidebar({ activeTab, onTabChange, theme, onToggleTheme, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sb-top">
        <div className="brand" style={{ cursor: 'pointer' }} title="Ir para a Visão Geral" onClick={() => onTabChange('overview')}>
          <span className="bt">Colodel</span><span className="bd">.</span>
        </div>
      </div>
      <nav id="sidebar-nav">
        {TABS.map((t) => (
          <button key={t.id} className={`nb${activeTab === t.id ? ' active' : ''}`} onClick={() => onTabChange(t.id)}>
            <svg viewBox="0 0 24 24">{t.icon}</svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="sb-foot">
        <button className="nb" onClick={onToggleTheme}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
        <button className="nb logout" onClick={onLogout}>
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
