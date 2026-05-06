# ChatConnect - Quick Fixes Implementation Guide

## 🔴 CRITICAL FIX #1: Supabase Connection

### Problem
```
ERR_NAME_NOT_RESOLVED: https://swyhugeyamssgnufaueq.supabase.co
```

### Solution

#### Step 1: Check Supabase Project Status
1. Go to https://supabase.com/dashboard
2. Select your ChatConnect project
3. Check if project status is "Active" (green)
4. If paused, click "Resume project"
5. Copy the correct project URL from Settings → General

#### Step 2: Create .env File

Create file: `ChatConnect/.env.local`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
```

To get your keys:
1. Go to Supabase Dashboard
2. Click "Settings" → "API"
3. Copy "Project URL" and "anon public key"

#### Step 3: Update Supabase Client

File: `src/integrations/supabase/client.ts`

Replace with:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

#### Step 4: Restart Dev Server
```bash
npm run dev
```

---

## 🟠 CRITICAL FIX #2: Vault Items User Filter

### Problem
The vault is returning items from ALL users instead of just the current user.

### Solution

File: `src/components/dreamroom/LoveVault.tsx`

Find this code around line 103:
```typescript
// ❌ WRONG - No user filter
const { data, error } = await supabase
  .from('vault_items')
  .select('*')
  .order('created_at', { ascending: false });
```

Replace with:
```typescript
// ✅ CORRECT - Filter by user
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  setItems([]);
  setLoading(false);
  return;
}

const { data, error } = await supabase
  .from('vault_items')
  .select('*')
  .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
  .order('created_at', { ascending: false });
```

---

## 🟠 CRITICAL FIX #3: Secure PIN Verification

### Problem
Plain-text PIN comparison is a security risk.

### Solution

File: `src/components/dreamroom/LoveVault.tsx`

Find this code around line 64:
```typescript
// ❌ WRONG - Plain text comparison
const verifyPin = async () => {
  try {
    const { data: valid, error } = await supabase.rpc('verify_lovers_pin', { _pin: pin });
    
    // Fallback to plain-text check
    let isValid = !error && valid;
    if (!isValid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('dream_room_pin')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      isValid = profile?.dream_room_pin === pin;  // ← SECURITY RISK
    }
```

Replace with:
```typescript
// ✅ CORRECT - Use RPC only
const verifyPin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive"
      });
      return;
    }

    // Use RPC for secure comparison
    const { data: valid, error } = await supabase.rpc('verify_lovers_pin', { 
      _pin: pin,
      _user_id: user.id 
    });

    if (error) throw error;

    if (valid) {
      setIsPinVerified(true);
      sessionStorage.setItem('vault_pin', pin);
      fetchItems();
      toast({
        title: "Vault Unlocked 🔓",
        description: "Your private vault is now accessible"
      });
    } else {
      toast({
        title: "Wrong PIN",
        description: "Please check your PIN and try again",
        variant: "destructive"
      });
    }
  } catch (e) {
    toast({
      title: "Error",
      description: "Could not verify PIN",
      variant: "destructive"
    });
  }
};
```

---

## 🟠 FIX #4: Deploy Edge Functions

### Problem
Edge functions are not deployed or accessible.

### Solution

```bash
# 1. Ensure you're in the ChatConnect directory
cd ChatConnect

# 2. Deploy each function
supabase functions deploy rate-limit-auth
supabase functions deploy login-with-id
supabase functions deploy generate-question
supabase functions deploy send-push-notification

# 3. Check deployment status
supabase functions list

# 4. View logs for any errors
supabase functions logs rate-limit-auth
supabase functions logs login-with-id
```

### If deployment fails:
```bash
# Check if Supabase CLI is connected
supabase projects list

# If not, link your project
supabase link

