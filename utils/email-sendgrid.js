/**
 * SendGrid Email Service
 * Better international delivery, especially for restricted regions like Syria
 * 
 * Setup:
 * 1. Sign up at https://sendgrid.com
 * 2. Create API key
 * 3. Set environment variable: SENDGRID_API_KEY=your_api_key
 * 4. Set SENDGRID_FROM_EMAIL=noreply@aqaargate.com
 */

const sgMail = require('@sendgrid/mail');
const logger = require('./logger');

const sendOtpEmailSendGrid = async ({ to, otp, type }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not set in environment variables');
  }

  sgMail.setApiKey(apiKey);

  const subject = type === 'forgot_password'
    ? 'Aqaar Gate Password Reset OTP'
    : 'Aqaar Gate Verification Code';

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@aqaargate.com';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Aqaar Gate';

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

  const msg = {
    to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    logger.error('[EMAIL_SUCCESS] SendGrid email sent successfully', { to, type });
    return true;
  } catch (error) {
    logger.error('SendGrid email error:', {
      to,
      type,
      error: error.message,
      response: error.response?.body,
    });
    throw error;
  }
};

module.exports = {
  sendOtpEmailSendGrid,
};

