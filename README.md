# 🗂️ Sistema Comercial — Colodel

Sistema interno de gestão comercial com módulos de orçamentos, contratos, clientes, leads, diagnósticos e relatórios.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 5 |
| Backend | Node.js + Express |
| Storage | `localStorage` |
| Bibliotecas | jsPDF · Chart.js · react-chartjs-2 |
| APIs | BrasilAPI · ViaCEP · Autentique · Nodemailer · CallMeBot |

## 📁 Estrutura

```
├── frontend/
│   ├── src/
│   │   ├── components/         # Wizards, modais e UI geral
│   │   │   ├── tabs/           # ClientesTab, OrcamentosTab, RelatoriosTab, etc.
│   │   │   └── modals/         # ClienteModal, OrcamentoViewModal, etc.
│   │   ├── hooks/              # useAuth, useOrcamentos, useContratos, etc.
│   │   ├── lib/                # db.js, api.js, format.js, contractDocument.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
└── backend/
    ├── back.js                 # Servidor Express
    ├── package.json
    ├── .gitignore
    └── .env.example            # Variáveis de ambiente necessárias
```

## 🚀 Rodando localmente

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

**Login padrão:** `admin` / `colodel`

### ⚙️ Backend (opcional)

Só é necessário para assinatura digital via Autentique, webhooks de contrato, e notificações por e-mail e WhatsApp.

```bash
cd backend
npm install
cp .env.example .env
npm start
```

## ⚙️ Variáveis de Ambiente

```env
# Autentique — assinatura digital
AUTENTIQUE_TOKEN=
APP_TOKEN=
CRIADOR_EMAIL=
WEBHOOK_SECRET=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Nodemailer — e-mail
MAIL_USER=
MAIL_PASS=
MAIL_TO=

# CallMeBot — WhatsApp
WHATSAPP_PHONE=
CALLMEBOT_APIKEY=

PORT=3000
ALLOWED_ORIGIN=http://localhost:5173
```
