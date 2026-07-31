import jsPDF from 'jspdf';
import { HANDOFF_SECTIONS } from './constants';

const ROYAL = [18, 10, 143], CYAN = [0, 159, 227], INK = [26, 26, 46], WHITE = [255, 255, 255],
  MUTED = [90, 94, 120], LGRAY = [214, 219, 232], OFF = [247, 247, 252], LABEL = [120, 124, 150],
  LIGHTONROYAL = [200, 205, 235];
const PRI_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const PRI_COR = { baixa: [30, 203, 122], media: [245, 166, 35], alta: [232, 64, 64] };

export function gerarPdfHandoff(h) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, ML = 18, MR = 18, TW = W - ML - MR;
  let y = 0, pageNum = 0;

  function sf(sz, wt, clr) { doc.setFontSize(sz); doc.setFont('helvetica', wt === 'bold' ? 'bold' : 'normal'); doc.setTextColor(clr[0], clr[1], clr[2]); }
  function drawHeaderBar() {
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, 297, 'F');
    doc.setFillColor(...ROYAL); doc.rect(0, 0, W, 15, 'F');
    doc.setFillColor(...CYAN); doc.rect(0, 15, W, 0.9, 'F');
    sf(9, 'bold', WHITE); doc.text('Colodel', ML, 10);
    sf(7, 'normal', LIGHTONROYAL); doc.text('HANDOFF · PASSAGEM COMERCIAL PARA CS', ML + 24, 10);
    doc.setTextColor(...LIGHTONROYAL); doc.text('Pag. ' + pageNum, W - MR, 10, { align: 'right' });
    y = 24;
  }
  function newPage() { pageNum++; if (pageNum > 1) doc.addPage(); drawHeaderBar(); }
  function chk(n) { if (y + n > 276) newPage(); }
  function sectionTitle(txt) {
    chk(16); y += 4;
    doc.setFillColor(...OFF); doc.roundedRect(ML, y - 3, TW, 10, 2, 2, 'F');
    doc.setFillColor(...ROYAL); doc.roundedRect(ML, y - 3, 3.2, 10, 1.2, 1.2, 'F');
    sf(8.8, 'bold', ROYAL); doc.text(txt, ML + 7, y + 3.6);
    y += 12;
  }
  function qa(q, a) {
    chk(11);
    sf(8.9, 'bold', INK);
    doc.splitTextToSize(q, TW).forEach((l) => { chk(5); doc.text(l, ML, y); y += 4.7; });
    y += 0.6;
    sf(8.6, 'normal', MUTED);
    const txt = (a && String(a).trim()) ? String(a).trim() : '—';
    doc.splitTextToSize(txt, TW).forEach((l) => { chk(5); doc.text(l, ML, y); y += 4.7; });
    y += 3.6;
  }

  newPage();
  sf(15, 'bold', INK); doc.text('Handoff Comercial para CS', ML, y); y += 9;
  const boxH = 28; chk(boxH + 4);
  doc.setFillColor(...OFF); doc.roundedRect(ML, y, TW, boxH, 2.5, 2.5, 'F');
  doc.setFillColor(...CYAN); doc.roundedRect(ML, y, 4, boxH, 1.5, 1.5, 'F');
  sf(7, 'bold', LABEL); doc.text('CLIENTE', ML + 9, y + 7);
  sf(11, 'bold', INK); doc.text(h.clientName || '—', ML + 9, y + 14.5);
  sf(7, 'bold', LABEL); doc.text('GERADO EM', ML + 9, y + 21);
  sf(9, 'normal', INK); doc.text(String(h.createdAt || ''), ML + 9, y + 26);
  sf(7, 'bold', LABEL); doc.text('STATUS', W - MR - 42, y + 7);
  sf(10, 'bold', INK); doc.text(String(h.status || 'Rascunho'), W - MR - 42, y + 14.5);
  sf(7, 'bold', LABEL); doc.text('PRIORIDADE', W - MR - 42, y + 21);
  const priTxt = PRI_LABEL[h.prioridade] || '—';
  const priCor = PRI_COR[h.prioridade] || INK;
  sf(10, 'bold', priCor); doc.text(priTxt, W - MR - 42, y + 26);
  y += boxH + 9;

  HANDOFF_SECTIONS.forEach((sec) => {
    sectionTitle(sec.titulo);
    sec.perguntas.forEach((p) => qa(p.q, (h.respostas || {})[p.k]));
  });

  const pages = doc.internal.getNumberOfPages();
  for (let pp = 1; pp <= pages; pp++) {
    doc.setPage(pp);
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.line(ML, 289, W - MR, 289);
    sf(6.5, 'normal', MUTED);
    doc.text('Colodel · Sistema Comercial', ML, 293);
    doc.text('Página ' + pp + ' de ' + pages, W - MR, 293, { align: 'right' });
  }

  const safe = (h.clientName || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  doc.save(`Handoff_${safe || 'cliente'}.pdf`);
}
