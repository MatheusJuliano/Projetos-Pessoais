// ═══════════════════════════════════════════════════════════════
//  mailer.js — Serviço de envio de e-mail com Nodemailer
// ═══════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

let transporter = null;

function criarTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: { rejectUnauthorized: false }
  });

  return transporter;
}

async function enviarEmailRedefinicao(destino, nomeUsuario, token) {
  const appUrl  = process.env.APP_URL || 'http://localhost:3000';
  const link    = `${appUrl}/redefinir-senha.html?token=${token}`;
  const remetente = process.env.MAIL_FROM || 'Sistema Baterias <noreply@baterias.com>';

  const html = `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;padding:0;background:#eef1f4;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2a4a,#2a4a8a);padding:32px;text-align:center;">
              <div style="font-size:2.5rem;margin-bottom:8px;">🔋</div>
              <h1 style="color:white;margin:0;font-size:1.4rem;font-weight:700;">Controle de Estoque de Baterias</h1>
              <p style="color:#a8c0e8;margin:6px 0 0;font-size:0.85rem;">Sistema de Redefinição de Senha</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#333;font-size:1rem;margin:0 0 16px;">Olá, <strong>${nomeUsuario}</strong>!</p>
              <p style="color:#555;font-size:0.92rem;line-height:1.6;margin:0 0 24px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no sistema de controle de estoque.
                Clique no botão abaixo para criar uma nova senha:
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a href="${link}" style="background:linear-gradient(135deg,#2a7be4,#1e5fb0);color:white;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:1rem;font-weight:700;display:inline-block;">
                  🔐 Redefinir Minha Senha
                </a>
              </div>

              <div style="background:#f4f7ff;border-radius:8px;padding:16px;margin:24px 0;">
                <p style="color:#666;font-size:0.8rem;margin:0 0 8px;"><strong>⚠️ Informações importantes:</strong></p>
                <ul style="color:#666;font-size:0.8rem;margin:0;padding-left:18px;line-height:1.8;">
                  <li>Este link expira em <strong>1 hora</strong></li>
                  <li>O link só pode ser usado <strong>uma vez</strong></li>
                  <li>Se você não solicitou, ignore este e-mail</li>
                </ul>
              </div>

              <p style="color:#999;font-size:0.75rem;margin:0;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${link}" style="color:#2a7be4;word-break:break-all;">${link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;padding:20px;text-align:center;border-top:1px solid #e8eef8;">
              <p style="color:#aaa;font-size:0.75rem;margin:0;">
                © 2026 <strong style="color:#2a7be4;">Matheus Juliano</strong> — Sistema de Controle de Estoque de Baterias
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  const t = criarTransporter();
  await t.sendMail({
    from:    remetente,
    to:      destino,
    subject: '🔐 Redefinição de senha — Sistema Baterias',
    html,
    text: `Olá ${nomeUsuario},\n\nClique no link abaixo para redefinir sua senha (válido por 1 hora):\n${link}\n\nSe não solicitou, ignore este e-mail.\n\n© 2026 Matheus Juliano`
  });
}

async function verificarConexao() {
  if (!process.env.MAIL_USER || process.env.MAIL_USER === 'seuemail@gmail.com') {
    console.log('[MAIL] ⚠️  E-mail não configurado no .env — modo simulado ativo.');
    return false;
  }
  try {
    const t = criarTransporter();
    await t.verify();
    console.log('[MAIL] ✅ Conexão SMTP verificada.');
    return true;
  } catch (e) {
    console.log('[MAIL] ⚠️  Falha SMTP:', e.message, '— modo simulado ativo.');
    return false;
  }
}

module.exports = { enviarEmailRedefinicao, verificarConexao };
