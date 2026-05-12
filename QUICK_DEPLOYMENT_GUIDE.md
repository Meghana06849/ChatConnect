# Quick Deployment Commands

## 1. Install Supabase CLI
```bash
npm install -g supabase
```

## 2. Login to Supabase
```bash
supabase login
```

## 3. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions:
supabase functions deploy rate-limit-auth
supabase functions deploy login-with-id
supabase functions deploy generate-question
supabase functions deploy reset-lovers-pin
supabase functions deploy send-push-notification
```

## 4. Verify Deployment
```bash
# Check deployed functions
supabase functions list
```

## 5. Test Edge Functions
```bash
# Test rate-limit-auth
curl -X POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/rate-limit-auth \
  -H "Content-Type: application/json" \
  -d '{"action":"check","identifier":"test@example.com"}'

# Test login-with-id
curl -X POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/login-with-id \
  -H "Content-Type: application/json" \
  -d '{"custom_user_id":"testuser","password":"testpass"}'
```

## 6. Build & Deploy App
```bash
# Install dependencies
npm install
# or
bun install

# Build production
npm run build
# or
bun run build

# Start development server to test
npm run dev
# or
bun run dev
```

## 7. Deploy to Production
```bash
# This depends on your hosting platform
# For Vercel:
vercel

# For Netlify:
netlify deploy

# For self-hosted:
# Copy dist/ folder to your server
```

---

## Deployment Priority Order

1. **CRITICAL**: Fix Supabase connection (verify project is active)
2. **HIGH**: Deploy edge functions
3. **HIGH**: Execute database migrations
4. **MEDIUM**: Run test suite
5. **MEDIUM**: Deploy to production

---

## Environment Variables Needed

Make sure these are set in your production environment:

```env
VITE_SUPABASE_URL=https://swyhugeyamssgnufaueq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_URL=https://swyhugeyamssgnufaueq.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

---

## Troubleshooting

### Functions not deploying?
```bash
# Check auth token
supabase auth whoami

# Re-login if needed
supabase logout
supabase login
```

### Connection issues?
```bash
# Test Supabase URL
curl https://swyhugeyamssgnufaueq.supabase.co

# Check network
ping supabase.com
```

### Build errors?
```bash
# Clear and rebuild
rm -rf dist node_modules
npm install
npm run build
```
