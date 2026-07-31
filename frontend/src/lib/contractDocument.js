import { CO } from './constants';
import { esc, comboParts } from './format';

function toFixed2(v) {
  const semCent = Math.round((Number(v) || 0) * 100) % 100 === 0;
  const c = semCent ? 0 : 2;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }).format(v || 0);
}
export function durLabel(n) { return { '1': 'Spot', '6': 'Semestral', '12': 'Anual' }[String(n)] || n + ' meses'; }
export function payMethodsLabel(c) { return (c.payMethods || []).join(' / ') || 'A combinar'; }

/**
 * Gera o HTML completo do contrato (mesmo texto legal do sistema original).
 * c = contrato (com plans, finalM, finalP, disc, duration, due, payMethods, ctObs, discObs, signedAt)
 * cd = dados do cliente (razao, fantasia, cnpj, email, rua, comp, bairro, cidade, cep, resp, cpf)
 * services = catálogo completo (pra resolver combos)
 */
export function renderContractHTML(c, cd, services) {
  const dueLabel = c.due === 'ato' ? 'no ato da assinatura' : `todo dia ${c.due} de cada mês`;
  const MNS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const sd = new Date(c.signedAt || Date.now());
  const dataAssin = `${CO.foro}, ${sd.getDate()} de ${MNS[sd.getMonth()]} de ${sd.getFullYear()}.`;

  const sec = (t) => `<div class="ct-sec">${esc(t)}</div>`;
  const pb = (t) => `<p class="ct-p">${t}</p>`;
  const pbb = (t) => `<p class="ct-p ct-strong">${t}</p>`;
  const bl = (arr) => `<ul class="ct-bul">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const box = (lines, cls) => `<div class="ct-box ${cls || ''}">${lines.filter(Boolean).map((l, i) => (i === 0 ? `<div class="ct-box-name">${esc(l)}</div>` : `<div class="ct-box-line">${esc(l)}</div>`)).join('')}</div>`;

  let h = '';

  h += '<div class="ct-cover">'
    + '<div class="ct-cover-logo">Colodel</div>'
    + '<div class="ct-cover-sub">ASSESSORIA DE MARKETING DIGITAL</div>'
    + '<div class="ct-cover-tag">DOCUMENTO CONTRATUAL</div>'
    + '<div class="ct-cover-title">Contrato de Prestação de Serviços</div>'
    + '</div>';
  h += '<div class="ct-box ct-cover-box royal">'
    + '<div class="ct-box-label">CONTRATANTE</div>'
    + `<div class="ct-box-name big">${esc(cd.razao)}</div>`
    + `<div class="ct-box-line">CNPJ/CPF: ${esc(cd.cnpj)}</div>`
    + `<div class="ct-box-line">Responsável: ${esc(cd.resp)}    CPF: ${esc(cd.cpf)}</div>`
    + `<div class="ct-box-line">Duração: ${esc(durLabel(c.duration))}    Vencimento: ${c.due === 'ato' ? 'no ato da assinatura' : 'dia ' + esc(c.due)}</div>`
    + '</div>';

  h += '<h1 class="ct-h1">CONTRATO DE PRESTAÇÃO DE SERVIÇOS<br><span>DE MARKETING DIGITAL</span></h1>';

  h += sec('CONTRATANTE');
  h += box([
    cd.razao,
    'CNPJ/CPF: ' + cd.cnpj,
    cd.fantasia ? 'Nome fantasia: ' + cd.fantasia : null,
    'Endereço: ' + (cd.rua + (cd.comp ? ', ' + cd.comp : '')),
    (cd.bairro ? 'Bairro: ' + cd.bairro + ' | ' : '') + 'Município: ' + cd.cidade + ' | CEP: ' + cd.cep,
    'E-mail: ' + cd.email,
    'Representante: ' + cd.resp + ' | CPF: ' + cd.cpf,
  ], 'royal');

  h += sec('CONTRATADA');
  h += box([
    CO.name,
    'CNPJ: ' + CO.cnpj,
    'Endereço: ' + CO.address,
    'Representante legal: ' + CO.resp + ' | CPF: ' + CO.cpf,
    'E-mail: ' + CO.email + ' | WhatsApp: ' + CO.whatsapp,
  ], 'cyan');

  h += pb('As partes acima qualificadas resolvem firmar o presente Contrato de Prestação de Serviços de Marketing Digital, mediante as cláusulas e condições a seguir.');

  h += sec('CLÁUSULA 1 - DO OBJETO');
  h += pb('1.1. O presente contrato tem por objeto a prestação de serviços de marketing digital, comunicação, produção de conteúdo, gestão de redes sociais, gestão de campanhas, desenvolvimento digital e demais entregas expressamente descritas neste instrumento e/ou em proposta comercial aprovada pelas partes.');
  h += pb('1.2. Os serviços serão executados pela CONTRATADA de forma remota, salvo quando houver previsão expressa de visita presencial ou acordo prévio entre as partes.');
  h += pb('1.3. A CONTRATADA atuará com autonomia técnica, criativa, estratégica e operacional, sem qualquer vínculo empregatício, societário, associativo ou de exclusividade entre as partes.');

  h += sec('CLÁUSULA 2 - DO PRAZO DE VIGÊNCIA E RENOVAÇÃO');
  h += pb('2.1. O prazo de vigência do presente contrato é de ' + esc(durLabel(c.duration)) + ', contado a partir da data de assinatura ou aceite eletrônico pelas partes.');
  h += pb('2.2. A renovação poderá ocorrer automaticamente por igual período, salvo manifestação contrária por escrito, com antecedência mínima de 30 dias antes do encerramento da vigência.');
  h += pb('2.3. A continuidade da utilização dos serviços, aprovações, reuniões, demandas ou pagamentos após o término da vigência poderá caracterizar concordância com a renovação contratual, observadas as demais condições deste instrumento.');

  h += sec('CLÁUSULA 3 - DO VALOR, PAGAMENTO E ENCARGOS');
  if (c.finalM) h += pb('3.1. O valor mensal para execução dos serviços contratados é de <strong>R$ ' + toFixed2(c.finalM) + (c.discObs ? ' (' + esc(c.discObs) + ')' : '') + '</strong>.');
  if (c.finalP) h += pb('3.2. O valor pontual de setup, criação, implantação, configuração ou estruturação inicial é de <strong>R$ ' + toFixed2(c.finalP) + '</strong>.');
  h += pb('3.3. O pagamento da mensalidade deverá ser realizado <strong>' + esc(dueLabel) + '</strong>, por meio de <strong>' + esc(payMethodsLabel(c)) + '</strong> ou outro meio acordado entre as partes.');
  if (c.due !== 'ato') h += pb('3.4. As mensalidades seguintes vencem <strong>' + esc(dueLabel) + '</strong>, independentemente da data de reuniões, aprovações, publicações ou entregas específicas, considerando a disponibilidade da equipe e a prestação continuada dos serviços.');
  h += pb('3.5. Em caso de atraso, incidirão multa moratória de 2% sobre o valor devido, juros de 1% ao mês, calculados pro rata die, e correção monetária pelo índice legalmente admitido ou outro que venha a substituí-lo.');
  h += pb('3.6. A inadimplência não suspende automaticamente a vigência contratual nem isenta a CONTRATANTE do pagamento das parcelas vencidas ou vincendas, sem prejuízo das medidas de suspensão e rescisão previstas neste contrato.');
  if (c.ctObs) h += pb('<em>Observação: ' + esc(c.ctObs) + '</em>');

  h += sec('CLÁUSULA 4 - DO ESCOPO CONTRATADO');
  h += pb('4.1. Estão inclusos nesta contratação exclusivamente os serviços contratados e listados abaixo, observadas as quantidades, periodicidades, limites, condições operacionais e disponibilidade previstas neste contrato.');
  h += pbb('Serviços contratados nesta proposta:');
  (c.plans || []).forEach((p) => {
    h += '<p class="ct-p ct-strong ct-svc">' + esc(p.name) + (p.bill ? ' (' + esc(p.bill === 'mensal' ? 'mensal' : 'pontual') + ')' : '') + ':</p>';
    h += bl(p.inc || []);
    const parts = comboParts(p, services || []);
    if (parts.length) {
      h += pb('Este item é um combo, formado pela junção de ' + parts.length + ' serviços. Veja o que está incluso em cada um:');
      parts.forEach((pp) => {
        h += '<p class="ct-p ct-strong ct-svc">' + esc(pp.name) + ':</p>';
        h += bl(pp.inc || []);
      });
    }
  });
  h += pb('4.2. O escopo acima não deve ser interpretado como ilimitado. Quantidades, entregas, prazos, formatos e prioridades deverão observar o planejamento aprovado, a capacidade operacional, os materiais fornecidos pela CONTRATANTE e os limites comerciais definidos entre as partes.');

  h += sec('CLÁUSULA 5 - DO ESCOPO FECHADO E SERVIÇOS EXTRAS');
  h += pb('5.1. Os serviços contratados limitam-se ao escopo descrito neste instrumento e/ou na proposta comercial vinculada ao contrato.');
  h += pb('5.2. Qualquer serviço não expressamente previsto, incluindo demandas extras, novas páginas, novas campanhas, peças adicionais, captações extras, alterações estruturais, integrações, automações, materiais impressos, ajustes técnicos avançados, consultorias adicionais, reuniões extras ou entregas emergenciais, poderá ser cobrado separadamente mediante orçamento prévio.');
  h += pb('5.3. A tolerância, cortesia comercial ou execução eventual de demanda não prevista não implicará alteração automática do escopo contratado, obrigação de continuidade gratuita ou renúncia de cobrança futura pela CONTRATADA.');

  h += sec('CLÁUSULA 6 - DAS OBRIGAÇÕES DA CONTRATADA');
  h += bl(['Executar os serviços conforme objetivos, escopo e condições acordadas;', 'Realizar análises, otimizações e acompanhamentos periódicos compatíveis com o plano contratado;', 'Entregar relatórios de desempenho conforme periodicidade contratada;', 'Prestar suporte para dúvidas estratégicas, operacionais e técnicas relacionadas ao escopo contratado;', 'Manter sigilo sobre informações, acessos e dados fornecidos pela CONTRATANTE;', 'Comunicar impedimentos relevantes que possam impactar prazos ou entregas.']);

  h += sec('CLÁUSULA 7 - DAS OBRIGAÇÕES DA CONTRATANTE');
  h += bl(['Fornecer acessos, informações, materiais, imagens, vídeos, dados, briefings, senhas, autorizações, documentos e aprovações necessários à execução dos serviços;', 'Efetuar os pagamentos nas datas acordadas;', 'Aprovar criativos, planejamentos e direcionamentos estratégicos dentro do prazo previsto neste contrato;', 'Arcar com investimentos em mídia paga, ferramentas, plataformas, hospedagens, domínios, plugins, licenças e custos de terceiros, quando aplicável;', 'Garantir que possui autorização para uso de imagens, marcas, depoimentos, bases de contato, listas, dados pessoais e materiais enviados à CONTRATADA;', 'Manter atendimento comercial adequado aos contatos gerados por campanhas, formulários, redes sociais ou demais canais digitais;', 'Não praticar atos que prejudiquem a execução dos serviços, a reputação da CONTRATADA ou o desempenho das estratégias contratadas.']);

  h += sec('CLÁUSULA 8 - DAS APROVAÇÕES, ATRASOS E APROVAÇÃO TÁCITA');
  h += pb('8.1. A CONTRATANTE deverá analisar materiais, planejamentos, criativos, textos, artes, vídeos, anúncios ou demais entregas enviados pela CONTRATADA no prazo de até 48 horas úteis.');
  h += pb('8.2. Caso não haja manifestação expressa dentro do prazo acima, os materiais poderão ser considerados aprovados para fins de continuidade do cronograma, publicação, programação ou execução estratégica.');
  h += pb('8.3. Atrasos da CONTRATANTE no envio de informações, acessos, briefings, materiais ou aprovações poderão impactar diretamente os prazos e entregas, sem que isso configure atraso, falha ou inadimplemento por parte da CONTRATADA.');
  h += pb('8.4. Alterações solicitadas após aprovação expressa ou tácita poderão ser tratadas como nova demanda, sujeita à disponibilidade da CONTRATADA e eventual cobrança adicional.');

  h += sec('CLÁUSULA 9 - DO LIMITE DE ALTERAÇÕES');
  h += pb('9.1. Cada material entregue pela CONTRATADA terá direito a até 2 rodadas de ajustes, desde que os ajustes estejam alinhados ao briefing inicialmente aprovado.');
  h += pb('9.2. Alterações adicionais, refações integrais, mudanças de direcionamento, alterações de briefing após o início da execução ou solicitações fora do escopo contratado poderão ser cobradas separadamente, mediante orçamento prévio ou aprovação entre as partes.');
  h += pb('9.3. Ajustes decorrentes de erro material comprovadamente cometido pela CONTRATADA não serão considerados como rodada adicional de alteração.');

  h += sec('CLÁUSULA 10 - DA AUSÊNCIA DE GARANTIA DE RESULTADO');
  h += pb('10.1. A CONTRATADA compromete-se a empregar seus melhores esforços técnicos, estratégicos e criativos na execução dos serviços contratados, porém não garante resultados específicos, tais como número mínimo de vendas, leads, seguidores, alcance, engajamento, faturamento, retorno sobre investimento, posicionamento em mecanismos de busca ou qualquer outro resultado comercial.');
  h += pb('10.2. A CONTRATANTE declara estar ciente de que resultados dependem de fatores externos à atuação da CONTRATADA, incluindo, mas não se limitando a: investimento em mídia paga, qualidade da oferta comercial, preço, atendimento ao cliente, mercado, concorrência, sazonalidade, comportamento do público, reputação da marca, disponibilidade de produto, políticas das plataformas digitais e alterações de algoritmos.');

  h += sec('CLÁUSULA 11 - DA MÍDIA PAGA E CUSTOS DE TERCEIROS');
  h += pb('11.1. Os valores pagos à CONTRATADA referem-se exclusivamente à prestação dos serviços profissionais descritos no escopo contratado.');
  h += pb('11.2. Não estão inclusos nos valores mensais ou pontuais: investimento em mídia paga, impulsionamentos, anúncios, compra de domínio, hospedagem externa, plugins, softwares, ferramentas, bancos de imagem, licenças, taxas de plataformas, mensalidades de sistemas, integrações pagas, impressão gráfica ou qualquer custo devido a terceiros, salvo previsão expressa em proposta comercial.');
  h += pb('11.3. Tais valores deverão ser pagos diretamente pela CONTRATANTE ou reembolsados à CONTRATADA, quando previamente autorizado.');
  h += pb('11.4. A CONTRATADA não se responsabiliza por bloqueios, suspensões, instabilidades, reprovações, limitações, alterações de política, indisponibilidade de contas, plataformas, meios de pagamento ou ferramentas de terceiros.');
  h += pb('11.5. Quando os serviços envolverem gestão de tráfego pago, campanhas, anúncios, configurações, otimizações ou acompanhamento de performance, as campanhas poderão ser administradas por meio de contas de anúncio, gerenciadores, estruturas, métodos, fluxos, parametrizações e ambientes técnicos de titularidade, controle ou administração da CONTRATADA, salvo ajuste expresso e diverso entre as partes.');
  h += pb('11.6. A CONTRATANTE declara estar ciente de que, ao contratar a CONTRATADA, está contratando a prestação técnica, estratégica, criativa e operacional dos serviços, bem como a aplicação da propriedade intelectual, conhecimento, metodologia, experiência, critério técnico, processos internos e forma de execução da equipe da Colodel, os quais pertencem exclusivamente à CONTRATADA.');
  h += pb('11.7. As configurações, parametrizações, estruturas de campanhas, públicos, segmentações, organização de contas, históricos de otimização, estratégias de lances, métodos de criação, critérios de distribuição, dados internos de desempenho, padrões de análise, fluxos de trabalho e demais elementos técnicos desenvolvidos ou administrados pela CONTRATADA constituem ativos técnicos, operacionais e intelectuais da CONTRATADA, não sendo objeto de transferência, cópia, exportação, cessão, entrega ou continuidade após o encerramento do contrato, salvo mediante contratação específica e expressa.');
  h += pb('11.8. Encerrado o contrato, por qualquer motivo, a CONTRATADA poderá cessar a administração das campanhas, interromper acessos operacionais, desativar estruturas internas vinculadas à sua conta de anúncio ou gerenciador e excluir, arquivar ou restringir toda e qualquer parametrização, configuração, campanha, histórico operacional, público, criativo, método, fluxo ou estrutura técnica vinculada aos serviços prestados por meio de seus ambientes internos.');
  h += pb('11.9. O histórico técnico, operacional e estratégico do trabalho realizado, quando desenvolvido ou armazenado em contas, gerenciadores, plataformas, processos, relatórios internos ou ambientes administrados pela CONTRATADA, permanecerá em poder da Colodel, não havendo obrigação de transferência à CONTRATANTE, sem prejuízo da entrega dos relatórios contratualmente previstos durante a vigência do contrato.');

  h += sec('CLÁUSULA 12 - DA INADIMPLÊNCIA E SUSPENSÃO DOS SERVIÇOS');
  h += pb('12.1. Em caso de atraso no pagamento superior a 7 dias corridos, a CONTRATADA poderá suspender temporariamente a execução dos serviços, incluindo publicações, campanhas, reuniões, suporte, criação de materiais, acompanhamento estratégico e demais entregas contratadas, até a regularização integral dos valores em aberto.');
  h += pb('12.2. A suspensão dos serviços por inadimplência não interrompe a vigência contratual, não prorroga automaticamente o prazo do contrato e não isenta a CONTRATANTE do pagamento das mensalidades vencidas ou vincendas.');
  h += pb('12.3. Permanecendo a inadimplência por prazo superior a 30 dias, a CONTRATADA poderá rescindir o contrato, sem prejuízo da cobrança dos valores em aberto, encargos contratuais, multa rescisória, honorários advocatícios e demais medidas cabíveis.');

  h += sec('CLÁUSULA 13 - DA RESCISÃO CONTRATUAL');
  h += pb('13.1. Em caso de rescisão antecipada por iniciativa da CONTRATANTE, sem justo motivo comprovado e antes do término do prazo contratado, será devida multa rescisória equivalente a 50% do saldo contratual restante, calculado sobre as mensalidades vincendas até o término da vigência.');
  h += pb('13.2. A multa rescisória não afasta a obrigação de pagamento de valores vencidos, serviços já executados, setup, custos de terceiros, investimentos previamente autorizados ou demais valores pendentes.');
  h += pb('13.3. O pedido de rescisão deverá ser formalizado por escrito, com antecedência mínima de 30 dias, não sendo aceitos cancelamentos exclusivamente verbais ou informais.');
  h += pb('13.4. Não haverá devolução de valores pagos após assinatura, aceite eletrônico ou início da execução dos serviços.');
  h += pb('13.5. A CONTRATADA poderá rescindir o contrato em caso de inadimplência, descumprimento contratual, uso indevido de materiais, conduta abusiva, ausência reiterada de informações essenciais ou prática de atos que prejudiquem a execução dos serviços.');

  h += sec('CLÁUSULA 14 - DA NÃO DEVOLUÇÃO DE SETUP E VALORES EXECUTADOS');
  h += pb('14.1. Os valores pagos a título de setup, implantação, criação inicial, planejamento, estruturação, diagnóstico, configuração, desenvolvimento ou início de projeto não serão reembolsáveis após a assinatura do contrato, aceite eletrônico ou início da execução dos serviços.');
  h += pb('14.2. Os valores pagos por serviços já iniciados, executados, entregues ou disponibilizados também não serão objeto de devolução, ainda que a CONTRATANTE opte pela interrupção ou rescisão antecipada do contrato.');

  h += sec('CLÁUSULA 15 - DA PROPRIEDADE INTELECTUAL, ARQUIVOS E PORTFÓLIO');
  h += pb('15.1. Os materiais criados pela CONTRATADA no âmbito deste contrato poderão ser utilizados pela CONTRATANTE após a quitação integral dos valores correspondentes.');
  h += pb('15.2. A CONTRATADA poderá utilizar os trabalhos desenvolvidos, peças, vídeos, artes, sites, campanhas e resultados públicos como portfólio, estudo de caso, apresentação comercial ou divulgação institucional, salvo manifestação contrária expressa e justificada da CONTRATANTE por escrito.');
  h += pb('15.3. Arquivos editáveis, projetos abertos, fontes, presets, arquivos brutos, bancos de imagem, templates, estruturas internas, métodos, planejamentos estratégicos, contas internas, configurações proprietárias e processos de criação não serão entregues, salvo negociação específica entre as partes.');
  h += pb('15.4. Em caso de inadimplência, a CONTRATADA poderá restringir o acesso, uso ou transferência de materiais ainda não quitados, respeitados os limites legais aplicáveis.');

  h += sec('CLÁUSULA 16 - DA CONFIDENCIALIDADE');
  h += pb('16.1. Ambas as partes comprometem-se a manter sigilo sobre informações estratégicas, comerciais, financeiras, dados cadastrais, senhas, acessos, processos internos e demais informações confidenciais compartilhadas durante e após a vigência deste contrato.');
  h += pb('16.2. A violação desta cláusula sujeitará a parte infratora às penalidades previstas na legislação vigente, sem prejuízo de perdas e danos eventualmente apurados.');

  h += sec('CLÁUSULA 17 - DA LGPD E PROTEÇÃO DE DADOS');
  h += pb('17.1. As partes comprometem-se a observar a legislação aplicável à proteção de dados pessoais, especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD), utilizando os dados compartilhados apenas para as finalidades necessárias à execução deste contrato.');
  h += pb('17.2. A CONTRATANTE declara estar ciente de que é responsável pela legalidade dos dados, listas, contatos, bases de clientes, imagens, depoimentos, autorizações de uso de imagem e demais informações fornecidas à CONTRATADA para campanhas, publicações, automações, formulários ou estratégias comerciais.');
  h += pb('17.3. A CONTRATADA compromete-se a adotar medidas razoáveis de segurança e confidencialidade em relação aos dados, acessos e informações recebidas.');

  h += sec('CLÁUSULA 18 - DA COMUNICAÇÃO ENTRE AS PARTES');
  h += pb('18.1. As comunicações entre as partes poderão ocorrer por e-mail, WhatsApp, plataforma de gestão, reuniões online, reuniões presenciais ou outro canal validado entre as partes.');
  h += pb('18.2. Solicitações, aprovações, recusas, cancelamentos, alterações de escopo e comunicações relevantes deverão ser realizadas por escrito, de forma que seja possível comprovar o teor e a data da manifestação.');
  h += pb('18.3. A CONTRATANTE reconhece que informações enviadas por canais informais, incompletos ou fora dos fluxos combinados poderão impactar prazos e organização das entregas.');

  h += sec('CLÁUSULA 19 - DA ASSINATURA ELETRÔNICA E VALIDADE DO ACEITE');
  h += pb('19.1. As partes reconhecem como válida, eficaz e suficiente a assinatura deste contrato por meio eletrônico, digital, plataforma de assinatura, aceite por e-mail, aceite por WhatsApp ou outro meio capaz de comprovar a manifestação de vontade das partes.');
  h += pb('19.2. O aceite eletrônico produzirá os mesmos efeitos jurídicos da assinatura física, obrigando as partes ao cumprimento integral das condições pactuadas.');
  h += pb('19.3. A execução dos serviços, o pagamento de valores, a autorização de início, o envio de materiais ou a aprovação de briefing poderão ser utilizados como elementos de comprovação de aceite das condições contratuais.');

  h += sec('CLÁUSULA 20 - DAS DISPOSIÇÕES GERAIS');
  h += pb('20.1. O presente contrato obriga as partes e seus sucessores a qualquer título.');
  h += pb('20.2. A eventual tolerância de uma parte para com a outra quanto ao descumprimento de qualquer obrigação não importará em novação, renúncia ou alteração contratual.');
  h += pb('20.3. Caso qualquer disposição deste contrato seja considerada inválida ou inexequível, as demais permanecerão válidas e eficazes.');
  h += pb('20.4. Este contrato substitui entendimentos, propostas ou comunicações anteriores que contrariem suas disposições, salvo anexos, propostas comerciais ou aditivos expressamente vinculados.');

  h += sec('CLÁUSULA 21 - DO FORO');
  h += pb('21.1. Para dirimir quaisquer controvérsias oriundas deste contrato, fica eleito o foro da comarca de <strong>' + esc(CO.foro) + '</strong>, renunciando as partes a qualquer outro, por mais privilegiado que seja.');

  h += '<div class="ct-divider"></div>';
  h += pb('E por estarem assim justas e contratadas, as partes firmam o presente instrumento de forma eletrônica ou física, reconhecendo sua plena validade jurídica.');
  h += '<p class="ct-p ct-strong ct-date">' + esc(dataAssin) + '</p>';
  h += '<div class="ct-sign">'
    + '<div class="ct-sign-label">ASSINATURA</div>'
    + '<div class="ct-sign-line"></div>'
    + '<div class="ct-sign-name">' + esc(CO.name) + '</div>'
    + '<div class="ct-box-line">CNPJ: ' + esc(CO.cnpj) + '</div>'
    + '<div class="ct-box-line">Representante: ' + esc(CO.resp) + '  ·  CPF: ' + esc(CO.cpf) + '</div>'
    + '<div class="ct-sign-role">CONTRATADA</div>'
    + '</div>';

  return h;
}
