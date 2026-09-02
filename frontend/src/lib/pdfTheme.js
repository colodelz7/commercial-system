// Paleta e helpers compartilhados pelos PDFs (orçamento, SPOT, diagnóstico),
// pra todos usarem as mesmas cores da marca Morning (mesmas do style.css).
export const PDF = {
  primary: [0, 138, 252],   // --c
  primaryDark: [3, 46, 92], // tom mais escuro do azul, pra texto sobre fundo claro
  dark: [16, 20, 38],       // texto principal (equivalente ao --w do tema claro)
  gray: [91, 111, 147],     // --g2 do tema claro
  grayLight: [150, 160, 185],
  green: [30, 203, 122],    // --ok
  red: [232, 64, 64],       // --err
  bg: [244, 247, 252],      // fundo dos cards claros
  bgStrong: [227, 240, 254],// fundo do destaque de total
  border: [211, 221, 238],  // --cb do tema claro
};

export function cor(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); return doc; }
export function fundo(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); return doc; }
export function linha(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); return doc; }

/** Barra colorida no topo + nome/dados da empresa. Retorna o Y onde o conteúdo pode continuar. */
export function cabecalho(doc, CO, { kicker, pageW = 210, margin = 18 } = {}) {
  fundo(doc, PDF.primary); doc.rect(0, 0, pageW, 3.2, 'F');
  let y = 16;
  if (kicker) {
    doc.setFontSize(9).setFont(undefined, 'bold'); cor(doc, PDF.primary);
    doc.text(kicker, margin, y); y += 7;
  }
  doc.setFontSize(19).setFont(undefined, 'bold'); cor(doc, PDF.dark);
  doc.text(CO.name, margin, y); y += 6;
  doc.setFontSize(8.6).setFont(undefined, 'normal'); cor(doc, PDF.gray);
  doc.text(`${CO.address} · CNPJ ${CO.cnpj}`, margin, y); y += 4.4;
  doc.text(`${CO.email} · ${CO.whatsapp} · ${CO.site}`, margin, y); y += 5;
  linha(doc, PDF.border); doc.setLineWidth(0.4); doc.line(margin, y, pageW - margin, y); y += 9;
  return y;
}

/** Rodapé fino com marca + numeração de página, repetido em toda página nova. */
export function rodape(doc, CO, { pageW = 210, pageH = 297, margin = 18 } = {}) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    linha(doc, PDF.border); doc.setLineWidth(0.3); doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFontSize(7.6).setFont(undefined, 'normal'); cor(doc, PDF.grayLight);
    doc.text(`${CO.name} · ${CO.whatsapp}`, margin, pageH - 9);
    doc.text(`Página ${i}/${total}`, pageW - margin, pageH - 9, { align: 'right' });
  }
}

/** Título de seção com barrinha colorida à esquerda. */
export function tituloSecao(doc, texto, x, y) {
  fundo(doc, PDF.primary); doc.roundedRect(x, y - 3.6, 1.6, 5, 0.8, 0.8, 'F');
  doc.setFontSize(11.5).setFont(undefined, 'bold'); cor(doc, PDF.dark);
  doc.text(texto, x + 5, y);
  return y + 7;
}
