import jsPDF from 'jspdf';
import { CO } from './constants';
import { R, calcO, fmtSeq, qOf } from './format';

export function gerarPdfOrcamento(o) {
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;

  doc.setFontSize(16).setFont(undefined, 'bold');
  doc.text(CO.name, margin, y); y += 6;
  doc.setFontSize(9).setFont(undefined, 'normal');
  doc.text(`${CO.address} · CNPJ ${CO.cnpj}`, margin, y); y += 5;
  doc.text(`${CO.email} · ${CO.whatsapp} · ${CO.site}`, margin, y); y += 10;

  doc.setFontSize(14).setFont(undefined, 'bold');
  doc.text(`Proposta Comercial Nº ${fmtSeq(o.seq)}`, margin, y); y += 8;

  doc.setFontSize(10).setFont(undefined, 'normal');
  doc.text(`Cliente: ${o.clientName || '-'}`, margin, y); y += 5;
  if (o.clientWpp) { doc.text(`WhatsApp: ${o.clientWpp}`, margin, y); y += 5; }
  if (o.clientEmail) { doc.text(`E-mail: ${o.clientEmail}`, margin, y); y += 5; }
  doc.text(`Validade da proposta: ${o.validity} dias`, margin, y); y += 5;
  doc.text(`Data: ${o.createdAt}`, margin, y); y += 10;

  doc.setFontSize(12).setFont(undefined, 'bold');
  doc.text('Serviços Propostos', margin, y); y += 7;
  doc.setFontSize(10).setFont(undefined, 'normal');

  (o.services || []).forEach((s) => {
    if (y > 265) { doc.addPage(); y = 20; }
    const qtd = qOf(s);
    const linha = qtd > 1 ? `${s.name} (x${qtd}) — ${R(s.price * qtd)}` : `${s.name} — ${R(s.price)}`;
    doc.setFont(undefined, 'bold');
    doc.text(linha, margin, y); y += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(s.desc || '', 170);
    doc.text(descLines, margin + 3, y); y += descLines.length * 4 + 3;
    doc.setFontSize(10);
  });

  y += 3;
  if (y > 250) { doc.addPage(); y = 20; }
  const { m, p, d, net } = calcO(o.services || [], o.disc || 0);
  doc.setFont(undefined, 'bold');
  doc.text('Resumo Financeiro', margin, y); y += 6;
  doc.setFont(undefined, 'normal');
  if (m) { doc.text(`Total mensal: ${R(m)}/mês`, margin, y); y += 5; }
  if (p) { doc.text(`Total pontual: ${R(p)}`, margin, y); y += 5; }
  if (o.disc) { doc.text(`Desconto (${o.disc}%): -${R(d)}`, margin, y); y += 5; }
  doc.setFont(undefined, 'bold');
  doc.text(`Total com desconto: ${R(net)}`, margin, y); y += 8;

  if (o.finObs) {
    doc.setFont(undefined, 'normal').setFontSize(9);
    const obsLines = doc.splitTextToSize(`Observações: ${o.finObs}`, 175);
    doc.text(obsLines, margin, y); y += obsLines.length * 4;
  }

  doc.save(`Orcamento_${fmtSeq(o.seq)}_${(o.clientName || 'cliente').replace(/[^\w-]+/g, '_')}.pdf`);
}
