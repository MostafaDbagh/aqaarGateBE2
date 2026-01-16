# 📧 Mailgun Setup Guide - Complete Steps

## ⚠️ IMPORTANT: Activate Your Mailgun Account First!

I see your Mailgun account needs activation. **Do this first:**

1. Check your email: `mostafadbagh52@gmail.com`
2. Look for activation email from Mailgun
3. Click the activation link
4. OR click "Resend activation" in Mailgun dashboard

**You cannot send emails until your account is activated!**

---

## Step 1: Get Your Mailgun Credentials

### 1.1 Get API Key

1. Go to: https://app.mailgun.com/settings/api_security
2. Find your API key (you have one: `42b8ce75-c979f0b7`)
3. **Click on the key** to reveal the full API key value
4. **Copy the Private API key** (it will look like: `1234567890abcdef1234567890abcdef-12345678-abcdef12`)
5. ⚠️ **Save this immediately** - you can only see it once!

### 1.2 Get Domain

**Option A: Use Sandbox Domain (Quick Testing)**
1. Go to: https://app.mailgun.com/sending/domains
2. You'll see a sandbox domain like: `sandbox1234567890abcdef.mailgun.org`
3. Copy this domain
4. ⚠️ **Note:** Sandbox domain can only send to authorized recipients (add them in Mailgun dashboard)

**Option B: Add Your Own Domain (Production)**
1. Go to: https://app.mailgun.com/sending/domains
2. Click "Add New Domain"
3. Enter: `mg.aqaargate.com` (or any subdomain)
4. Follow DNS setup instructions (add MX, TXT, CNAME records)
5. Wait for verification (can take 24-48 hours)

**For now, use the Sandbox domain to test quickly!**

---

## Step 2: Add to Local .env File

Open `api/.env` and add these lines at the end:

```bash
# Mailgun Configuration (PRIMARY - Works with Syria & Render.com)
MAILGUN_API_KEY=your_private_api_key_here
MAILGUN_DOMAIN=sandbox1234567890abcdef.mailgun.org
MAILGUN_FROM_EMAIL=noreply@aqaargate.com
MAILGUN_FROM_NAME=Aqaar Gate
```

**Replace:**
- `your_private_api_key_here` → Your actual Mailgun Private API key
- `sandbox1234567890abcdef.mailgun.org` → Your actual sandbox domain

**Example:**
```bash
MAILGUN_API_KEY=1234567890abcdef1234567890abcdef-12345678-abcdef12
MAILGUN_DOMAIN=sandbox-abc123.mailgun.org
MAILGUN_FROM_EMAIL=noreply@aqaargate.com
MAILGUN_FROM_NAME=Aqaar Gate
```

---

## Step 3: Add to Render.com (Production)

### 3.1 Go to Render.com Dashboard

1. Open: https://dashboard.render.com
2. Click on your service: **aqaargatebe2**
3. Click on **"Environment"** tab (at the top)

### 3.2 Add Mailgun Variables

Click **"Add Environment Variable"** and add these **ONE BY ONE**:

#### Variable 1: MAILGUN_API_KEY
- **Key:** `MAILGUN_API_KEY`
- **Value:** `your_private_api_key_here` (paste your actual API key)
- Click **"Save"**

#### Variable 2: MAILGUN_DOMAIN
- **Key:** `MAILGUN_DOMAIN`
- **Value:** `sandbox1234567890abcdef.mailgun.org` (your sandbox domain)
- Click **"Save"**

#### Variable 3: MAILGUN_FROM_EMAIL
- **Key:** `MAILGUN_FROM_EMAIL`
- **Value:** `noreply@aqaargate.com`
- Click **"Save"**

#### Variable 4: MAILGUN_FROM_NAME (Optional)
- **Key:** `MAILGUN_FROM_NAME`
- **Value:** `Aqaar Gate`
- Click **"Save"**

### 3.3 Verify Variables Are Added

You should see all 4 variables in the list:
- ✅ `MAILGUN_API_KEY` = `***` (hidden)
- ✅ `MAILGUN_DOMAIN` = `sandbox-xxx.mailgun.org`
- ✅ `MAILGUN_FROM_EMAIL` = `noreply@aqaargate.com`
- ✅ `MAILGUN_FROM_NAME` = `Aqaar Gate`

---

## Step 4: Deploy on Render.com

1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"**
3. Wait 2-3 minutes for deployment to complete

---

## Step 5: Test Email Sending

### 5.1 Test from Localhost

```bash
cd api
node scripts/test-email.js your-email@example.com
```

**Expected output:**
```
✅ Mailgun: SUCCESS - Email sent!
```

### 5.2 Test from Production

```bash
curl -X POST https://aqaargatebe2.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","type":"signup"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "OTP sent successfully for email verification"
}
```

### 5.3 Check Render.com Logs

1. Go to Render.com → Your service → **Logs** tab
2. Look for: `[EMAIL_SUCCESS] OTP email sent successfully via Mailgun` ✅

---

## Step 6: Authorize Recipients (Sandbox Domain Only)

⚠️ **Important:** If using sandbox domain, you must authorize recipients first!

1. Go to: https://app.mailgun.com/sending/domains
2. Click on your sandbox domain
3. Go to **"Authorized Recipients"** tab
4. Click **"Add Recipient"**
5. Add email addresses you want to test with
6. Check your email and click the authorization link

**After authorization, emails will work!**

---

## Troubleshooting

### Issue: "MAILGUN_API_KEY is not set"
**Fix:** Make sure you added the variable in Render.com and redeployed

### Issue: "Account not activated"
**Fix:** Check your email and activate your Mailgun account

### Issue: "Domain not found"
**Fix:** Make sure `MAILGUN_DOMAIN` matches exactly (no spaces, correct spelling)

### Issue: "Recipient not authorized" (Sandbox)
**Fix:** Add recipient email in Mailgun dashboard → Authorized Recipients

### Issue: Email not arriving
**Fix:** 
1. Check spam folder
2. If using sandbox, make sure recipient is authorized
3. Check Render.com logs for errors

---

## Quick Checklist

- [ ] Mailgun account activated
- [ ] API key copied (Private API key)
- [ ] Domain copied (sandbox or verified)
- [ ] Added to local `.env` file
- [ ] Added to Render.com environment variables
- [ ] Redeployed on Render.com
- [ ] Tested email sending
- [ ] Checked Render.com logs for success
- [ ] Received email in inbox

---

## Next Steps After Setup

1. **Test with sandbox domain first** (quick setup)
2. **Add your own domain** for production (better deliverability)
3. **Monitor email delivery** in Mailgun dashboard
4. **Check Render.com logs** for any issues

---

**Status:** Ready to set up Mailgun
**Priority:** High - Will fix production email timeout issues

