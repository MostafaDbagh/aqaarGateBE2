# Email Setup Guide - Fixing OTP Email Delivery Issues for Syria

## ⚠️ Critical Issue
Your emails are being bounced by `smtp-out.flockmail.com`. This prevents users from receiving OTP codes.

## ❌ SendGrid Does NOT Support Syria
**Important:** SendGrid/Twilio no longer supports delivering emails to Syria (as of September 2025). Do NOT use SendGrid if you have Syrian users.

## ✅ Solution: Use Mailgun (Recommended for Syria)

Mailgun works well with Syria and has excellent international delivery.

### Step 1: Sign up for Mailgun
1. Go to https://www.mailgun.com
2. Create a free account (5,000 emails/month free for 3 months, then 1,000/month)
3. Verify your email address

### Step 2: Get API Key and Domain
1. In Mailgun dashboard, go to **Sending** → **Domain Settings**
2. You can use the **Sandbox Domain** for testing (free, but limited)
   - Sandbox domain looks like: `sandbox1234567890abcdef.mailgun.org`
   - Recipients must be authorized in Mailgun dashboard
3. For production, **add your own domain**:
   - Add domain: `mg.aqaargate.com` (or subdomain of your choice)
   - Follow DNS setup instructions (add MX, TXT, CNAME records)
4. Get API Key: **Settings** → **API Keys** → Copy your Private API key

### Step 3: Install Mailgun Package
```bash
cd api
npm install mailgun.js form-data
```

### Step 4: Set Environment Variables

Add these to your `.env` file:

```bash
# Mailgun Configuration (PRIMARY - Works with Syria)
MAILGUN_API_KEY=your_private_api_key_here
MAILGUN_DOMAIN=sandbox1234567890abcdef.mailgun.org  # or your verified domain
MAILGUN_FROM_EMAIL=noreply@aqaargate.com
MAILGUN_FROM_NAME=Aqaar Gate

# SMTP Configuration (FALLBACK - Your current Titan Email)
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@aqaargate.com
SMTP_PASSWORD=your_password_here
SMTP_FROM_EMAIL=noreply@aqaargate.com
SMTP_FROM_NAME=Aqaar Gate

# SendGrid (LAST RESORT - Does NOT work for Syria)
# Only use if you have no Syrian users
SENDGRID_API_KEY=optional_only_if_no_syria_users
SENDGRID_FROM_EMAIL=noreply@aqaargate.com
```

### Step 5: Restart Your Server
```bash
# Stop your server (Ctrl+C)
# Then restart
npm start
# or
pm2 restart your-app-name
```

## Alternative Solutions (If Mailgun Doesn't Work)

### Option 1: Fix Titan Email SMTP (Current Setup)
Your code already uses Titan Email. The issue is `flockmail.com` is bouncing emails.

**Check:**
1. Is `noreply@aqaargate.com` account active in Titan?
2. Is the password correct? (Currently: `Ca34@Dmh56`)
3. Is the account suspended or blocked?
4. Try logging into Titan Email webmail to verify

**If Titan Email works:**
- Make sure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` are set correctly
- The code will use SMTP as primary if Mailgun is not configured

### Option 2: Amazon SES (Works Globally)
Amazon SES supports Syria and is very cheap ($0.10 per 1,000 emails).

1. Sign up at https://aws.amazon.com/ses/
2. Verify your email or domain
3. Get SMTP credentials
4. Use SMTP configuration:
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # or your region
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ses_smtp_username
SMTP_PASSWORD=your_ses_smtp_password
```

### Option 3: Resend (Modern, Good International Support)
1. Sign up at https://resend.com
2. Verify domain
3. Get API key
4. (Would need to add Resend integration code)

### Option 4: Use Regional Middle East Email Provider
Consider email providers based in the Middle East that have fewer restrictions.

## Current Code Priority Order

The code now tries email services in this order:

1. **Mailgun** (if `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set)
   - ✅ Works with Syria
   - ✅ Good international delivery
   - ✅ Free tier available

2. **SMTP** (Titan Email or other SMTP provider)
   - ✅ Your current setup
   - ⚠️ Make sure credentials are correct

3. **SendGrid** (only as last resort)
   - ❌ Does NOT work for Syria
   - Only used if Mailgun and SMTP both fail

## Testing Email Delivery

After setup, test by:
1. Requesting an OTP from your application
2. Check server logs for `[EMAIL_SUCCESS]` messages
3. Check Mailgun dashboard → **Logs** to see sent emails
4. Check spam folder if email doesn't arrive

## Troubleshooting

### Emails still not sending?
1. **Check logs**: Look for `[EMAIL_SUCCESS]` or error messages
2. **Verify Mailgun**: 
   - API key is correct
   - Domain is verified (or using sandbox domain)
   - For sandbox: recipient email must be authorized in Mailgun dashboard
3. **Check SMTP**: 
   - Credentials are correct
   - Account is not suspended
   - Can connect to SMTP server

### Mailgun errors?
- **401 Unauthorized**: API key is wrong
- **403 Forbidden**: Domain not verified or sandbox recipient not authorized
- **400 Bad Request**: Invalid email format or missing required fields

### SMTP errors?
- **Connection timeout**: SMTP server is down or blocked
- **Authentication failed**: Wrong username/password
- **550 Mailbox unavailable**: Email address doesn't exist
- **Bounce from flockmail.com**: Your SMTP provider is rejecting emails

## Production Recommendations

1. **Use Mailgun** as primary (works with Syria)
2. **Verify your own domain** in Mailgun (not just sandbox)
3. **Set up SMTP as fallback** (Titan Email or Amazon SES)
4. **Monitor Mailgun dashboard** for delivery issues
5. **Set up webhooks** to track bounces and spam reports
6. **Use Redis** instead of in-memory storage for OTP (current code uses `global.otpStore`)

## Quick Start (Mailgun Sandbox - For Testing)

1. Sign up at https://www.mailgun.com
2. Use the sandbox domain they provide
3. Go to **Sending** → **Authorized Recipients** → Add test email addresses
4. Add to `.env`:
```bash
MAILGUN_API_KEY=your_key
MAILGUN_DOMAIN=sandbox1234567890abcdef.mailgun.org
```
5. Install: `npm install mailgun.js form-data`
6. Restart server
7. Test OTP sending

## Next Steps

1. ✅ Install Mailgun: `npm install mailgun.js form-data`
2. ✅ Sign up for Mailgun account
3. ✅ Add `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` to `.env`
4. ✅ Restart server
5. ✅ Test OTP sending
6. ✅ Monitor logs and Mailgun dashboard
