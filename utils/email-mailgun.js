/**
 * Mailgun Email Service
 * Better international delivery, works with Syria
 * 
 * Setup:
 * 1. Sign up at https://www.mailgun.com
 * 2. Verify your domain or use sandbox domain for testing
 * 3. Get API key from Dashboard → Settings → API Keys
 * 4. Set environment variables:
 *    MAILGUN_API_KEY=your_api_key
 *    MAILGUN_DOMAIN=mg.aqaargate.com (or sandbox domain)
 *    MAILGUN_FROM_EMAIL=noreply@aqaargate.com
 */

const formData = require('form-data');
const Mailgun = require('mailgun.js');
const logger = require('./logger');

const sendOtpEmailMailgun = async ({ to, otp, type }) => {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  
  if (!apiKey || apiKey === '') {
    throw new Error('MAILGUN_API_KEY is not set or empty in environment variables');
  }
  
  if (!domain || domain === '') {
    throw new Error('MAILGUN_DOMAIN is not set or empty in environment variables');
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: apiKey,
  });

  const subject = type === 'forgot_password'
    ? 'Aqaar Gate Password Reset OTP'
    : 'Aqaar Gate Verification Code';

  const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'noreply@aqaargate.com';
  const fromName = process.env.MAILGUN_FROM_NAME || 'Aqaar Gate';

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

  const text = `Your One-Time Password (OTP) is ${otp}. This code will expire in 5 minutes.`;

  const messageData = {
    from: `${fromName} <${fromEmail}>`,
    to: to, // Mailgun accepts string or array
    subject,
    text,
    html,
  };

  try {
    const response = await mg.messages.create(domain, messageData);
    logger.error('[EMAIL_SUCCESS] Mailgun email sent successfully', { 
      to, 
      type, 
      messageId: response.id || response.message || 'unknown'
    });
    return true;
  } catch (error) {
    // Enhanced error logging
    const errorInfo = {
      to,
      type,
      error: error.message,
      status: error.status || error.statusCode,
      details: error.details || error.body || error.message,
    };
    
    // Log full error in development
    if (process.env.NODE_ENV !== 'production') {
      errorInfo.stack = error.stack;
      errorInfo.fullError = error;
    }
    
    logger.error('Mailgun email error:', errorInfo);
    throw error;
  }
};

module.exports = {
  sendOtpEmailMailgun,
};

