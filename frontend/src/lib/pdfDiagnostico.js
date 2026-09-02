import jsPDF from 'jspdf';
import { CO } from './constants';
import { PDF, cor, fundo, linha, rodape } from './pdfTheme';

const SECOES = [
  { titulo: 'Diagnóstico-resumo', campos: [
    ['rz_problemas', 'Principais problemas'], ['rz_prioridades', 'Prioridades'],
    ['rz_base', 'Base da análise'], ['rz_objetivo', 'Objetivo geral do dossiê'],
  ] },
  { titulo: 'Google e busca local', campos: [
    ['g_palavras', 'Palavras-chave pesquisadas'], ['g_ads', 'Tráfego pago no Google (Google Ads)'],
    ['g_seo', 'Ranqueamento orgânico e SEO local'], ['g_gmn', 'Google Empresas (Google Meu Negócio)'],
    ['g_potencial', 'Potencial de busca local'],
  ] },
  { titulo: 'Site, anúncios Meta e concorrentes', campos: [
    ['s_site', 'Site / Landing page'], ['s_meta', 'Anúncios Meta e redes (resumo)'], ['s_concorrentes', 'Concorrentes'],
  ] },
  { titulo: 'Oportunidades e fechamento', campos: [
    ['o_oportunidades', 'Oportunidades identificadas'], ['o_passos', 'Próximos passos sugeridos'],
  ] },
];

export function gerarPdfDiagnostico(d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ML = 18, W = 210, H = 297, TW = W - ML * 2;
  let y = 20;

  fundo(doc, PDF.primary); doc.rect(0, 0, W, 3.2, 'F');
  doc.setFontSize(9).setFont(undefined, 'bold'); cor(doc, PDF.primary);
  doc.text('DIAGNÓSTICO ESTRATÉGICO', ML, y); y += 8;
  doc.setFontSize(20).setFont(undefined, 'bold'); cor(doc, PDF.dark);
  doc.text(d.empresa || 'Cliente', ML, y); y += 7;
  const linha2 = [d.contato, d.segmento].filter(Boolean).join('  ·  ');
  if (linha2) { doc.setFontSize(10).setFont(undefined, 'normal'); cor(doc, PDF.gray); doc.text(linha2, ML, y); y += 6; }
  doc.setFontSize(9); cor(doc, PDF.grayLight);
  const contatos = [d.wpp && `WhatsApp: ${d.wpp}`, d.insta, d.site].filter(Boolean).join('  ·  ');
  if (contatos) { doc.text(contatos, ML, y); y += 8; } else y += 3;

  linha(doc, PDF.border); doc.line(ML, y, W - ML, y); y += 8;

  SECOES.forEach((sec) => {
    const camposPreenchidos = sec.campos.filter(([campo]) => (d[campo] || '').trim());
    if (!camposPreenchidos.length) return;
    if (y > 265) { doc.addPage(); y = 20; }
    fundo(doc, PDF.primary); doc.roundedRect(ML, y - 3.6, 1.6, 5, 0.8, 0.8, 'F');
    doc.setFontSize(12).setFont(undefined, 'bold'); cor(doc, PDF.dark);
    doc.text(sec.titulo, ML + 5, y); y += 7;

    camposPreenchidos.forEach(([campo, label]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9).setFont(undefined, 'bold'); cor(doc, PDF.gray);
      doc.text(label.toUpperCase(), ML, y); y += 5;
      doc.setFontSize(10).setFont(undefined, 'normal'); cor(doc, PDF.dark);
      const linhas = (d[campo] || '').split('\n').map((s) => s.trim()).filter(Boolean);
      linhas.forEach((lTxt) => {
        const wrapped = doc.splitTextToSize('• ' + lTxt, TW);
        wrapped.forEach((l) => { if (y > 275) { doc.addPage(); y = 20; } doc.text(l, ML + 2, y); y += 5; });
      });
      y += 3;
    });
    y += 3;
  });

  if (d.f_contato || d.f_cta) {
    if (y > 260) { doc.addPage(); y = 20; }
    linha(doc, PDF.border); doc.line(ML, y, W - ML, y); y += 8;
    doc.setFontSize(9).setFont(undefined, 'normal'); cor(doc, PDF.gray);
    if (d.f_contato) { doc.text(d.f_contato, ML, y); y += 6; }
    if (d.f_cta) { doc.setFont(undefined, 'bold'); cor(doc, PDF.primary); doc.text(d.f_cta, ML, y); y += 6; }
  }

  rodape(doc, CO, { pageW: W, pageH: H, margin: ML });

  const safe = (d.empresa || 'cliente').replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Diagnostico_${safe}.pdf`);
}
