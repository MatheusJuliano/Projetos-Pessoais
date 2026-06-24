const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

async function enviarResetSenha({ para, nome, link }) {
  const loja = process.env.STORE_NAME || 'Sistema de Baterias';
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: para,
    subject: `🔑 Redefinição de senha — ${loja}`,
    html: `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4;padding:40px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
<tr><td style="background:linear-gradient(135deg,#1a2a4a,#2a4a8a);padding:32px;text-align:center;">
  <div style="font-size:2.5rem;">🔋</div>
  <h1 style="color:#fff;margin:8px 0 0;font-size:1.3rem;">${loja}</h1>
  <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:.85rem;">Sistema de Controle de Estoque</p>
</td></tr>
<tr><td style="padding:32px 36px;">
  <h2 style="color:#1a2a4a;margin:0 0 12px;">Olá, ${nome}!</h2>
  <p style="color:#555;line-height:1.6;margin:0 0 20px;">
    Recebemos uma solicitação para redefinir a senha da sua conta.
    Clique no botão abaixo para criar uma nova senha:
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${link}" style="background:linear-gradient(135deg,#2a7be4,#1e5fb0);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:1rem;display:inline-block;">
      🔑 Redefinir Senha
    </a>
  </div>
  <p style="color:#888;font-size:.82rem;line-height:1.6;margin:0 0 10px;">
    <strong>⏱ Este link expira em 1 hora.</strong><br>
    Se você não solicitou, ignore este e-mail.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
  <p style="color:#aaa;font-size:.75rem;margin:0;">
    Link direto:<br><span style="color:#2a7be4;word-break:break-all;">${link}</span>
  </p>
</td></tr>
<tr><td style="background:#f8faff;padding:16px 36px;text-align:center;border-top:1px solid #eee;">
  <p style="color:#aaa;font-size:.72rem;margin:0;">© ${new Date().getFullYear()} <strong style="color:#2a7be4;">${loja}</strong></p>
</td></tr>
</table></td></tr></table></body></html>`
  });
}

async function enviarBoasVindas({ para, nome }) {
  const loja = process.env.STORE_NAME || 'Sistema de Baterias';
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: para,
    subject: `✅ Conta criada — ${loja}`,
    html: `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef1f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f4;padding:40px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
<tr><td style="background:linear-gradient(135deg,#1a2a4a,#2a4a8a);padding:32px;text-align:center;">
  <div style="font-size:2.5rem;">🔋</div>
  <h1 style="color:#fff;margin:8px 0 0;font-size:1.3rem;">${loja}</h1>
</td></tr>
<tr><td style="padding:32px 36px;">
  <h2 style="color:#1a2a4a;margin:0 0 12px;">Bem-vindo, ${nome}! 🎉</h2>
  <p style="color:#555;line-height:1.6;">
    Sua conta foi criada com sucesso. Use a opção <strong>"Esqueci minha senha"</strong>
    no login caso precise recuperar o acesso.
  </p>
</td></tr>
<tr><td style="background:#f8faff;padding:16px 36px;text-align:center;border-top:1px solid #eee;">
  <p style="color:#aaa;font-size:.72rem;margin:0;">© ${new Date().getFullYear()} <strong style="color:#2a7be4;">${loja}</strong></p>
</td></tr>
</table></td></tr></table></body></html>`
  });
}

module.exports = { enviarResetSenha, enviarBoasVindas };
