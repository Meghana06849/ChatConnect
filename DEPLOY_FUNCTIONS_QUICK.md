# Quick Edge Functions Deployment

## 🎯 Easiest Way (Recommended)

### Using Supabase Dashboard UI

1. Open: https://supabase.com/dashboard
2. Select project: `swyhugeyamssgnufaueq`
3. Go to: Functions (left sidebar under Development)
4. For EACH of these 5 functions, click Deploy:
   - rate-limit-auth
   - login-with-id
   - generate-question
   - reset-lovers-pin
   - send-push-notification
5. Wait for ✅ Active status for all 5 functions
6. Done!

---

## 🔧 Alternative: CLI Deployment

### Step 1: Get Supabase Token
- Go to: https://supabase.com/dashboard/account/tokens
- Copy an existing token or create new one

### Step 2: Deploy using token (no browser login needed)
```powershell
$env:SUPABASE_ACCESS_TOKEN='your_token_from_step_1'
npx supabase functions deploy
```

### Step 3: Verify
```powershell
npx supabase functions list
```
All 5 should show as deployed.

---

## ✅ Verification

After deployment, check:

```bash
# Check function status
npx supabase functions list

# Test rate-limit-auth function
curl -X POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/rate-limit-auth \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"check\",\"identifier\":\"test@example.com\"}"

# Expected response: { "success": true, ... }
```

---

## ⏱️ Time Required

- Dashboard UI method: ~15 minutes
- CLI method: ~10 minutes
- Both methods achieve same result

---

## 📍 5 Functions to Deploy

1. **rate-limit-auth** - Prevents brute force attacks (5 attempts per 15 min)
2. **login-with-id** - Enables custom user ID login
3. **generate-question** - AI-generated questions for couple games
4. **reset-lovers-pin** - Secure PIN reset via email
5. **send-push-notification** - Send push notifications to users

All functions already exist in `supabase/functions/` directory - they just need to be deployed.

---

## 🎉 After Deployment

✅ App is ready for production
✅ All security measures in place
✅ WebRTC calls will work
✅ Vault data is secure (RLS enabled)
✅ Rate limiting prevents abuse

---

## ⚠️ If Stuck

1. Try Dashboard UI method (most reliable)
2. Check if you're logged in to Supabase: https://supabase.com/dashboard
3. Verify project ID: swyhugeyamssgnufaueq
4. Check browser console for errors
5. Refer to: DEPLOYMENT_READY_CHECKLIST.md

