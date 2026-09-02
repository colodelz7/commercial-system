import { useState, useEffect, useMemo } from 'react';
import { R, qOf, isCombo, comboParts, calcO, dataEfetiva } from '../../lib/format';
import { REL_NUM, FUNIL_ETAPAS } from '../../hooks/useRelatorios';
import RelCalendar from '../RelCalendar';
import TrendChart from '../TrendChart';
import FunnelChart from '../FunnelChart';
import RevenuePieChart from '../RevenuePieChart';
import MoneyInput from '../MoneyInput';

const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Distribui a receita de cada contrato/SPOT entre as categorias dos serviços
// que o compõem (combos são quebrados nos serviços que os formam), pesando
// pelo preço de cada um — assim o total do gráfico bate com o vendido no mês.
function receitaPorCategoria(contratos, spots, services, ym) {
  const [ano, mes] = ym.split('-').map(Number);
  const noMes = (item) => { const dt = dataEfetiva(item); return dt && dt.getFullYear() === ano && dt.getMonth() === mes - 1; };
  const cats = {};
  function distribui(svcs, valorReal) {
    if (!(valorReal > 0)) return;
    const linhas = [];
    (svcs || []).forEach((s) => {
      const q = qOf(s);
      const partes = isCombo(s, services) ? comboParts(s, services) : [s];
      partes.forEach((sv) => linhas.push({ cat: sv.cat || 'Outros', peso: (sv.price || 0) * q }));
    });
    const somaPeso = linhas.reduce((a, l) => a + l.peso, 0);
    if (somaPeso <= 0) { cats.Outros = (cats.Outros || 0) + valorReal; return; }
    linhas.forEach((l) => { cats[l.cat] = (cats[l.cat] || 0) + valorReal * (l.peso / somaPeso); });
  }
  (contratos || []).forEach((c) => {
    if (c.status !== 'Assinado' || !noMes(c)) return;
    distribui(c.plans, (parseFloat(c.finalM) || 0) + (parseFloat(c.finalP) || 0));
  });
  (spots || []).forEach((s) => {
    if (s.status !== 'Aprovado' || !noMes(s)) return;
    distribui(s.services, calcO(s.services || [], s.disc || 0).net);
  });
  const arr = Object.keys(cats).map((k) => ({ cat: k, val: cats[k] })).sort((a, b) => b.val - a.val);
  const total = arr.reduce((a, b) => a + b.val, 0);
  return { arr, total };
}

