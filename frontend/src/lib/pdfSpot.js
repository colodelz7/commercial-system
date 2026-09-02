import jsPDF from 'jspdf';
import { CO } from './constants';
import { R, calcO, fmtSeq, qOf } from './format';
import { PDF, cor, fundo, linha, cabecalho, rodape, tituloSecao } from './pdfTheme';

const ML = 18, PW = 210, PH = 297, TW = PW - ML * 2;

export function gerarPdfSpot(spot) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = cabecalho(doc, CO, { kicker: 'SPOT · PROPOSTA AVULSA' });

  doc.setFontSize(12).setFont(undefined, 'bold'); cor(doc, PDF.primary);
  doc.text(`SPOT Nº ${fmtSeq(spot.seq)}`, PW - ML, 16, { align: 'right' });
  doc.setFontSize(8).setFont(undefined, 'normal'); cor(doc, PDF.gray);
  doc.text(spot.createdAt || '', PW - ML, 21, { align: 'right' });

  const camposCliente = [
    ['CLIENTE / EMPRESA', spot.clientName || '-'],
    ...(spot.clientDoc ? [['CPF / CNPJ', spot.clientDoc]] : []),
    ...(spot.clientWpp ? [['WHATSAPP', spot.clientWpp]] : []),
    ...(spot.clientEmail ? [['E-MAIL', spot.clientEmail]] : []),
    ...(spot.validity ? [['VALIDADE DA PROPOSTA', `${spot.validity} dias`]] : []),
  ];
  const linhasCliente = Math.ceil(camposCliente.length / 2);
  const boxH = linhasCliente * 11 + 6;
  fundo(doc, PDF.bg); doc.roundedRect(ML, y, TW, boxH, 2.5, 2.5, 'F');
  const colW = TW / 2;
  camposCliente.forEach(([label, valor], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = ML + 6 + col * colW;
    const ly = y + 8 + row * 11;
    doc.setFontSize(7.4).setFont(undefined, 'bold'); cor(doc, PDF.gray);
    doc.text(label, x, ly);
    doc.setFontSize(9.6).setFont(undefined, 'normal'); cor(doc, PDF.dark);
    doc.text(String(valor), x, ly + 4.6, { maxWidth: colW - 10 });
  });
  y += boxH + 10;

  y = tituloSecao(doc, 'Serviços do SPOT', ML, y);

  (spot.services || []).forEach((s) => {
    const qtd = qOf(s);
    const descLines = s.desc ? doc.setFontSize(8.4).splitTextToSize(s.desc, TW - 12) : [];
    const cardH = 8 + descLines.length * 3.9 + 4;
    if (y + cardH > PH - 24) { doc.addPage(); y = 18; }

    fundo(doc, PDF.bg); linha(doc, PDF.border); doc.setLineWidth(0.25);
    doc.roundedRect(ML, y, TW, cardH, 2, 2, 'FD');

    doc.setFontSize(10.4).setFont(undefined, 'bold'); cor(doc, PDF.dark);
    doc.text(qtd > 1 ? `${s.name} (x${qtd})` : s.name, ML + 5, y + 6.5, { maxWidth: TW - 55 });
    doc.setFontSize(10.4).setFont(undefined, 'bold'); cor(doc, PDF.primary);
    doc.text(qtd > 1 ? R(s.price * qtd) : R(s.price), PW - ML - 5, y + 6.5, { align: 'right' });
    doc.setFontSize(7.4).setFont(undefined, 'normal'); cor(doc, PDF.gray);
    doc.text('pontual', PW - ML - 5, y + 10.5, { align: 'right' });

    if (descLines.length) {
      doc.setFontSize(8.4).setFont(undefined, 'normal'); cor(doc, PDF.gray);
      doc.text(descLines, ML + 5, y + 11.5);
    }
    y += cardH + 4;
  });

  y += 3;
  const t = calcO(spot.services || [], spot.disc || 0);
  const resumoH = 10 + 6 + (spot.disc ? 6 : 0) + 12;
  if (y + resumoH > PH - 24) { doc.addPage(); y = 18; }
  y = tituloSecao(doc, 'Resumo financeiro', ML, y);

  fundo(doc, PDF.bgStrong); doc.roundedRect(ML, y, TW, resumoH - 6, 2.5, 2.5, 'F');
  let ry = y + 7;
  doc.setFontSize(9.4).setFont(undefined, 'normal'); cor(doc, PDF.dark);
  doc.text('Total pontual', ML + 6, ry); doc.text(R(t.p), PW - ML - 6, ry, { align: 'right' }); ry += 6;
  if (spot.disc) { cor(doc, PDF.red); doc.text(`Desconto (${spot.disc}%)`, ML + 6, ry); doc.text(`- ${R(t.d)}`, PW - ML - 6, ry, { align: 'right' }); cor(doc, PDF.dark); ry += 6; }
  linha(doc, PDF.primary); doc.setLineWidth(0.3); doc.line(ML + 6, ry, PW - ML - 6, ry); ry += 6.5;
  doc.setFontSize(13).setFont(undefined, 'bold'); cor(doc, PDF.primary);
  doc.text('Valor final', ML + 6, ry); doc.text(R(t.net), PW - ML - 6, ry, { align: 'right' });
  y += resumoH + 4;

  if (spot.finObs) {
    if (y > PH - 40) { doc.addPage(); y = 18; }
    doc.setFontSize(8.6).setFont(undefined, 'bold'); cor(doc, PDF.gray);
    doc.text('OBSERVAÇÕES', ML, y); y += 4.5;
    doc.setFont(undefined, 'normal').setFontSize(9); cor(doc, PDF.dark);
    const obsLines = doc.splitTextToSize(spot.finObs, TW);
    doc.text(obsLines, ML, y); y += obsLines.length * 4.4;
  }

  rodape(doc, CO, { pageW: PW, pageH: PH, margin: ML });
  doc.save(`SPOT_${fmtSeq(spot.seq)}_${(spot.clientName || 'cliente').replace(/[^\w-]+/g, '_')}.pdf`);
}
