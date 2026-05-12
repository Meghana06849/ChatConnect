# ChatConnect - Deployment Ready Checklist

## ✅ FIXED ISSUES

### 1. **Supabase Connection Configuration** ✅
**Status**: VERIFIED  
**Location**: `src/integrations/supabase/client.ts`

The client is correctly configured to use environment variables:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
```

**Verification**: ✅ Using env vars, not hardcoded

---

### 2. **Environment Variables Setup** ✅
**Status**: VERIFIED  
**Location**: `.env` file in root directory

```env
VITE_SUPABASE_URL="https://swyhugeyamssgnufaueq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_URL="https://swyhugeyamssgnufaueq.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Verification**: ✅ All vars present

---

### 3. **WebRTC STUN/TURN Configuration** ✅
**Status**: VERIFIED  
**Location**: `src/hooks/useWebRTCCall.ts`

```typescript
const WEBRTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};
```

**Verification**: ✅ 5 STUN servers configured for WebRTC

---

### 4. **Vault Data Security - RLS Policies** ✅
**Status**: VERIFIED  
**Location**: `supabase/migrations/20251117170957_e4d9b701-6d44-4e2b-895c-4dcec1dab78f.sql`

**RLS Policies Enabled**:
- ✅ `Users can view own vault items` - Users can only see their own OR partner's items
- ✅ `Users can create vault items` - Only user_id can insert
- ✅ `Users can update own vault items` - Only owners/partners can update
- ✅ `Users can delete own vault items` - Only owners can delete

**Verification**: 
```sql
-- Check RLS is enabled
SELECT rowsecurity FROM pg_tables WHERE tablename = 'vault_items';
-- Should return: true

-- Check policies exist
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'vault_items';
-- Should return: 4
```

---

### 5. **PIN Verification Security** ✅
**Status**: VERIFIED  
**Location**: `src/components/dreamroom/LoveVault.tsx`

Uses RPC function for constant-time comparison:
```typescript
const { data: valid, error } = await supabase.rpc('verify_lovers_pin', { 
  _pin: pin,
  _user_id: user.id 
});
```

**Verification**: ✅ PIN verified via RPC (prevents timing attacks)

---

## 🚀 REMAINING DEPLOYMENT STEPS

### Step 1: Verify Supabase Project is Active ⚠️
**Action Required**: Check Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Verify your project `swyhugeyamssgnufaueq` is:
   - ✅ Active (not paused)
   - ✅ Accessible (not deleted)
   - ✅ Accessible from your region

**Test Connection**:
```bash
# From your terminal
curl https://swyhugeyamssgnufaueq.supabase.co
# Should return a response (not ERR_NAME_NOT_RESOLVED)
```

---

### Step 2: Deploy Edge Functions ⚠️
**Action Required**: Deploy to Supabase

**Functions to Deploy**:
1. `rate-limit-auth` - Rate limiting for authentication attempts
2. `login-with-id` - Login endpoint with custom ID support
3. `generate-question` - AI-generated question endpoint
4. `reset-lovers-pin` - PIN reset functionality
5. `send-push-notification` - Push notification service

**Deployment Commands**:
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy

# Or deploy specific function:
supabase functions deploy rate-limit-auth
supabase functions deploy login-with-id
supabase functions deploy generate-question
supabase functions deploy reset-lovers-pin
supabase functions deploy send-push-notification
```

**Verification**:
1. Go to Supabase Dashboard → Functions
2. Verify all 5 functions show status: "Active"
3. Check execution logs for any errors

---

### Step 3: Execute Database Migrations ⚠️
**Action Required**: Run migrations in Supabase SQL Editor

**Key Migrations** (if not already executed):
1. `20260506_setup_rls_isolation.sql` - RLS policies for stories/relationships
2. `20260506_helper_functions.sql` - RPC helper functions
3. `20251117170957_e4d9b701-6d44-4e2b-895c-4dcec1dab78f.sql` - Vault items table
4. `20260511120000_fix_call_realtime_channels.sql` - Call realtime configuration

**How to Execute**:
1. Go to Supabase Dashboard → SQL Editor
2. Create new query for each migration file
3. Copy & paste the SQL content
4. Click "Run"
5. Verify no errors appear

---

### Step 4: Verify Realtime Channels Configuration ⚠️
**Status**: For Call Features

**Required Setup**:
```sql
-- Ensure call_history has realtime enabled
ALTER TABLE call_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE call_history;

-- Verify realtime subscriptions work
-- Custom channels like "user:{id}:calls" are allowed
-- Verified in: supabase/migrations/20260511120000_fix_call_realtime_channels.sql
```

---

### Step 5: Test All Core Features ⚠️
**Pre-Deployment Testing**:

#### Authentication
- [ ] Signup works
- [ ] Login works
- [ ] Custom User ID login works (login-with-id function)
- [ ] Rate limiting triggers after 5 failed attempts
- [ ] PIN reset works

#### Chat Features
- [ ] Send text messages
- [ ] Send media files
- [ ] Typing indicators appear
- [ ] Message deletion works
- [ ] Screenshot detection works

#### Dream Calls
- [ ] Voice call initiates
- [ ] Video call initiates
- [ ] WebRTC connection established
- [ ] ICE candidates exchanged
- [ ] Audio/video streams working
- [ ] Call ends properly

#### Vault
- [ ] Can add items to vault
- [ ] Can view own vault items
- [ ] Partner can view shared vault items
- [ ] Cannot view other users' vault items
- [ ] PIN protection works
- [ ] Encryption/decryption works

---

## 📋 FINAL DEPLOYMENT CHECKLIST

Before going to production, verify:

- [ ] **Supabase Project**: Active & accessible
- [ ] **Environment Variables**: All set in `.env`
- [ ] **Edge Functions**: All 5 deployed & active
- [ ] **Database Migrations**: All executed
- [ ] **RLS Policies**: Vault & stories have RLS enabled
- [ ] **Realtime Channels**: Configured for calls
- [ ] **STUN Servers**: 5 Google STUN servers configured
- [ ] **Tests Passed**: All core features tested
- [ ] **Security**: No hardcoded credentials in source
- [ ] **Performance**: Load times acceptable

---

## 🔗 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Project URL**: https://swyhugeyamssgnufaueq.supabase.co
- **Supabase CLI Docs**: https://supabase.com/docs/guides/local-development
- **WebRTC Guide**: https://webrtc.org/
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-RLS

---

## 🆘 Troubleshooting

### ERR_NAME_NOT_RESOLVED
**Problem**: Cannot resolve Supabase URL  
**Solution**: 
1. Verify project is active in Supabase Dashboard
2. Check internet connection
3. Try: `curl https://swyhugeyamssgnufaueq.supabase.co`

### Edge Functions Not Responding
**Problem**: Functions return 404 or 5xx errors  
**Solution**:
1. Check function deployment status
2. Review function logs in Supabase Dashboard
3. Verify environment variables in function config

### Vault Data Leak (Seeing Other Users' Data)
**Problem**: RLS policies not working  
**Solution**:
1. Verify RLS enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'vault_items';`
2. Check policies exist and are correct
3. Ensure auth.uid() is available in context

### Calls Not Connecting
**Problem**: WebRTC connection fails  
**Solution**:
1. Check STUN servers are accessible
2. Verify firewall allows WebRTC
3. Check browser console for ICE candidate errors
4. Test with https (required for WebRTC)

---

**Last Updated**: May 12, 2026  
**Status**: Ready for Final Testing ✅
