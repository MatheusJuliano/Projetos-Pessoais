// ═══════════════════════════════════════════════════════════════
//  EMAIL.JS — Envio de e-mail para recuperação de senha
// ═══════════════════════════════════════════════════════════════

const nodemailer = require("nodemailer");

// Cria transporter a partir das variáveis de ambiente (.env ou config.js)
function criarTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function enviarEmailRecuperacao({ para, nome, link }) {
  const transporter = criarTransporter();

  const html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f4f7ff;margin:0;padding:30px;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:14px;
                  box-shadow:0 4px 20px rgba(0,0,0,0.1);overflow:hidden;">
        
        <div style="background:linear-gradient(135deg,#2a7be4,#1e5fb0);padding:28px 32px;text-align:center;">
          <div style="font-size:2.5rem;">🔋</div>
          <h1 style="color:white;margin:8px 0 0;font-size:1.2rem;font-weight:700;">
            Controle de Estoque de Baterias
          </h1>
        </div>

        <div style="padding:32px;">
          <h2 style="color:#1a2a4a;font-size:1.1rem;margin:0 0 12px;">
            Redefinição de Senha
          </h2>
          <p style="color:#555;line-height:1.6;margin:0 0 20px;">
            Olá, <strong>${nome}</strong>!<br><br>
            Recebemos uma solicitação para redefinir a senha da sua conta.
            Clique no botão abaixo para criar uma nova senha:
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" 
               style="background:linear-gradient(135deg,#2a7be4,#1e5fb0);color:white;
                      text-decoration:none;padding:14px 32px;border-radius:8px;
                      font-weight:700;font-size:1rem;display:inline-block;">
              🔑 Redefinir Senha
            </a>
          </div>

          <p style="color:#888;font-size:0.82rem;line-height:1.5;margin:0;">
            ⚠️ Este link expira em <strong>1 hora</strong>.<br>
            Se você não solicitou a redefinição, ignore este e-mail — sua senha continua a mesma.<br><br>
            Por segurança, nunca compartilhe este link com ninguém.
          </p>
        </div>

        <div style="background:#f8faff;padding:16px 32px;text-align:center;
                    border-top:1px solid #eef1f4;">
          <p style="color:#aaa;font-size:0.72rem;margin:0;">
            © 2026 <strong style="color:#2a7be4;">Matheus Juliano</strong> — 
            Sistema de Controle de Estoque de Baterias
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    `"Sistema de Baterias" <${process.env.SMTP_USER}>`,
    to:      para,
    subject: "🔑 Redefinição de Senha — Controle de Baterias",
    html,
  });
}

module.exports = { enviarEmailRecuperacao };
