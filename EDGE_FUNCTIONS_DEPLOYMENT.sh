#!/bin/bash
# Manual Edge Functions Deployment Guide
# Since CLI login requires browser interaction, here's the step-by-step process:

echo "==========================================
ChatConnect Edge Functions Deployment Guide
=========================================="

echo "
Step 1: Open Supabase Dashboard
URL: https://supabase.com/dashboard
Project ID: swyhugeyamssgnufaueq

Step 2: Navigate to Edge Functions
- Click on your project
- Left sidebar → Functions (under Development)
- You should see 5 functions to deploy

Step 3: Deploy Each Function
The functions are already in your project at:
  - supabase/functions/rate-limit-auth/
  - supabase/functions/login-with-id/
  - supabase/functions/generate-question/
  - supabase/functions/reset-lovers-pin/
  - supabase/functions/send-push-notification/

Step 4: Deployment Options

OPTION A - Using Supabase Web UI:
1. Go to Supabase Dashboard → Functions
2. For each function:
   - Click 'Deploy' button
   - Review the code
   - Click 'Deploy' to confirm
3. Verify deployment status (should show 'Active')

OPTION B - Using Supabase CLI (After Auth):
npx supabase login
npx supabase functions deploy

OPTION C - Alternative: Use Supabase API Token
If you have a Supabase access token:
export SUPABASE_ACCESS_TOKEN=your_token_here
npx supabase functions deploy

Step 5: Verify Deployment
In Supabase Dashboard:
1. Functions page should show all 5 functions as 'Active'
2. Click each function to view deployment logs
3. Test by clicking 'Invoke' button in each function

Step 6: Test Each Function

TEST rate-limit-auth:
POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/rate-limit-auth
Body: {
  \"action\": \"check\",
  \"identifier\": \"test@example.com\",
  \"attemptType\": \"login\"
}

TEST login-with-id:
POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/login-with-id
Body: {
  \"custom_user_id\": \"testuser123\",
  \"password\": \"testpass123\"
}

TEST generate-question:
POST https://swyhugeyamssgnufaueq.supabase.co/functions/v1/generate-question
Body: {
  \"mode\": \"couples\",
  \"difficulty\": \"medium\"
}

Step 7: Check Function Logs
1. Dashboard → Functions → [Function Name]
2. View 'Invocations' tab
3. Check for any errors

=========================================="
