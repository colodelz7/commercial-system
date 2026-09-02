import { useState, useEffect, useRef } from 'react';

function centsToStr(cents) {
  const n = Math.round(cents || 0);
  if (!n) return '';
  const neg = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const reais = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, '0');
  return neg + reais.toLocaleString('pt-BR') + ',' + dec;
}

// Campo de valor no padrão brasileiro: prefixo "R$", separador de milhar "."
// e centavos com ",", preenchido da direita pra esquerda enquanto digita
// (ex.: digitar "150000" vira "1.500,00"). value/onChange trabalham em
// número puro (reais, com decimais) — igual a um <input type="number">.
export default function MoneyInput({ value, onChange, onBlur, placeholder, className, style, disabled }) {
  const [cents, setCents] = useState(() => Math.round((parseFloat(value) || 0) * 100));
  const ultimoValorExterno = useRef(value);

  useEffect(() => {
    if (value !== ultimoValorExterno.current) {
      ultimoValorExterno.current = value;
      setCents(Math.round((parseFloat(value) || 0) * 100));
    }
  }, [value]);

  function onInputChange(e) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 13);
    const novoCents = digitos ? parseInt(digitos, 10) : 0;
    setCents(novoCents);
    ultimoValorExterno.current = novoCents / 100;
    onChange(novoCents / 100);
  }

  return (
    <div className={`money-input${className ? ' ' + className : ''}${disabled ? ' disabled' : ''}`} style={style}>
      <span className="money-prefix">R$</span>
      <input
        type="text" inputMode="decimal" value={centsToStr(cents)}
        onChange={onInputChange} onBlur={onBlur} placeholder={placeholder || '0,00'} disabled={disabled}
      />
    </div>
  );
}
