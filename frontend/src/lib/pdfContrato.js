import jsPDF from 'jspdf';
import { CO } from './constants';
import { sl } from './format';
import { renderContractHTML } from './contractDocument';

/**
 * Gera o PDF do contrato renderizando o mesmo HTML usado na tela do cliente
 * (via jsPDF .html(), que usa html2canvas por baixo). Preserva 100% do texto legal.
 */
export async function gerarPdfContrato(c, cd, services) {
  const html = renderContractHTML(c, cd, services);
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:750px;padding:32px;font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#1a1a2e;background:#fff;';
  wrapper.innerHTML = `<style>
    .ct-sec{font-weight:700;font-size:14px;margin:18px 0 8px;color:#120a8f;border-bottom:1px solid #ccc;padding-bottom:4px}
    .ct-p{margin:0 0 8px}
    .ct-strong{font-weight:700}
    .ct-bul{margin:0 0 10px;padding-left:20px}
    .ct-box{border:1px solid #ccc;border-radius:6px;padding:12px 14px;margin:10px 0;background:#f7f7fc}
    .ct-box-name{font-weight:700;font-size:14px;margin-bottom:4px}
    .ct-cover{text-align:center;margin-bottom:24px}
    .ct-cover-logo{font-size:28px;font-weight:800;color:#120a8f}
    .ct-h1{text-align:center;font-size:16px;margin:24px 0}
    .ct-divider{border-top:1px solid #ccc;margin:24px 0}
    .ct-sign-line{border-top:1px solid #1a1a2e;width:220px;margin:40px 0 6px}
  </style>${html}`;
  document.body.appendChild(wrapper);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await doc.html(wrapper, { margin: [15, 15, 15, 15], autoPaging: 'text', width: 180, windowWidth: 750 });
  document.body.removeChild(wrapper);
  doc.save(`Contrato_${CO.name.replace(/\s+/g, '_')}_${sl(cd.razao || 'cliente')}.pdf`);
}
