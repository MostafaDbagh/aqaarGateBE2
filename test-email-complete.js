/**
 * Complete email test - tests both SMTP and SendGrid
 */

require('dotenv').config();
require('dotenv').config({ path: './sendgrid.env' });

const { sendOtpEmail } = require('./utils/email');
const { sendOtpEmailSendGrid } = require('./utils/email-sendgrid');

const testEmail = process.argv[2] || 'test@example.com';
const testOTP = '123456';

async function testSMTP() {
  console.log('\n📧 Testing SMTP (smtp.titan.email)...');
  try {
    await sendOtpEmail({
      to: testEmail,
      otp: testOTP,
      type: 'signup'
    });
    console.log('✅ SMTP email sent successfully');
    return true;
  } catch (error) {
    console.log('❌ SMTP failed:', error.message);
    return false;
  }
}

async function testSendGrid() {
  console.log('\n📧 Testing SendGrid...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️  SENDGRID_API_KEY not set, skipping SendGrid test');
    return null;
  }
  
  try {
    await sendOtpEmailSendGrid({
      to: testEmail,
      otp: testOTP,
      type: 'signup'
    });
    console.log('✅ SendGrid email sent successfully');
    return true;
  } catch (error) {
    console.log('❌ SendGrid failed:', error.message);
    if (error.response?.body) {
      console.log('   Details:', JSON.stringify(error.response.body, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('📧 Complete Email Service Test');
  console.log('='.repeat(60));
  console.log(`Test Email: ${testEmail}`);
  console.log(`Test OTP: ${testOTP}`);
  
  const smtpResult = await testSMTP();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
  const sendGridResult = await testSendGrid();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`SMTP: ${smtpResult ? '✅ Working' : '❌ Failed'}`);
  console.log(`SendGrid: ${sendGridResult === null ? '⚠️  Not configured' : sendGridResult ? '✅ Working' : '❌ Failed'}`);
  
  if (smtpResult && sendGridResult) {
    console.log('\n✅ Both email services are working!');
  } else if (sendGridResult) {
    console.log('\n✅ SendGrid is working (SMTP failed, but SendGrid will be used as fallback)');
  } else if (smtpResult) {
    console.log('\n⚠️  Only SMTP is working (SendGrid not configured or failed)');
  } else {
    console.log('\n❌ Both email services failed. Check your configuration.');
  }
}

runTests().catch(console.error);


