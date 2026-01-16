# ✅ How to Verify Production Email After Deployment

## Step 1: Check Diagnostic Endpoint

### Option A: Using Terminal (Mac/Linux)
```bash
curl https://aqaargatebe2.onrender.com/api/diagnostic/email-config
```

### Option B: Using Browser
1. Open your browser
2. Go to: `https://aqaargatebe2.onrender.com/api/diagnostic/email-config`
3. You should see JSON response

### Expected Response (Good ✅):
```json
{
  "success": true,
  "config": {
    "environment": "production",
    "smtp": {
      "host": "smtp.titan.email",
      "port": "465",
      "secure": "true",
      "user": "nor***",
      "password": "***SET***",  // ✅ This should say "***SET***"
      "fromEmail": "noreply@aqaargate.com",
      "fromName": "Aqaar Gate"
    }
  }
}
```

### Bad Response (Problem ❌):
```json
{
  "config": {
    "smtp": {
      "password": "NOT SET"  // ❌ This means environment variables are missing
    }
  }
}
```

---

## Step 2: Check Render.com Logs

### How to Access Logs:
1. Go to https://dashboard.render.com
2. Click on your service: **aqaargatebe2**
3. Click on **"Logs"** tab (at the top)
4. Scroll down to see recent logs

### Look for These Messages:

#### ✅ Good Signs (Email Working):
```
[SMTP_READY] SMTP server is ready to take messages
[EMAIL_SUCCESS] OTP email sent successfully via SMTP
[PRODUCTION_EMAIL_ATTEMPT] Starting email send
```

#### ❌ Bad Signs (Email Not Working):
```
[PRODUCTION_EMAIL_ERROR] CRITICAL - All email attempts failed
SMTP connection verification failed
Failed to send OTP email via SMTP
```

### How to Filter Logs:
1. In Render.com logs, use **Ctrl+F** (or Cmd+F on Mac)
2. Search for: `EMAIL` or `SMTP` or `OTP`
3. This will highlight all email-related messages

---

## Step 3: Test OTP Sending

### Option A: Using Terminal (curl)
```bash
curl -X POST https://aqaargatebe2.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","type":"signup"}'
```

**Replace `your-email@gmail.com` with your real email address**

### Option B: Using Browser (Postman/Thunder Client)
1. Open Postman or Thunder Client
2. Method: **POST**
3. URL: `https://aqaargatebe2.onrender.com/api/auth/send-otp`
4. Headers:
   - `Content-Type: application/json`
5. Body (JSON):
   ```json
   {
     "email": "your-email@gmail.com",
     "type": "signup"
   }
   ```
6. Click **Send**

### Expected Response (Good ✅):
```json
{
  "success": true,
  "message": "OTP sent successfully for email verification",
  "email": "your-email@gmail.com",
  "type": "signup"
}
```

### Then:
1. **Check your email inbox** (and spam folder)
2. You should receive an email with subject: **"Aqaar Gate Verification Code"**
3. The email should contain a 6-digit OTP code

---

## Step 4: Check Your Email Inbox

### Where to Look:
1. **Inbox** - Check your main inbox
2. **Spam/Junk** - Sometimes emails go to spam
3. **Promotions** (Gmail) - Check Promotions tab
4. **Wait 1-2 minutes** - Emails can take a moment to arrive

### Email Should Look Like:
```
Subject: Aqaar Gate Verification Code

Your verification code is: 123456

This code will expire in 5 minutes.
```

---

## Step 5: If Email Doesn't Arrive

### Check Render.com Logs Again:
1. Go to Render.com → Logs
2. Search for: `PRODUCTION_EMAIL_ERROR`
3. Look at the error message - it will tell you what's wrong

### Common Issues:

#### Issue 1: "SMTP connection verification failed"
**Problem:** Can't connect to SMTP server
**Solution:** 
- Check if Render.com blocks port 465
- Try using Mailgun instead (see below)

#### Issue 2: "SMTP password is not defined"
**Problem:** Environment variables not set
**Solution:** 
- Go to Render.com → Environment tab
- Make sure `SMTP_PASSWORD` is set

#### Issue 3: "Email send timeout"
**Problem:** SMTP server too slow
**Solution:** 
- Check Titan Email account status
- Try Mailgun (faster and more reliable)

---

## Alternative: Use Mailgun (If SMTP Fails)

If SMTP doesn't work on Render.com, use Mailgun:

### Setup:
1. Sign up at https://www.mailgun.com (free tier available)
2. Get API key from Dashboard → Settings → API Keys
3. Get domain (use sandbox domain for testing)

### Add to Render.com Environment Variables:
```
MAILGUN_API_KEY = your_private_api_key
MAILGUN_DOMAIN = sandbox1234567890abcdef.mailgun.org
MAILGUN_FROM_EMAIL = noreply@aqaargate.com
```

### Redeploy:
1. Go to Render.com → Manual Deploy
2. Click "Clear build cache & deploy"
3. Wait for deployment
4. Test again

---

## Quick Verification Checklist

- [ ] Diagnostic endpoint shows `"password": "***SET***"`
- [ ] Render.com logs show `[SMTP_READY]`
- [ ] OTP request returns `"success": true`
- [ ] Email arrives in inbox within 2 minutes
- [ ] OTP code is visible in email

---

## Need Help?

If emails still don't work:
1. **Copy the error from Render.com logs**
2. **Check diagnostic endpoint response**
3. **Share both with me** - I can help debug

