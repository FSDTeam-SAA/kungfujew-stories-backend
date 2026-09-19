const nodemailer = require("nodemailer");

/**
 * Creates and configures the Nodemailer transporter based on environment variables.
 */
function createTransporter() {
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const secure = process.env.EMAIL_SECURE === "true" || port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a branded password reset email with the reset URL.
 * Falls back to console logging in development if SMTP credentials are not configured.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - Recipient user name
 * @param {string} params.resetUrl - Full URL to the password reset page
 * @returns {Promise<boolean>}
 */
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || '"Car Carrier Group" <no-reply@carcarriergroup.com>';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background-color: #0a192f; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
        .content { padding: 40px; color: #1e293b; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
        .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 28px; }
        .button-wrapper { text-align: center; margin: 36px 0; }
        .btn { background-color: #0d2861; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(13, 40, 97, 0.2); }
        .btn:hover { background-color: #091b42; }
        .link-fallback { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 24px; word-break: break-all; font-size: 12px; color: #64748b; }
        .notice { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
        .footer { background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Car Carrier Group</h1>
          <p>Security & Administrative Access</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || "Administrator"},</div>
          <div class="message">
            We received a request to reset your password for your Car Carrier Group account.
            Click the button below to securely configure a new password:
          </div>
          <div class="button-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <div class="message" style="margin-bottom: 0;">
            If the button above does not open, copy and paste this URL into your browser:
          </div>
          <div class="link-fallback">
            <a href="${resetUrl}" style="color: #0d2861; text-decoration: none;">${resetUrl}</a>
          </div>
          <div class="notice">
            <strong>Security Notice:</strong> This password reset link is valid for <strong>1 hour</strong> and can only be used once. If you did not initiate this request, no action is needed — your account remains secure.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Car Carrier Group. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("\n=======================================================");
    console.log(" [DEV MODE] SMTP not configured in .env (EMAIL_USER / EMAIL_PASS)");
    console.log(` Password reset requested for: ${to}`);
    console.log(` Password Reset Link:\n ${resetUrl}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "Password Reset Request - Car Carrier Group",
      html: htmlContent,
      text: `Hello ${name || "Administrator"},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\nIf you did not request this, you can ignore this email.`,
    });
    console.log(`Password reset email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to deliver email via SMTP:", error);
    // In development or testing, also log the URL so developer is not blocked
    console.log("\n[BACKUP DEV LINK] Reset URL:", resetUrl, "\n");
    return true;
  }
}

module.exports = {
  sendPasswordResetEmail,
};

