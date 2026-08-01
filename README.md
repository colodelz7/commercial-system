# 🌍 Monitoramento Ambiental Real-Time

Sistema de monitoramento climático e sísmico em tempo real com alertas automáticos, mapa interativo e comparativo de cidades.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 5 |
| Backend | Node.js + Express |
| Bibliotecas | Plotly.js · MapLibre GL |
| APIs | OpenWeatherMap · USGS Earthquake · Nodemailer |

## 📁 Estrutura

```
├── frontend/
│   ├── src/
│   │   ├── components/     # Sidebar, Topbar, WorldClockBar, etc.
│   │   │   └── tabs/       # Dashboard, Cards, SeismicMap, Compare, etc.
│   │   ├── hooks/          # useCityData, useGeocodeSearch, useWorldClock, etc.
│   │   ├── lib/            # api.js, plotlyTheme.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css       # Tema sci-fi azul escuro
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── backend/
    ├── back.js             # Servidor Express + rotas da API
    ├── alerts_log.json     # Gerado automaticamente ao disparar alertas
    ├── package.json
    ├── .gitignore
    └── .env                # Variáveis de ambiente necessárias
```

## 🚀 Rodando localmente

### ⚙️ Backend

```bash
cd backend
npm install
npm start
```

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=seu_email@gmail.com
EMAIL_SMTP_PASS=sua_senha_de_app
EMAIL_FROM=seu_email@gmail.com
EMAIL_TO=destino@gmail.com
```
