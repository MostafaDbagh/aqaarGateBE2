const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Diagnostic endpoint to check email configuration
router.get('/email-config', (req, res) => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    smtp: {
      host: process.env.SMTP_HOST || 'not set',
      port: process.env.SMTP_PORT || 'not set',
      secure: process.env.SMTP_SECURE || 'not set',
      user: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'not set',
      password: process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'not set',
      fromName: process.env.SMTP_FROM_NAME || 'not set',
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY ? '***SET***' : 'NOT SET',
      domain: process.env.MAILGUN_DOMAIN || 'not set',
      fromEmail: process.env.MAILGUN_FROM_EMAIL || 'not set',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY ? '***SET***' : 'NOT SET',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'not set',
    },
    timestamp: new Date().toISOString(),
  };
  
  res.json({
    success: true,
    config,
    message: 'Email configuration check - check smtp.password to ensure SMTP is configured'
  });
});

module.exports = router;

