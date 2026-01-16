# 🚨 Production Email Not Working - Debugging Guide

## Problem
- ✅ OTP emails work on **localhost**
- ❌ OTP emails **NOT working on production** (aqaargate.com)

## Most Common Causes

### 1. Missing Environment Variables on Production
Production server might not have SMTP credentials in `.env` file.

**Check production server:**
```bash
# SSH into production server
# Check if .env exists
ls -la api/.env

# Check SMTP variables
cat api/.env | grep SMTP
```

**Required variables:**
```bash
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@aqaargate.com
SMTP_PASSWORD=Ca34@Dmh56
SMTP_FROM_EMAIL=noreply@aqaargate.com
SMTP_FROM_NAME=Aqaar Gate
NODE_ENV=production
```

### 2. Production Server Not Restarted
Code changes require server restart.

**Restart production server:**
```bash
# If using PM2
pm2 restart your-app-name

# Or restart your server
npm start
```

### 3. Firewall/Network Blocking SMTP
Production server might be blocked from connecting to `smtp.titan.email`.

**Test SMTP connection from production:**
```bash
# SSH into production server
cd api
node scripts/test-email.js your-email@example.com
```

### 4. Different .env File
Production might be using different environment variables than localhost.

**Verify:**
- Check production `.env` file
- Compare with localhost `.env`
- Make sure SMTP credentials match

### 5. SMTP Server Blocking Production IP
Titan Email might have blocked your production server IP.

**Check:**
- Titan Email dashboard for IP restrictions
- Check if production IP is whitelisted
- Check for any security alerts

## Immediate Fix Steps

### Step 1: Check Production Logs
```bash
# SSH into production server
pm2 logs your-app-name | grep EMAIL

# Look for:
[SMTP_READY] ✅ SMTP ready
[EMAIL_SUCCESS] ✅ Email sent
[PRODUCTION_EMAIL_ERROR] ❌ Email failed
SMTP connection verification failed ❌
```

### Step 2: Verify Environment Variables
```bash
# On production server
cd api
node -e "console.log('SMTP_HOST:', process.env.SMTP_HOST)"
node -e "console.log('SMTP_USER:', process.env.SMTP_USER)"
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
```

### Step 3: Test SMTP Connection
```bash
# On production server
cd api
node scripts/test-email.js your-real-email@yourdomain.com
```

### Step 4: Restart Production Server
```bash
pm2 restart your-app-name
# or
systemctl restart your-service
```

## Quick Fix: Add SMTP to Production .env

If `.env` is missing or incomplete on production:

1. **SSH into production server**
2. **Navigate to API directory:**
   ```bash
   cd /path/to/api
   ```
3. **Create/Edit `.env` file:**
   ```bash
   nano .env
   # or
   vi .env
   ```
4. **Add SMTP configuration:**
   ```bash
   SMTP_HOST=smtp.titan.email
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=noreply@aqaargate.com
   SMTP_PASSWORD=Ca34@Dmh56
   SMTP_FROM_EMAIL=noreply@aqaargate.com
   SMTP_FROM_NAME=Aqaar Gate
   NODE_ENV=production
   ```
5. **Restart server:**
   ```bash
   pm2 restart your-app-name
   ```

## Alternative: Use Mailgun for Production

If SMTP continues to fail on production, use Mailgun:

1. Sign up at https://www.mailgun.com
2. Get API key and domain
3. Add to production `.env`:
   ```bash
   MAILGUN_API_KEY=your_key
   MAILGUN_DOMAIN=your_domain.mailgun.org
   MAILGUN_FROM_EMAIL=noreply@aqaargate.com
   ```
4. Restart server

## Debugging Checklist

- [ ] Production `.env` file exists
- [ ] SMTP credentials are set in production `.env`
- [ ] Production server has been restarted
- [ ] SMTP connection test works from production server
- [ ] No firewall blocking port 465
- [ ] Titan Email account is active
- [ ] Production IP is not blocked
- [ ] Check production logs for errors

## Check Production Logs

Look for these messages:

**Success:**
```
[SMTP_READY] SMTP server is ready to take messages
[EMAIL_SUCCESS] OTP email sent successfully via SMTP
```

**Failure:**
```
SMTP connection verification failed
[PRODUCTION_EMAIL_ERROR] Critical email failure
Error sending email
```

## Most Likely Issue

**Missing or incorrect `.env` file on production server.**

Production server needs the same SMTP credentials as localhost.

---

**Status:** 🔴 Production email not working
**Action:** Check production `.env` file and restart server