export default function RelatoriosTab({ relatorios, contratos, spots, catalog }) {
  const {
    ym, setYm, dataDia, setDataDia, registrosDoMes, registroDoDia, meta, vendidoNoMes,
    totaisDoMes, serieDiaria, taxasConversao, salvarDia, salvarMeta,
  } = relatorios;

  const [form, setForm] = useState({});
  const [metaForm, setMetaForm] = useState({ meta: '', supermeta: '' });
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const r = registroDoDia;
    const next = {};
    REL_NUM.forEach(([campo]) => { next[campo] = r[campo] ?? ''; });
    next.valor = r.valor ?? '';
    next.objecoes = r.objecoes ?? '';
    next.quentes = r.quentes ?? '';
    next.obs = r.obs ?? '';
    setForm(next);
  }, [registroDoDia]);

  useEffect(() => {
    setMetaForm({ meta: meta.meta || '', supermeta: meta.supermeta || '' });
  }, [meta]);

  function set(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  function salvar() {
    const dados = {};
    REL_NUM.forEach(([campo]) => { dados[campo] = parseFloat(form[campo]) || 0; });
    dados.valor = parseFloat(String(form.valor).replace(',', '.')) || 0;
    dados.objecoes = form.objecoes || '';
    dados.quentes = form.quentes || '';
    dados.obs = form.obs || '';
    salvarDia(dados);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1800);
  }

  function salvarMetaAcao() {
    salvarMeta(parseFloat(metaForm.meta) || 0, parseFloat(metaForm.supermeta) || 0);
    alert('Meta e supermeta do mês salvas.');
  }

  const falta = (meta.meta || 0) - vendidoNoMes.total;
  const faltaSuper = (meta.supermeta || 0) - vendidoNoMes.total;
  const progressoMeta = meta.meta > 0 ? Math.min(100, Math.round((vendidoNoMes.total / meta.meta) * 100)) : 0;
  const [anoSel, mesSel] = ym.split('-').map(Number);
  const nomeMes = new Date(anoSel, mesSel - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const donut = useMemo(
    () => receitaPorCategoria(contratos?.items, spots?.items, catalog?.services || [], ym),
    [contratos?.items, spots?.items, catalog?.services, ym]
  );

  function mudarMesSel(novoMes, novoAno) {
    setYm(`${novoAno}-${String(novoMes + 1).padStart(2, '0')}`);
  }

  return (
    <div id="tab-relatorios" className="tab active">
      <div className="ov-period-bar">
        <span className="ov-period-lbl">Mês</span>
        <select className="chart-sel" value={mesSel - 1} onChange={(e) => mudarMesSel(parseInt(e.target.value), anoSel)}>
          {MESES_NOME.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select className="chart-sel" value={anoSel} onChange={(e) => mudarMesSel(mesSel - 1, parseInt(e.target.value))}>
          {[anoSel - 1, anoSel, anoSel + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-ic green"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
          <div><p className="kpi-lbl">Vendido em {nomeMes}</p><p className="kpi-val">{R(vendidoNoMes.total)}</p></div>
        </div>
        <div className="kpi">
          <div className={`kpi-ic ${meta.meta > 0 && falta <= 0 ? 'green' : 'cyan'}`}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
          <div><p className="kpi-lbl">{meta.meta ? (falta <= 0 ? 'Meta atingida! 🎉' : 'Falta para a meta') : 'Configure a meta'}</p><p className="kpi-val">{meta.meta ? R(Math.max(0, falta)) : '—'}</p></div>
        </div>
        <div className="kpi">
          <div className={`kpi-ic ${meta.supermeta > 0 && faltaSuper <= 0 ? 'green' : 'violet'}`}><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></div>
          <div><p className="kpi-lbl">{meta.supermeta ? (faltaSuper <= 0 ? 'Supermeta atingida! 🚀' : 'Falta para a supermeta') : 'Configure a supermeta'}</p><p className="kpi-val">{meta.supermeta ? R(Math.max(0, faltaSuper)) : '—'}</p></div>
        </div>
        <div className="kpi">
          <div className="kpi-ic orange"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg></div>
          <div><p className="kpi-lbl">Conversão geral (lead → fechado)</p><p className="kpi-val">{taxasConversao.geral}%</p></div>
        </div>
      </div>

      {meta.meta > 0 && (
        <div className="chart-section" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--g2)' }}>Progresso da meta de {nomeMes}</span>
            <strong>{progressoMeta}%</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, height: 16, overflow: 'hidden' }}>
            <div style={{ width: `${progressoMeta}%`, height: '100%', background: progressoMeta >= 100 ? 'var(--ok)' : 'linear-gradient(90deg,#009FE3,#15C2D8)', borderRadius: 8, transition: 'width .3s' }}></div>
          </div>
        </div>
      )}

      <div className="chart-section" style={{ marginBottom: 18 }}>
        <div className="chart-header"><span className="sec-title">Tendência de Vendas — {nomeMes}</span></div>
        <TrendChart serie={serieDiaria} />
      </div>

      <div className="card rel-donut-card" style={{ marginBottom: 18 }}>
        <div className="rel-donut-head">
          <h3 className="panel-title" style={{ margin: 0 }}>Receita por serviço</h3>
          <span className="rel-donut-hint">De onde veio a renda em {nomeMes} (contratos assinados + SPOTs aprovados)</span>
        </div>
        <RevenuePieChart arr={donut.arr} total={donut.total} />
      </div>

      <div className="rel-grid" style={{ marginBottom: 18 }}>
        <div className="chart-section">
          <div className="chart-header"><span className="sec-title">Funil Comercial do Mês</span></div>
          <FunnelChart etapas={FUNIL_ETAPAS} totais={totaisDoMes} taxas={taxasConversao} />
        </div>
        <div>
          <RelCalendar ym={ym} onYmChange={setYm} registros={registrosDoMes} dataDia={dataDia} onSelectDia={setDataDia} />
          <div className="rel-meta-card" style={{ marginTop: 14 }}>
            <h3>Meta do mês</h3>
            <div className="field"><label>Meta</label><MoneyInput value={metaForm.meta} onChange={(v) => setMetaForm((f) => ({ ...f, meta: v }))} /></div>
            <div className="field"><label>Supermeta</label><MoneyInput value={metaForm.supermeta} onChange={(v) => setMetaForm((f) => ({ ...f, supermeta: v }))} /></div>
            <button className="btn-p w100" onClick={salvarMetaAcao}>Salvar meta</button>
          </div>
        </div>
      </div>

      <div className="rel-day-card">
        <h3>Checklist do dia — {dataDia.split('-').reverse().join('/')}</h3>
        <div className="rel-num-grid">
          {REL_NUM.map(([campo, label]) => (
            <div className="field" key={campo}>
              <label>{label}</label>
              <input type="number" min="0" value={form[campo] ?? ''} onChange={(e) => set(campo, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="field"><label>Valor fechado no dia</label><MoneyInput value={form.valor} onChange={(v) => set('valor', v)} /></div>
        <div className="field-row">
          <div className="field"><label>Objeções mais comuns</label><input value={form.objecoes ?? ''} onChange={(e) => set('objecoes', e.target.value)} /></div>
          <div className="field"><label>Leads quentes</label><input value={form.quentes ?? ''} onChange={(e) => set('quentes', e.target.value)} /></div>
        </div>
        <div className="field"><label>Observações do dia</label><textarea rows="2" value={form.obs ?? ''} onChange={(e) => set('obs', e.target.value)} /></div>
        <button className="btn-p" onClick={salvar}>{savedMsg ? '✓ Salvo!' : '💾 Salvar relatório do dia'}</button>
      </div>
    </div>
  );
}
