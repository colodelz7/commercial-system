# 🗂️ Morning · Sistema Comercial

Sistema interno de gestão comercial: orçamentos, contratos com assinatura eletrônica, SPOT (propostas avulsas), diagnóstico de clientes em potencial, funil comercial e de leads, prospecção de empresas por cidade e segmento, relatórios com metas, trilha de auditoria de tudo que acontece no sistema, e um assistente virtual (MorningBot) que consulta dados reais e cria orçamentos por conversa.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 6 |
| Backend | Node.js + Express 5 |
| Banco de dados | PostgreSQL 16 (Docker) |
| Autenticação | bcrypt + JWT em cookie httpOnly |
| Assistente virtual | Gemini com function calling (consulta dados e cria orçamentos) |
| Bibliotecas | jsPDF · Chart.js / react-chartjs-2 · Leaflet · DOMPurify |
| APIs externas | IBGE · OpenStreetMap (Overpass) · Autentique (assinatura digital) |

## ✨ Principais telas

- **Visão Geral**: indicadores de orçamentos, contratos e SPOT, gráfico de receita por período e seletor de mês.
- **Orçamentos / Contratos / SPOT**: wizards em etapas, PDF com identidade visual e link público de assinatura eletrônica para o cliente.
- **Diagnóstico**: levantamento de cliente em potencial (concorrência, presença digital, oportunidades), com anexos e conversão direta em orçamento.
- **Funil Comercial** e **Funil de Leads**: kanban com arrastar e soltar.
- **Buscador**: prospecção de empresas por cidade e segmento usando IBGE e OpenStreetMap, sem custo de API.
- **Relatórios**: checklist diário do time, meta e supermeta do mês, tendência de vendas, funil de conversão e receita por serviço, com faixas de 1, 3, 6 e 12 meses.
- **Histórico**: registro de tudo que acontece no sistema (acessos, tentativas de senha, bloqueios, e cada registro criado, editado ou excluído), com filtros por tipo, ação, pessoa, período e busca. Clicar em um evento abre os detalhes completos.
- **Usuários**: gestão de contas, restrita a administradores.
- **MorningBot**: botão flutuante com assistente que responde perguntas sobre o sistema e, quando pedido, consulta indicadores reais ou cria um orçamento de verdade.

## 🔒 Segurança

O projeto passou por uma auditoria completa de código, configuração, dependências e superfície de rede. O que está implementado hoje:

**Autenticação e sessão**
- Senhas com bcrypt (custo 12), nunca retornadas pela API.
- Sessão em JWT dentro de cookie `httpOnly` com `SameSite=Strict`, fora do alcance de JavaScript.
- O papel e a situação da conta são revalidados no banco a cada requisição: desativar ou rebaixar alguém tem efeito imediato, sem esperar o token expirar.
- Bloqueio de 5 minutos após 3 tentativas erradas, contado por IP e por conta, com cronômetro regressivo na tela de login.
- Resposta e tempo de processamento iguais para login inexistente, desativado ou senha errada, para não revelar quais contas existem.
- Proteção contra o sistema ficar sem nenhum administrador ativo.

**Dados e autorização**
- Todo SQL é parametrizado, e o nome da tabela passa por uma allowlist antes de chegar na query.
- Exclusão de clientes, contratos e serviços exige administrador.
- O link público de contrato responde a partir de uma allowlist de campos, então anotações internas da equipe nunca vazam para o cliente.
- O token do link de assinatura é gerado no servidor com `crypto.randomBytes`.
- Upload de anexos com validação dupla (tipo MIME e extensão), limite de tamanho e proteção contra path traversal.

**Superfície e infraestrutura**
- Banco e API escutam apenas em `127.0.0.1` por padrão. Expor na rede exige mudança explícita no `.env`.
- Cabeçalhos de segurança em toda resposta: CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Webhooks verificam assinatura antes de processar qualquer coisa (HMAC-SHA256 no da Meta) e recusam quando não há segredo configurado.
- Rate limit nas rotas sensíveis e `npm audit` zerado nos dois projetos.
- Nenhum segredo versionado: os arquivos `.env` ficam fora do repositório e os `.env.example` não trazem valores de exemplo para senha.

**Privacidade**
- Documento, telefone e e-mail são mascarados antes de qualquer consulta chegar ao assistente virtual.
- Conteúdo vindo do banco é tratado como dado, não como instrução, protegendo o assistente contra prompt injection.

## 📁 Estrutura

```
├── docker-compose.yml        # Postgres local
├── backend/
│   ├── back.js               # Servidor Express (auth, API, anexos, link público, auditoria)
│   ├── lib/                  # db.js (pool pg), rateLimit.js
│   ├── routes/               # chat.js (MorningBot)
│   ├── services/             # geminiService.js, assistantTools.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/       # Wizards, modais e UI geral
    │   │   ├── tabs/         # ClientesTab, OrcamentosTab, HistoricoTab, etc.
    │   │   └── modals/       # ClienteModal, OrcamentoViewModal, etc.
    │   ├── hooks/            # useAuth, useOrcamentos, useHistorico, etc.
    │   ├── lib/              # db.js (cache + API), pdf.js, format.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js
    └── package.json
```

## 🚀 Rodando localmente

### 🐘 Banco de dados

```bash
cp .env.example .env      # defina POSTGRES_PASSWORD com uma senha própria
docker compose up -d
```

### ⚙️ Backend

```bash
cd backend
npm install
cp .env.example .env      # PGPASSWORD igual ao POSTGRES_PASSWORD acima, mais JWT_SECRET
npm start
```

No primeiro boot, um usuário admin é criado automaticamente. A senha é aleatória e aparece uma única vez no log, ou você pode definir `ADMIN_SEED_PASSWORD` no `.env`.

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

As integrações externas (Autentique, Meta Ads, MorningBot/Gemini, e-mail e WhatsApp) são opcionais. O sistema funciona sem elas, e cada uma só liga quando a variável correspondente é preenchida no `backend/.env`.

## 📄 Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
