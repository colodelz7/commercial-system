export default function RelCalendar({ ym, onYmChange, registros, dataDia, onSelectDia }) {
  const [ano, mes] = ym.split('-').map(Number);
  const primeiro = new Date(ano, mes - 1, 1);
  const inicioSemana = primeiro.getDay();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const comRegistro = new Set(registros.map((r) => r.id));

  function mudarMes(delta) {
    const d = new Date(ano, mes - 1 + delta, 1);
    onYmChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const celulas = [];
  for (let i = 0; i < inicioSemana; i++) celulas.push(<div className="rc-day out" key={`out${i}`}></div>);
  for (let d = 1; d <= diasNoMes; d++) {
    const id = `${ym}-${String(d).padStart(2, '0')}`;
    celulas.push(
      <div key={id} className={`rc-day${comRegistro.has(id) ? ' has' : ''}${id === dataDia ? ' sel' : ''}`} onClick={() => onSelectDia(id)}>{d}</div>
    );
  }

  return (
    <div className="rel-calendar-card">
      <div className="rel-cal-hdr">
        <button className="btn-g" onClick={() => mudarMes(-1)}>←</button>
        <span>{meses[mes - 1]} {ano}</span>
        <button className="btn-g" onClick={() => mudarMes(1)}>→</button>
      </div>
      <div className="rel-cal-grid">
        {dows.map((d) => <div className="rc-dow" key={d}>{d}</div>)}
        {celulas}
      </div>
    </div>
  );
}
