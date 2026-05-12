# PowerShell Edge Functions Deployment Script
# For Windows Users

Write-Host "============================================
ChatConnect Edge Functions Deployment
============================================" -ForegroundColor Cyan

Write-Host "`nStep 1: Open Supabase Dashboard" -ForegroundColor Yellow
Write-Host "URL: https://supabase.com/dashboard"
Write-Host "Project ID: swyhugeyamssgnufaueq"

Write-Host "`nStep 2: Navigate to Edge Functions" -ForegroundColor Yellow
Write-Host "- Click on your project in the dashboard"
Write-Host "- Left sidebar → Functions (under Development)"
Write-Host "- You should see your 5 functions listed"

Write-Host "`nStep 3: Functions Location in Project" -ForegroundColor Yellow
Write-Host @"
supabase/functions/
├── rate-limit-auth/
├── login-with-id/
├── generate-question/
├── reset-lovers-pin/
└── send-push-notification/
"@

Write-Host "`nOption A: Deploy Using Supabase Web UI (RECOMMENDED)" -ForegroundColor Green
Write-Host @"
1. Dashboard → Your Project → Functions
2. For each function:
   - Click on the function name
   - Review the code (it's already correct)
   - Click 'Deploy' button
   - Wait for 'Active' status
3. Test by clicking 'Invoke' in each function
"@

Write-Host "`nOption B: Deploy Using CLI" -ForegroundColor Green
Write-Host @"
# Step 1: Manual authentication
npx supabase login

# Step 2: Deploy all functions
npx supabase functions deploy

# Step 3: Or deploy specific function
npx supabase functions deploy rate-limit-auth
npx supabase functions deploy login-with-id
npx supabase functions deploy generate-question
npx supabase functions deploy reset-lovers-pin
npx supabase functions deploy send-push-notification

# Step 4: Verify deployment
npx supabase functions list
"@

Write-Host "`nOption C: Get Supabase Access Token" -ForegroundColor Green
Write-Host @"
If you have trouble with login:

1. Go to: https://supabase.com/dashboard/account/tokens
2. Create new token or copy existing token
3. Run:
   \$env:SUPABASE_ACCESS_TOKEN='your_token_here'
   npx supabase functions deploy
"@

Write-Host "`nFunction Test Endpoints" -ForegroundColor Yellow

Write-Host "`n[1] Rate Limit Auth:" -ForegroundColor Cyan
Write-Host @"
Method: POST
URL: https://swyhugeyamssgnufaueq.supabase.co/functions/v1/rate-limit-auth
Body: {
  ""action"": ""check"",
  ""identifier"": ""user@example.com"",
  ""attemptType"": ""login""
}
"@

Write-Host "`n[2] Login with ID:" -ForegroundColor Cyan
Write-Host @"
Method: POST
URL: https://swyhugeyamssgnufaueq.supabase.co/functions/v1/login-with-id
Body: {
  ""custom_user_id"": ""testuser123"",
  ""password"": ""testpass123""
}
"@

Write-Host "`n[3] Generate Question:" -ForegroundColor Cyan
Write-Host @"
Method: POST
URL: https://swyhugeyamssgnufaueq.supabase.co/functions/v1/generate-question
Body: {
  ""mode"": ""couples"",
  ""difficulty"": ""medium""
}
"@

Write-Host "`n[4] Reset Lovers PIN:" -ForegroundColor Cyan
Write-Host @"
Method: POST
URL: https://swyhugeyamssgnufaueq.supabase.co/functions/v1/reset-lovers-pin
Body: {
  ""user_id"": ""user-uuid-here"",
  ""email"": ""user@example.com""
}
"@

Write-Host "`n[5] Send Push Notification:" -ForegroundColor Cyan
Write-Host @"
Method: POST
URL: https://swyhugeyamssgnufaueq.supabase.co/functions/v1/send-push-notification
Body: {
  ""user_id"": ""user-uuid-here"",
  ""title"": ""Notification Title"",
  ""body"": ""Notification body text""
}
"@

Write-Host "`nVerification Checklist" -ForegroundColor Yellow
Write-Host @"
□ All 5 functions deployed and showing 'Active'
□ No error messages in function logs
□ Can invoke each function from dashboard
□ Test endpoints return successful responses
□ Check browser console for any errors
□ Realtime subscriptions working (for calls)
"@

Write-Host "`nNext Steps" -ForegroundColor Cyan
Write-Host @"
1. Complete the deployment above
2. Run database migrations (if not done):
   - supabase/migrations/20260506_setup_rls_isolation.sql
   - supabase/migrations/20260511120000_fix_call_realtime_channels.sql

3. Test core features:
   - User authentication
   - Chat messaging
   - Dream calls (WebRTC)
   - Vault access

4. Deploy to production when ready
"@

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "For more help, see: DEPLOYMENT_READY_CHECKLIST.md" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan
