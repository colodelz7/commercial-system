/* Dados fixos do sistema: empresa, catálogo base de serviços, listas comerciais */

export const CO = {
  name: 'COLODEL LTDA', cnpj: '00.000.000/0001-00',
  address: 'Rua Exemplo, nº 100 - Sua Cidade - PR',
  resp: 'Nome do Responsável', cpf: '000.000.000-00',
  email: 'contato@colodel.com.br',
  emailComercial: 'comercial@colodel.com.br',
  instagram: '@colodel',
  whatsapp: '(00) 00000-0000',
  site: 'colodel.com.br',
  pix: 'CNPJ 00.000.000/0001-00 - COLODEL LTDA',
  bank: 'Banco', foro: 'SUA CIDADE/PR',
};

/* Sobe este número toda vez que BASE_SERVICES mudar de verdade (serviço
   adicionado/removido/renomeado). O hook useCatalog usa isso pra saber
   quando precisa re-sincronizar o catálogo salvo no navegador do usuário
   com esta lista, em vez de manter dados antigos/removidos guardados. */
export const SERVICES_VERSION = 2;

export const BASE_SERVICES = [
  {id:'s01',cat:'Redes Sociais',name:'Plano Essencial',desc:'Captação, edição e entrega de conteúdos prontos para publicação própria.',inc:['2 conteúdos semanais (vídeos ou fotos)','Já editados e prontos para publicar','1 visita mensal de captação','Edição otimizada para redes sociais','Canal de comunicação direto com a equipe','Não inclui: capas de destaque, calendário de postagens ou consultoria estratégica'],price:1000,bill:'mensal'},
  {id:'s02',cat:'Redes Sociais',name:'Plano Intermediário',desc:'Conteúdos publicados pela equipe, com calendário personalizado.',inc:['2 conteúdos semanais (vídeos ou fotos)','Publicação feita pela equipe responsável','1 visita mensal de captação','Edição otimizada para redes sociais','Calendário de postagens com datas comemorativas','Canal de comunicação direto com a equipe'],price:1300,bill:'mensal'},
  {id:'s03',cat:'Redes Sociais',name:'Plano Completo',desc:'Maior frequência de conteúdos, com gestão completa pela equipe.',inc:['3 conteúdos semanais (vídeos ou fotos)','Publicação feita pela equipe responsável','1 visita mensal de captação','Edição otimizada para redes sociais','Calendário de postagens com datas comemorativas','Canal de comunicação direto com a equipe'],price:1500,bill:'mensal'},
  {id:'s04',cat:'Redes Sociais',name:'Canal Adicional',desc:'Amplie a presença da marca em um canal estratégico adicional.',inc:['1 publicação semanal no canal adicional','Adaptação do conteúdo ao formato da plataforma','Publicação feita pela equipe responsável'],price:400,bill:'mensal'},
  {id:'s05',cat:'Tráfego Pago',name:'Gestão de Anúncios',desc:'Gestão completa de campanhas de anúncios online.',inc:['Gestão de campanhas nas principais plataformas','Otimização contínua das campanhas','Segmentação estratégica do público','Relatórios de desempenho detalhados','Não inclui: criação dos criativos (contratável à parte)','Não inclui: valor de investimento em mídia'],price:1500,bill:'mensal'},
  {id:'s06',cat:'Tráfego Pago',name:'Conteúdos para Campanhas',desc:'Materiais exclusivos para campanhas patrocinadas.',inc:['4 conteúdos/vídeos para campanhas patrocinadas','Linguagem comercial focada em conversão','Produzidos para mídia paga','Não inclui: publicação no feed, calendário ou gestão de redes sociais'],price:500,bill:'mensal'},
  {id:'s07',cat:'Presença Local',name:'Consultoria de Perfil Local',desc:'Criação e otimização completa do perfil da empresa em buscadores locais.',inc:['Criação ou acesso ao perfil e verificação da conta','Configuração de informações comerciais (nome, categoria, endereço, contato, horário)','Organização visual: logo, capa e fotos','Padronização de imagens e ajustes de autoridade','Melhor presença nas buscas locais'],price:400,bill:'pontual'},
  {id:'s08',cat:'Combos',name:'Combo Inicial',desc:'Produção de conteúdo + gestão de tráfego pago.',inc:['Valor promocional aplicado','Plano Intermediário: publicações semanais + calendário + captação mensal','Gestão de Anúncios: campanhas nas principais plataformas','Bônus: conteúdos para campanhas','Não inclui: valor de investimento em mídia'],price:2800,bill:'mensal',parts:['s02','s05']},
  {id:'s09',cat:'Combos',name:'Combo Impulso',desc:'Presença digital completa com mais frequência de conteúdo.',inc:['Valor promocional aplicado','Plano Completo: conteúdos semanais + calendário + captação mensal','Gestão de Anúncios: campanhas nas principais plataformas','Bônus: conteúdos para campanhas','Não inclui: valor de investimento em mídia'],price:2950,bill:'mensal',parts:['s03','s05']},
  {id:'s10',cat:'Combos',name:'Combo Autoridade Local',desc:'Autoridade e visibilidade local combinadas com conteúdo e tráfego.',inc:['Valor promocional aplicado','Plano Intermediário: produção e publicação de conteúdos','Gestão de Anúncios: campanhas estratégicas','Consultoria de Perfil Local (buscas e mapas)','Não inclui: valor de investimento em mídia'],price:3150,bill:'mensal',parts:['s02','s05','s07']},
  {id:'s11',cat:'Combos',name:'Combo Geração de Leads',desc:'Gestão de anúncios + landing page mensal, focado em geração de leads.',inc:['Valor promocional aplicado','Gestão de Anúncios: campanhas nas principais plataformas','Otimização contínua e segmentação estratégica','1 nova landing page por mês focada em conversão','Não inclui: valor de investimento em mídia'],price:2500,bill:'mensal',parts:['s05','s14']},
  {id:'s12',cat:'Sites e Lojas',name:'Manutenção de Site',desc:'Manutenção mensal do site: segurança, backup e atualizações.',inc:['Atualização de itens e conteúdos do site','Alteração e atualização de banners','Atualização de plugins e ferramentas','Segurança digital contra invasões','Backup periódico do site','Monitoramento e acionamento da hospedagem em quedas'],price:700,bill:'mensal'},
  {id:'s13',cat:'Sites e Lojas',name:'Otimização para Buscadores',desc:'SEO On Page para melhorar posicionamento e relevância do site.',inc:['Implementação de conformidade com LGPD','Conteúdos otimizados e palavras-chave estratégicas','Otimização de meta tags, URLs, headings e imagens','Melhorias de navegação, responsividade e velocidade','Artigos otimizados para blog','Ferramentas de analytics e marcações técnicas','Acessibilidade e relatórios mensais'],price:1300,bill:'mensal'},
  {id:'s14',cat:'Sites e Lojas',name:'Página de Conversão',desc:'Página estratégica para um serviço, produto ou oferta específica.',inc:['Implementação de conformidade com LGPD','Criação com foco em palavras-chave','Estrutura responsiva (computador, tablet e celular)','Otimização de desempenho','Ferramentas de analytics','Tags de rastreamento e acessibilidade','Otimização de título, URL e meta description'],price:1100,bill:'pontual'},
  {id:'s15',cat:'Sites e Lojas',name:'Site Institucional',desc:'Site profissional para apresentar a empresa, serviços e contatos.',inc:['Captação de imagens','Implementação de conformidade com LGPD','Páginas com foco em palavras-chave','Estrutura responsiva (computador, tablet e celular)','Ferramentas de analytics e tags de rastreamento','Acessibilidade e otimização de título/URL/meta description','Opcionais: formulário de orçamento, botão de contato, páginas específicas','Não inclui: registro de domínio e hospedagem (por conta do cliente)'],price:5000,bill:'pontual'},
  {id:'s16',cat:'Sites e Lojas',name:'Loja Virtual',desc:'E-commerce profissional para vender produtos online com segurança.',inc:['Captação de imagens e conformidade com LGPD','Páginas com foco em palavras-chave e responsivas','Ferramentas de analytics, tags e acessibilidade','Cadastro de itens do catálogo inicial','Integração de pagamento no checkout','Integração com transportadoras e controle de estoque','Vitrine de produtos','Não inclui: registro de domínio e hospedagem (por conta do cliente)'],price:7000,bill:'pontual'},
  {id:'s17',cat:'Design',name:'Cartão de Visita (Frente)',desc:'Arte digital de cartão de visita em uma face.',inc:['Layout conforme a identidade visual da marca','Principais informações de contato','Não inclui: impressão do material'],price:100,bill:'pontual'},
  {id:'s18',cat:'Design',name:'Cartão de Visita (Frente e Verso)',desc:'Arte digital de cartão de visita em duas faces.',inc:['Frente com identidade visual, logo e nome','Verso com contatos, redes sociais e site','Não inclui: impressão do material'],price:180,bill:'pontual'},
  {id:'s19',cat:'Design',name:'Flyer (Frente)',desc:'Arte digital de flyer em uma face para divulgação.',inc:['Layout personalizado conforme a identidade visual','Comunicação clara e profissional','Não inclui: impressão do material'],price:200,bill:'pontual'},
  {id:'s20',cat:'Design',name:'Flyer (Frente e Verso)',desc:'Arte digital de flyer em duas faces.',inc:['Layout personalizado em frente e verso','Conteúdos complementares para mais impacto','Não inclui: impressão do material'],price:270,bill:'pontual'},
  {id:'s21',cat:'Design',name:'Vídeo Institucional',desc:'Produção audiovisual profissional para apresentar a empresa.',inc:['Briefing inicial com o cliente','Captação de imagens e direção de cenas','Edição profissional','1 vídeo finalizado de até 3 minutos','Não inclui: recortes adicionais'],price:5000,bill:'pontual'},
];

export const ORIGENS = ['Indicação', 'Instagram', 'Google', 'WhatsApp', 'Prospecção ativa', 'Cliente antigo', 'Tráfego pago', 'Evento', 'Outro'];
export const RESPONSAVEIS = ['Responsável 1', 'Responsável 2', 'Responsável 3'];
export const LOSS_REASONS = ['Preço', 'Cliente sumiu', 'Fechou com concorrente', 'Sem verba', 'Sem momento', 'Escopo não aprovado', 'Outro'];

export const DISC_CAP = 20; // teto de desconto em %
export const DISC_WARN = 10; // acima disso, pede confirmação

export const HANDOFF_SECTIONS = [
  { titulo: 'Informações básicas do cliente', perguntas: [
    { k: 'q1', q: 'Quem é o cliente?', ajuda: 'Identifica empresa, segmento, cidade e responsável principal.' },
    { k: 'q2', q: 'Quem é o decisor final?', ajuda: 'Evita depender de quem não aprova decisões, orçamento ou continuidade.' },
    { k: 'q3', q: 'Quem será o contato do dia a dia?', ajuda: 'Define quem envia materiais, responde dúvidas e aprova demandas operacionais.' },
    { k: 'q4', q: 'Existe mais alguém influente no processo?', ajuda: 'Mapeia sócios, gerentes, financeiro ou equipe comercial que impactam a relação.' },
  ] },
  { titulo: 'Serviço contratado e escopo', perguntas: [
    { k: 'q5', q: 'O que exatamente foi vendido?', ajuda: 'Lista os serviços contratados e evita confusão sobre entregas.' },
    { k: 'q6', q: 'Qual é o escopo do projeto?', ajuda: 'Separa o que está incluso, o que não está e o que depende de orçamento extra.' },
    { k: 'q7', q: 'Qual plano, pacote ou contrato foi fechado?', ajuda: 'Registra mensalidade, setup, prazo mínimo, recorrência e condições principais.' },
    { k: 'q8', q: 'Existe algum bônus ou entrega adicional prometida?', ajuda: 'Previne desalinhamento sobre benefícios, cortesias e exceções comerciais.' },
  ] },
  { titulo: 'Objetivos do projeto', perguntas: [
    { k: 'q9', q: 'Qual é o principal objetivo do cliente com a empresa?', ajuda: 'Direciona as prioridades iniciais: leads, vendas, posicionamento, redes ou tráfego.' },
    { k: 'q10', q: 'Qual resultado faria o cliente considerar o projeto um sucesso?', ajuda: 'Traduz a expectativa em critérios concretos de sucesso.' },
    { k: 'q11', q: 'Existe alguma prioridade inicial?', ajuda: 'Identifica campanhas urgentes, eventos, inaugurações, datas ou lançamentos.' },
    { k: 'q12', q: 'Quais indicadores devem ser acompanhados desde o início?', ajuda: 'Define métricas como leads, vendas, mensagens, agendamentos, alcance ou conversão.' },
  ] },
  { titulo: 'Riscos e pontos de atenção', perguntas: [
    { k: 'q13', q: 'Existem pontos de atenção ou riscos já identificados?', ajuda: 'Antecipa o que pode travar o início do trabalho do CS.' },
    { k: 'q14', q: 'O cliente tem alguma urgência ou expectativa fora da realidade?', ajuda: 'Alinha o ritmo de entrega e evita frustração logo no começo.' },
    { k: 'q15', q: 'Existe histórico negativo com agências ou serviços anteriores?', ajuda: 'Mostra traumas, comparações e cuidados que o CS precisa ter.' },
    { k: 'q16', q: 'Há alguma dependência ou pendência que pode atrasar a entrega?', ajuda: 'Mapeia acessos, materiais, aprovações ou terceiros que travam o projeto.' },
  ] },
  { titulo: 'Informações comerciais e financeiras', perguntas: [
    { k: 'q17', q: 'Qual foi a condição comercial fechada?', ajuda: 'Registra valor, forma de pagamento, recorrência, setup, desconto ou negociação.' },
    { k: 'q18', q: 'Existe período mínimo de contrato?', ajuda: 'Define expectativa de permanência: mensal, trimestral, semestral ou anual.' },
    { k: 'q19', q: 'Já foi pago algum valor inicial?', ajuda: 'Confirma se o onboarding pode iniciar sem bloqueio financeiro.' },
    { k: 'q20', q: 'Existe alguma condição especial combinada?', ajuda: 'Evita surpresas sobre desconto, parcelamento, isenção, bônus ou prazo diferenciado.' },
  ] },
  { titulo: 'Próximos passos', perguntas: [
    { k: 'q21', q: 'Qual deve ser o primeiro contato do CS com o cliente?', ajuda: 'Define se o CS deve enviar boas-vindas, agendar onboarding ou solicitar materiais.' },
    { k: 'q22', q: 'Já existe alguma reunião combinada?', ajuda: 'Evita a perda de compromisso feito pelo comercial.' },
    { k: 'q23', q: 'Qual é a melhor forma de comunicação com o cliente?', ajuda: 'Define WhatsApp, grupo, e-mail, ligação ou reunião.' },
    { k: 'q24', q: 'Existe algo pendente do comercial antes da passagem?', ajuda: 'Fecha lacunas de contrato, pagamento, briefing, proposta ou promessa não formalizada.' },
  ] },
];