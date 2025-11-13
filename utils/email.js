const nodemailer = require('nodemailer');
const logger = require('./logger');

const FALLBACK_CONFIG = {
  host: 'smtp.titan.email',
  port: 465,
  secure: true,
  user: 'noreply@aqaargate.com',
  password: 'Ca34@Dmh56',
  fromEmail: 'noreply@aqaargate.com',
  fromName: 'Aqaar Gate',
};

let transporter;

const buildTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
  } = process.env;

  const smtpHost = SMTP_HOST || FALLBACK_CONFIG.host;
  const smtpPort = SMTP_PORT ? Number(SMTP_PORT) : FALLBACK_CONFIG.port;
  const smtpSecure = SMTP_SECURE
    ? SMTP_SECURE.toLowerCase() === 'true'
    : FALLBACK_CONFIG.secure;
  const smtpUser = SMTP_USER || SMTP_FROM_EMAIL || FALLBACK_CONFIG.user;
  const smtpPassword = SMTP_PASSWORD || FALLBACK_CONFIG.password;
  if (!smtpHost) {
    throw new Error('SMTP host is not defined');
  }

  if (!smtpUser) {
    throw new Error('SMTP user is not defined');
  }

  if (!smtpPassword) {
    throw new Error('SMTP password is not defined');
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      logger.error('SMTP connection failed:', error);
    } else if (success) {
      logger.info('SMTP server is ready to take messages');
    }
  });

  return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  const mailTransporter = buildTransporter();

  const {
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
  } = process.env;

  const fromEmail =
    SMTP_FROM_EMAIL ||
    process.env.SMTP_USER ||
    FALLBACK_CONFIG.fromEmail;
  const fromName = SMTP_FROM_NAME || FALLBACK_CONFIG.fromName;

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  };

  return mailTransporter.sendMail(mailOptions);
};

const sendOtpEmail = async ({ to, otp, type }) => {
  const subject = type === 'forgot_password'
    ? 'Aqaar Gate Password Reset OTP'
    : 'Aqaar Gate Verification Code';

  const plainText = [
    `Your One-Time Password (OTP) is ${otp}.`,
    'This code will expire in 5 minutes.',
    '',
    'If you did not request this code, please ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">${subject}</h2>
      <p style="margin-bottom: 12px;">Hello,</p>
      <p style="margin-bottom: 12px;">
        Your One-Time Password (OTP) is:
      </p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
        ${otp}
      </p>
      <p style="margin-bottom: 12px;">
        This code will expire in 5 minutes. Please do not share this code with anyone.
      </p>
      <p style="margin-top: 24px; color: #64748b;">
        If you did not request this OTP, please ignore this message or contact support.
      </p>
      <p style="margin-top: 24px;">Regards,<br/>Aqaar Gate</p>
    </div>
  `;

  await sendMail({
    to,
    subject,
    text: plainText,
    html,
  });
};

module.exports = {
  sendMail,
  sendOtpEmail,
};


