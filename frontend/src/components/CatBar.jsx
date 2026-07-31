export default function CatBar({ cats, active, onChange }) {
  return (
    <div className="cat-bar">
      {cats.map((c) => (
        <button key={c} className={`cat-btn${active === c ? ' active' : ''}`} onClick={() => onChange(c)}>{c}</button>
      ))}
    </div>
  );
}
