# 🗂️ Morning — Sistema Comercial

Sistema interno de gestão comercial: orçamentos, contratos com assinatura eletrônica, SPOT (propostas avulsas), diagnóstico de clientes em potencial, funil comercial e de leads, prospecção de empresas por cidade/segmento, relatórios com metas, e um assistente virtual (MorningBot) que consulta dados reais do sistema e cria orçamentos por conversa.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 5 |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL 16 (Docker) |
| Autenticação | bcrypt + JWT em cookie httpOnly |
| Assistente virtual | Gemini (function calling — consulta dados e cria orçamentos) |
| Bibliotecas | jsPDF · Chart.js / react-chartjs-2 · Leaflet |
| APIs externas | IBGE · OpenStreetMap (Overpass) · Autentique (assinatura digital) |

## ✨ Principais telas

- **Visão Geral** — KPIs de orçamentos/contratos/SPOT e gráfico de receita por período.
- **Orçamentos / Contratos / SPOT** — wizards em etapas, PDF com identidade visual, link público de assinatura eletrônica para o cliente.
- **Diagnóstico** — levantamento de cliente em potencial (concorrência, presença digital, oportunidades), com anexos e conversão direta em orçamento.
- **Funil Comercial** e **Funil de Leads** — kanban com arrastar-e-soltar.
- **Buscador** — prospecção de empresas por cidade e segmento (IBGE + OpenStreetMap), sem custo de API.
- **Relatórios** — checklist diário do time, meta/supermeta do mês, tendência de vendas, funil de conversão e receita por serviço.
- **Usuários** — gestão de contas (admin), com login/senha reais.
- **MorningBot** — botão flutuante com assistente que responde perguntas sobre o sistema e, quando pedido, consulta indicadores reais ou cria um orçamento de verdade.

## 📁 Estrutura

```
├── docker-compose.yml       # Postgres local
├── backend/
│   ├── back.js               # Servidor Express (auth, API genérica, anexos, link público)
│   ├── lib/                  # db.js (pool pg), rateLimit.js
│   ├── routes/                # chat.js (MorningBot)
│   ├── services/              # geminiService.js, assistantTools.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/         # Wizards, modais e UI geral
    │   │   ├── tabs/           # ClientesTab, OrcamentosTab, RelatoriosTab, etc.
    │   │   └── modals/         # ClienteModal, OrcamentoViewModal, etc.
    │   ├── hooks/               # useAuth, useOrcamentos, useContratos, etc.
    │   ├── lib/                  # db.js (cache + API), pdf.js, format.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js
    └── package.json
```

## 🚀 Rodando localmente

### 🐘 Banco de dados

```bash
cp .env.example .env      # defina POSTGRES_PASSWORD
docker compose up -d
```

### ⚙️ Backend

```bash
cd backend
npm install
cp .env.example .env      # PGPASSWORD igual ao POSTGRES_PASSWORD acima, + JWT_SECRET
npm start
```

No primeiro boot, um usuário admin é criado automaticamente (senha aleatória impressa no log, ou defina `ADMIN_SEED_PASSWORD` no `.env`).

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

Integrações externas (Autentique, Meta Ads, MorningBot/Gemini, e-mail/WhatsApp) são opcionais — o sistema funciona sem elas, cada uma só liga quando sua respectiva variável é preenchida no `backend/.env`.
