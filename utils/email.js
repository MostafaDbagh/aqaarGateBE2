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
  // Try port 587 (TLS) for better compatibility on Render.com, fallback to 465 (SSL)
  // Port 587 is more reliable on cloud platforms like Render.com
  let smtpPort = SMTP_PORT ? Number(SMTP_PORT) : FALLBACK_CONFIG.port;
  let smtpSecure = SMTP_SECURE
    ? SMTP_SECURE.toLowerCase() === 'true'
    : FALLBACK_CONFIG.secure;
  
  // For production on Render.com, prefer port 587 with TLS (more reliable) if port not explicitly set
  if (process.env.NODE_ENV === 'production' && !SMTP_PORT) {
    smtpPort = 587;
    smtpSecure = false; // TLS (STARTTLS) instead of SSL
  }
  
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
      minVersion: 'TLSv1.2', // Use TLS 1.2 or higher (not SSLv3)
    },
    // For port 587 (TLS/STARTTLS), we need to allow upgrading connection
    requireTLS: smtpPort === 587,
    connectionTimeout: 30000, // 30 seconds connection timeout
    socketTimeout: 30000, // 30 seconds socket timeout
    greetingTimeout: 30000, // 30 seconds greeting timeout
    debug: process.env.NODE_ENV !== 'production', // Enable debug in development
    logger: process.env.NODE_ENV !== 'production', // Enable logger in development
  });

  transporter.verify((error, success) => {
    if (error) {
      logger.error('SMTP connection verification failed:', {
        host: smtpHost,
        port: smtpPort,
        error: error.message,
        code: error.code,
        environment: process.env.NODE_ENV || 'development',
        isLocalhost: process.env.NODE_ENV !== 'production'
      });
    } else if (success) {
      // Always log SMTP ready status
      logger.error('[SMTP_READY] SMTP server is ready to take messages', {
        host: smtpHost,
        port: smtpPort,
        environment: process.env.NODE_ENV || 'development'
      });
    }
  });

  return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  let mailTransporter;
  try {
    mailTransporter = buildTransporter();
  } catch (transporterError) {
    logger.error('Failed to build SMTP transporter:', {
      error: transporterError.message,
      environment: process.env.NODE_ENV || 'development'
    });
    throw transporterError;
  }

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

  // Add timeout wrapper to prevent hanging
  // Increased timeout for production (Render.com can be slow with SMTP)
  const EMAIL_TIMEOUT = process.env.NODE_ENV === 'production' ? 30000 : 15000; // 30 seconds for production, 15 for dev
  const timeoutSeconds = EMAIL_TIMEOUT / 1000; // Convert to seconds for error message
  
  try {
    return await Promise.race([
      mailTransporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Email send timeout after ${timeoutSeconds} seconds`)), EMAIL_TIMEOUT)
      )
    ]);
  } catch (error) {
    // Get SMTP config for error details
    const smtpHost = process.env.SMTP_HOST || FALLBACK_CONFIG.host;
    const smtpPort = process.env.SMTP_PORT || FALLBACK_CONFIG.port;
    const smtpUser = process.env.SMTP_USER || FALLBACK_CONFIG.user;
    const smtpPassword = process.env.SMTP_PASSWORD || FALLBACK_CONFIG.password;
    
    // Enhanced error logging with more diagnostic info
    const errorDetails = {
      to,
      subject,
      error: error.message,
      errorCode: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      environment: process.env.NODE_ENV || 'development',
      isLocalhost: process.env.NODE_ENV !== 'production',
      smtpHost: smtpHost || 'not set',
      smtpPort: smtpPort || 'not set',
      smtpUser: smtpUser ? `${smtpUser.substring(0, 3)}***` : 'not set',
    };
    
    // Enhanced logging for production errors
    if (process.env.NODE_ENV === 'production') {
      logger.error('[PRODUCTION_EMAIL_ERROR] Critical email failure in production:', {
        to,
        error: error.message,
        errorCode: error.code,
        responseCode: error.responseCode,
        smtpHost,
        smtpPort,
        hasCredentials: !!(smtpUser && smtpPassword),
      });
    } else {
      errorDetails.stack = error.stack;
      // Log OTP in development for debugging
      if (subject.includes('OTP') || subject.includes('Verification')) {
        logger.error('[LOCALHOST_DEBUG] OTP email failed - check SMTP connection', errorDetails);
      }
    }
    
    logger.error('Error sending email:', errorDetails);
    throw error;
  }
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