# Then try deploying again
supabase functions deploy rate-limit-auth
```

---

## 🟡 FIX #5: File Upload Validation

### Problem
File upload validation is incomplete.

### Solution

File: `src/components/profile/VerificationRequest.tsx`

Find the `handleFileChange` function and replace with:

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validation constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    toast({
      title: "File too large",
      description: "Maximum file size is 5MB",
      variant: "destructive"
    });
    setDocumentFile(null);
    return;
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast({
      title: "Invalid file type",
      description: "Only JPG, PNG, and PDF files are allowed",
      variant: "destructive"
    });
    setDocumentFile(null);
    return;
  }

  // Check file extension
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    toast({
      title: "Invalid file extension",
      description: "File extension does not match file type",
      variant: "destructive"
    });
    setDocumentFile(null);
    return;
  }

  // All checks passed
  setDocumentFile(file);
  toast({
    title: "File selected",
    description: `${file.name} is ready to upload`,
  });
};
```

---

## 🟡 FIX #6: Fix Love Coins Race Condition

### Problem
Coins might not load if user ID hasn't been set yet.

### Solution

File: `src/contexts/LoveCoinsContext.tsx`

Find the `useEffect` blocks and replace with:

```typescript
useEffect(() => {
  const initializeCoins = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Load coins
      const { data, error } = await supabase
        .from('profiles')
        .select('love_coins')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setCoins(data.love_coins || 100);
      }

      // Check daily streak
      const today = new Date().toISOString().split('T')[0];
      const storedStreak = localStorage.getItem(streakStorageKey);
      const storedLastLogin = localStorage.getItem(lastLoginStorageKey);

      if (storedStreak) {
        setDailyStreak(parseInt(storedStreak));
      }
      if (storedLastLogin) {
        setLastLoginDate(storedLastLogin);
      }
    } catch (error) {
      console.error('Error initializing coins:', error);
    } finally {
      setLoading(false);
    }
  };

  initializeCoins();
}, []); // Only run once on mount
```

---

## 🟢 OPTIONAL FIX #7: Add Error Boundary

### Problem
If a component crashes, entire app crashes.

### Solution

Create file: `src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            </div>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <p className="text-sm text-gray-500 font-mono bg-gray-100 p-3 rounded mb-4">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Then wrap your app in `src/App.tsx`:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* Your existing app content */}
    </ErrorBoundary>
  );
}
```

---

## 🧪 TESTING CHECKLIST

After fixes, test these:

- [ ] App loads without errors
- [ ] Can sign up with email
- [ ] Can log in with email
- [ ] Can log in with user ID
- [ ] Can create general stories
- [ ] Can create lovers stories
- [ ] Can view only own general stories
- [ ] Can create relationships
- [ ] Rate limiting works
- [ ] Vault only shows own items
- [ ] PIN verification works
- [ ] File uploads work
- [ ] Push notifications work
- [ ] App works on mobile
- [ ] No console errors

---

## 📋 DEPLOYMENT CHECKLIST (After Fixes)

- [ ] .env.local file created with correct credentials
- [ ] Supabase client updated with env variables
- [ ] All edge functions deployed
- [ ] Vault items query has user filter
- [ ] PIN verification uses RPC only
- [ ] File upload validation complete
- [ ] All tests passing
- [ ] No console errors
- [ ] Tested on multiple devices
- [ ] Tested with multiple accounts

---

## ⏱️ Quick Fix Timeline

1. **Supabase Connection Fix** - 15 min
2. **Environment Variables** - 5 min
3. **Edge Functions Deploy** - 10 min
4. **Database Query Fixes** - 10 min
5. **Security Fixes** - 10 min
6. **Testing** - 30 min

**Total: ~1.5 hours**

---

## 🚀 After Fixes

```bash
# 1. Make all fixes above
# 2. Run tests
npm run dev

# 3. Test all features
# 4. Check console for errors
# 5. Test on mobile
# 6. Then deploy!
```

---

**Status**: Ready to fix and deploy ✅
