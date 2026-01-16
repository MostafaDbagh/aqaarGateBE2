/**
 * Test Email Sending - Production Hotfix Verification
 * 
 * This script tests the email sending functionality to ensure
 * OTP emails can be delivered properly.
 * 
 * Usage:
 *   node scripts/test-email.js test@example.com
 */

require('dotenv').config();
const logger = require('../utils/logger');

async function testEmailSending() {
  const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';
  const testOtp = '123456';
  
  console.log('\n🧪 Testing Email Sending System...\n');
  console.log(`Test Email: ${testEmail}`);
  console.log(`Test OTP: ${testOtp}\n`);
  
  // Test 1: Mailgun
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    console.log('✅ Testing Mailgun...');
    try {
      const { sendOtpEmailMailgun } = require('../utils/email-mailgun');
      await sendOtpEmailMailgun({ 
        to: testEmail, 
        otp: testOtp, 
        type: 'signup' 
      });
      console.log('✅ Mailgun: SUCCESS - Email sent!\n');
    } catch (error) {
      console.log(`❌ Mailgun: FAILED - ${error.message}\n`);
    }
  } else {
    console.log('⚠️  Mailgun: Not configured (MAILGUN_API_KEY or MAILGUN_DOMAIN missing)\n');
  }
  
  // Test 2: SMTP
  console.log('✅ Testing SMTP...');
  try {
    const { sendOtpEmail } = require('../utils/email');
    await sendOtpEmail({ 
      to: testEmail, 
      otp: testOtp, 
      type: 'signup' 
    });
    console.log('✅ SMTP: SUCCESS - Email sent!\n');
  } catch (error) {
    console.log(`❌ SMTP: FAILED - ${error.message}\n`);
  }
  
  // Test 3: SendGrid (if configured)
  if (process.env.SENDGRID_API_KEY) {
    console.log('✅ Testing SendGrid...');
    try {
      const { sendOtpEmailSendGrid } = require('../utils/email-sendgrid');
      await sendOtpEmailSendGrid({ 
        to: testEmail, 
        otp: testOtp, 
        type: 'signup' 
      });
      console.log('✅ SendGrid: SUCCESS - Email sent!\n');
    } catch (error) {
      console.log(`❌ SendGrid: FAILED - ${error.message}\n`);
    }
  } else {
    console.log('⚠️  SendGrid: Not configured (SENDGRID_API_KEY missing)\n');
  }
  
  console.log('📋 Configuration Summary:');
  console.log(`   Mailgun: ${process.env.MAILGUN_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   SMTP: ${process.env.SMTP_HOST || 'Using fallback (smtp.titan.email)'}`);
  console.log(`   SendGrid: ${process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('\n✅ Test completed!\n');
  
  process.exit(0);
}

// Run test
testEmailSending().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});

