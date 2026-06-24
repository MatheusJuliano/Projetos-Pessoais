# 🔋 Sistema de Controle de Estoque de Baterias — v3.0

Sistema profissional com backend Node.js, banco de dados SQLite real, login seguro e recuperação de senha por e-mail.

---

## ✅ Requisitos

- **Node.js 18+** — Baixe em: https://nodejs.org
- Conexão com internet (para envio de e-mails)

---

## 🚀 Instalação (Passo a Passo)

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar o arquivo .env
Copie o arquivo de exemplo e edite com seus dados:
```bash
cp .env.example .env
```

Abra o `.env` e configure:

```env
SESSION_SECRET=qualquer-texto-longo-e-aleatorio-aqui

EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_de_app_aqui   ← não é a senha do Gmail!

APP_URL=http://localhost:3000       ← mude para seu domínio em produção
STORE_NAME=Baterias Matheus Juliano
```

### 3. Configurar Senha de App do Gmail

> ⚠️ O Gmail **não aceita** sua senha normal. Você precisa criar uma "Senha de App":
> 
> 1. Acesse https://myaccount.google.com
> 2. Segurança → Verificação em duas etapas (ative se não tiver)
> 3. Segurança → Senhas de app → crie uma para "E-mail / Windows/Mac"
> 4. Cole a senha gerada (16 letras) em `EMAIL_PASS` no `.env`

### 4. Iniciar o sistema
```bash
npm start
```

Acesse: **http://localhost:3000**

---

## 🔒 Segurança implementada

| Recurso | Como funciona |
|---|---|
| **Senhas** | Bcrypt com 12 rounds (impossível reverter) |
| **Sessões** | Cookie HTTPOnly + SameSite Strict, salvas em SQLite |
| **Rate limit** | Máx. 20 tentativas de login por 15 min por IP |
| **Tokens de reset** | SHA-256 aleatório, expira em 1 hora, uso único |
| **Headers HTTP** | Helmet bloqueia XSS, clickjacking, MIME sniffing |
| **Banco de dados** | SQLite com WAL mode e foreign keys |
| **Enumeração** | Recuperação de senha não revela se e-mail existe |

---

## ☁️ Hospedagem gratuita recomendada

### Opção 1 — Railway (mais fácil)
1. Crie conta em https://railway.app
2. Clique em "New Project" → "Deploy from GitHub"
3. Suba o código no GitHub e conecte
4. Adicione as variáveis do `.env` em "Variables"
5. Pronto! URL gerada automaticamente

### Opção 2 — Render
1. Crie conta em https://render.com
2. "New Web Service" → conecte GitHub
3. Build command: `npm install`
4. Start command: `npm start`
5. Adicione as variáveis de ambiente

### ⚠️ Em produção, mude no .env:
```env
NODE_ENV=production
APP_URL=https://seusite.railway.app
SESSION_SECRET=string-muito-longa-e-aleatoria-de-verdade
```

---

## 📁 Estrutura de arquivos

```
baterias-backend/
├── src/
│   ├── server.js          ← Servidor principal
│   ├── database.js        ← Banco de dados SQLite
│   ├── routes/
│   │   ├── auth.js        ← Login, registro, reset de senha
│   │   └── estoque.js     ← CRUD do estoque
│   ├── middleware/
│   │   └── auth.js        ← Proteção de rotas
│   └── utils/
│       └── email.js       ← Envio de e-mails
├── public/
│   ├── index.html         ← Sistema principal
│   ├── login.html         ← Tela de login
│   ├── registro.html      ← Criar conta
│   ├── esqueci-senha.html ← Solicitar reset
│   ├── redefinir-senha.html ← Nova senha
│   ├── css/               ← Estilos
│   ├── js/                ← Scripts do frontend
│   └── libs/              ← jsPDF
├── data/                  ← Banco de dados (criado automaticamente)
├── .env.example           ← Template de configuração
├── package.json
└── README.md
```

---

## 💾 Backup dos dados

O banco de dados fica em `data/baterias.db`. Faça backup deste arquivo regularmente.

Para exportar CSV dos dados, use o botão "Gerar Relatório Excel" no sistema.

