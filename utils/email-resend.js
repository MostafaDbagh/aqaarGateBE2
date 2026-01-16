/**
 * Resend Email Service
 * HTTP API-based email (no SMTP ports needed)
 * Works perfectly on Render.com and other cloud platforms
 * 
 * Setup:
 * 1. Sign up at https://resend.com (free tier: 3,000 emails/month)
 * 2. Get API key from Dashboard → API Keys
 * 3. Set environment variable: RESEND_API_KEY=your_api_key
 * 4. Set RESEND_FROM_EMAIL=noreply@aqaargate.com
 */

const logger = require('./logger');

const sendOtpEmailResend = async ({ to, otp, type }) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  
  if (!apiKey || apiKey === '') {
    throw new Error('RESEND_API_KEY is not set or empty in environment variables');
  }

  const subject = type === 'forgot_password'
    ? 'Aqaar Gate Password Reset OTP'
    : 'Aqaar Gate Verification Code';

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@aqaargate.com';
  const fromName = process.env.RESEND_FROM_NAME || 'Aqaar Gate';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">${subject}</h2>
      <p style="margin-bottom: 12px;">Hello,</p>
      <p style="margin-bottom: 12px;">
        Your One-Time Password (OTP) is:
      </p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; color: #0f172a;">
        ${otp}
      </p>
      <p style="margin-bottom: 12px;">
        This code will expire in 5 minutes. Please do not share this code with anyone.
      </p>
      <p style="margin-top: 24px; color: #64748b;">
        If you did not request this OTP, please ignore this message or contact support.
      </p>
      <p style="margin-top: 24px;">Regards,<br/>${fromName}</p>
    </div>
  `;

  const text = `Your One-Time Password (OTP) is ${otp}. This code will expire in 5 minutes.`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: html,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Resend API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    logger.error('[EMAIL_SUCCESS] OTP email sent successfully via Resend', {
      email: to,
      type,
      resendId: data.id,
    });

    return data;
  } catch (error) {
    logger.error('Resend email sending failed:', {
      email: to,
      type,
      error: error.message,
    });
    throw error;
  }
};

module.exports = { sendOtpEmailResend };

