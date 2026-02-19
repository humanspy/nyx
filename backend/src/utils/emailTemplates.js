const BASE_URL = process.env.APP_URL || 'https://nyx.spygroup.dev';

const wrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d14;margin:0;padding:0}
  .wrap{max-width:560px;margin:40px auto;background:#16161e;border-radius:12px;overflow:hidden;border:1px solid #2a2a3a}
  .header{background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:32px 40px;text-align:center}
  .header h1{color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px}
  .body{padding:36px 40px;color:#c9cdd4;font-size:15px;line-height:1.7}
  .body h2{color:#e8eaf0;font-size:18px;font-weight:700;margin:0 0 16px}
  .btn{display:inline-block;margin:20px 0;padding:12px 32px;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px}
  .footer{padding:20px 40px;background:#111118;text-align:center;font-size:12px;color:#505060}
  .code{font-family:monospace;font-size:28px;font-weight:900;letter-spacing:6px;color:#a78bfa;text-align:center;padding:20px;background:#0d0d14;border-radius:8px;margin:16px 0}
  .warn{font-size:12px;color:#505060;margin-top:16px}
</style>
</head>
<body><div class="wrap">
  <div class="header"><h1>NYX</h1></div>
  <div class="body">${content}</div>
  <div class="footer">nyx.spygroup.dev · <a href="${BASE_URL}/privacy" style="color:#6366f1">Privacy Policy</a></div>
</div></body></html>`;

export function verifyEmailTemplate({ username, token }) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  return {
    subject: 'Verify your NYX email address',
    html: wrap(`
      <h2>Verify your email</h2>
      <p>Hi <strong>${username}</strong>, thanks for joining NYX.</p>
      <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
      <a class="btn" href="${url}">Verify Email</a>
      <p class="warn">If you didn't create a NYX account, you can safely ignore this email.</p>
    `),
    text: `Verify your NYX email: ${url}`,
  };
}

export function passwordResetTemplate({ username, token }) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  return {
    subject: 'Reset your NYX password',
    html: wrap(`
      <h2>Password reset</h2>
      <p>Hi <strong>${username}</strong>, we received a request to reset your password.</p>
      <p>Click below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a class="btn" href="${url}">Reset Password</a>
      <p class="warn">If you didn't request this, your password has not been changed. You can safely ignore this email.</p>
    `),
    text: `Reset your NYX password: ${url}`,
  };
}

export function welcomeTemplate({ username }) {
  return {
    subject: 'Welcome to NYX',
    html: wrap(`
      <h2>Welcome to NYX, ${username}!</h2>
      <p>Your account is ready. NYX is a private, end-to-end encrypted communication platform.</p>
      <p>Your messages, files, and calls are encrypted — even we can't read them.</p>
      <a class="btn" href="${BASE_URL}">Open NYX</a>
    `),
    text: `Welcome to NYX, ${username}! Open the app at ${BASE_URL}`,
  };
}

export function platformBanTemplate({ username, reason }) {
  return {
    subject: 'Your NYX account has been suspended',
    html: wrap(`
      <h2>Account suspended</h2>
      <p>Hi <strong>${username}</strong>, your NYX account has been suspended by a platform administrator.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is a mistake, contact <a href="mailto:admin@spygroup.dev" style="color:#6366f1">admin@spygroup.dev</a>.</p>
    `),
    text: `Your NYX account has been suspended. Reason: ${reason || 'Not specified'}`,
  };
}
