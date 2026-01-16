# 🔧 Localhost Email Issue - OTP Not Working on Localhost

## Problem
- ✅ OTP emails work on production (aqaargate.com)
- ❌ OTP emails NOT working on localhost

## Common Causes

### 1. Missing Environment Variables on Localhost
Your localhost `.env` file might be missing SMTP credentials.

**Check your `.env` file in `api/` folder:**
```bash
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@aqaargate.com
SMTP_PASSWORD=Ca34@Dmh56
SMTP_FROM_EMAIL=noreply@aqaargate.com
SMTP_FROM_NAME=Aqaar Gate
```

### 2. Network/Firewall Blocking SMTP
Localhost might be blocked from connecting to `smtp.titan.email`.

**Test SMTP connection:**
```bash
cd api
node scripts/test-email.js your-email@example.com
```

**Check logs for:**
- `SMTP connection verification failed` - Connection blocked
- `Error sending email` - Check error message

### 3. SMTP Server Restrictions
Titan Email might block connections from localhost IPs.

**Solutions:**
1. Use a VPN or different network
2. Use Mailgun for localhost (see below)
3. Check Titan Email dashboard for IP restrictions

### 4. Different .env Files
Production and localhost might have different `.env` files.

**Verify:**
- Check `api/.env` exists
- Check `api/.env.local` exists
- Make sure SMTP credentials are set

## Quick Fixes

### Fix 1: Add SMTP Credentials to Localhost .env
```bash
# In api/.env (localhost)
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@aqaargate.com
SMTP_PASSWORD=Ca34@Dmh56
SMTP_FROM_EMAIL=noreply@aqaargate.com
```

### Fix 2: Use Mailgun for Localhost (Recommended)
Mailgun works better from localhost.

1. Sign up at https://www.mailgun.com (free tier)
2. Get sandbox domain
3. Add to `api/.env`:
```bash
MAILGUN_API_KEY=your_key_here
MAILGUN_DOMAIN=sandbox1234567890abcdef.mailgun.org
MAILGUN_FROM_EMAIL=noreply@aqaargate.com
```

4. Restart localhost server

### Fix 3: Console Log OTP in Development (Temporary)
For testing, you can log OTP to console instead of sending email.

**In `api/controllers/auth.controller.js`, add:**
```javascript
// For localhost development - log OTP to console
if (process.env.NODE_ENV !== 'production') {
  console.log('🔐 OTP for', normalizedEmail, ':', otp);
}
```

## Testing

### Test SMTP Connection:
```bash
cd api
node scripts/test-email.js your-real-email@yourdomain.com
```

### Check Logs:
```bash
# Look for these messages:
[SMTP_READY] SMTP server is ready to take messages ✅
[EMAIL_SUCCESS] OTP email sent successfully via SMTP ✅

# Or errors:
SMTP connection verification failed ❌
Error sending email ❌
```

## Debugging Steps

1. **Check .env file exists:**
   ```bash
   ls -la api/.env
   ```

2. **Verify SMTP credentials:**
   ```bash
   cat api/.env | grep SMTP
   ```

3. **Test SMTP connection:**
   ```bash
   cd api
   node scripts/test-email.js your-email@example.com
   ```

4. **Check server logs:**
   - Look for `[SMTP_READY]` or `SMTP connection verification failed`
   - Check error messages

5. **Try Mailgun:**
   - Sign up for free account
   - Use sandbox domain
   - Add credentials to `.env`
   - Restart server

## Most Likely Issue

**Missing or incorrect `.env` file on localhost.**

Make sure `api/.env` has:
```bash
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@aqaargate.com
SMTP_PASSWORD=Ca34@Dmh56
```

Then restart your localhost server.

---

**Status:** 🔧 Debugging localhost email issue
**Action:** Check .env file and SMTP credentials on localhost

