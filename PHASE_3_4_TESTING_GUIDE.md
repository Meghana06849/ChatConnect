# ChatConnect - Phase 4 Testing Guide

**Date**: May 6, 2026  
**Status**: ✅ PHASE 3 & 4 READY FOR TESTING  
**Test Server**: http://localhost:8082

---

## 🎯 Testing Overview

This guide covers comprehensive testing across:
1. ✅ **Error Boundaries** - Component error handling
2. ✅ **Loading Indicators** - UX during async operations
3. ✅ **Input Sanitization** - Security validation
4. ✅ **Feature Testing** - All app features
5. ✅ **Mobile Testing** - Responsive design
6. ✅ **Multi-Account Testing** - Multiple user scenarios

---

## 📋 Test Environment Setup

### Prerequisites
- [ ] Dev server running on http://localhost:8082
- [ ] Modern browser (Chrome, Firefox, Safari, Edge)
- [ ] Browser DevTools open (F12)
- [ ] Supabase credentials configured in .env.local
- [ ] Test accounts ready (2-3 test emails)

### Browsers to Test
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

---

## 🔴 CRITICAL: Supabase Connection Check

### Before Testing Anything:
```
1. Navigate to http://localhost:8082
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for any errors about Supabase connection
5. Should see: No ERR_NAME_NOT_RESOLVED errors
```

**If you see `ERR_NAME_NOT_RESOLVED`:**
- ❌ Stop testing
- ✅ Fix Supabase credentials in .env.local
- ✅ Restart `npm run dev`

---

## 🧪 Phase 1: Error Boundary Testing

### Test 1.1: Error Boundary Displays
**Steps:**
1. Navigate to app homepage
2. Open browser console (F12 → Console tab)
3. Paste and execute:
   ```javascript
   throw new Error('Test error for ErrorBoundary');
   ```
4. Verify: Error UI appears instead of app crashing

**Expected Result**: 🟢
- Error UI displayed with:
  - ❌ Icon
  - Error message
  - "Refresh Page" button
  - "Try Again" button
  - "Go to Home" button
- App doesn't completely crash
- Console shows error logged

### Test 1.2: Error Recovery
**Steps:**
1. With error UI displayed, click "Try Again" button
2. Verify: App returns to normal state

**Expected Result**: 🟢
- App recovers gracefully
- No error UI visible
- Can continue using app

### Test 1.3: Page Refresh
**Steps:**
1. With error UI displayed, click "Refresh Page" button
2. Verify: Page reloads completely

**Expected Result**: 🟢
- Page reloads
- App works normally
- No persistent errors

---

## 📊 Phase 2: Loading Indicators Testing

### Test 2.1: Authentication Loading
**Steps:**
1. Go to Sign In page
2. Enter email and password
3. Click "Sign In" button
4. Verify loading state

**Expected Result**: 🟢
- Button shows spinner icon
- Button text changes (if configured)
- Button is disabled
- Cannot click multiple times

### Test 2.2: Loading Completes
**Steps:**
1. Wait for authentication to complete
2. Verify loading indicator disappears

**Expected Result**: 🟢
- Spinner stops
- Button becomes clickable again
- User logged in (redirected to dashboard)

### Test 2.3: Failed Operation Loading
**Steps:**
1. Try invalid login credentials
2. Watch loading indicator
3. Verify error toast appears

**Expected Result**: 🟢
- Loading stops when error occurs
- Error message shows
- Can retry operation

---

## 🔐 Phase 3: Input Sanitization Testing

### Test 3.1: Email Sanitization
**Steps:**
1. Go to Sign Up page
2. Try to enter email with malicious content:
   - `test@example.com<script>alert('xss')</script>`
   - `test@example.com" onclick="alert('xss')"`
   - `<test@example.com>`
3. Verify email is sanitized

**Expected Result**: 🟢
- Malicious characters removed or escaped
- Email field shows safe version
- No JavaScript execution
- No console errors

### Test 3.2: User ID Sanitization
**Steps:**
1. Go to Sign Up page
2. Try User ID with special characters:
   - `user<script>`
   - `user@domain`
   - `user$pecial`
   - `user'; DROP TABLE`
3. Verify only alphanumeric, underscore, hyphen allowed

**Expected Result**: 🟢
- Invalid characters rejected
- Only a-z, 0-9, _, - allowed
- No XSS possible
- Input field cleaned

### Test 3.3: Display Name Sanitization
**Steps:**
1. Sign up with display name:
   - `John<script>alert('xss')</script>`
   - `John" onclick="alert('xss')"`
   - `John\"><img src=x onerror=alert('xss')>`
2. Create account
3. Navigate to profile
4. Verify display name is safe

**Expected Result**: 🟢
- HTML tags removed/escaped
- JavaScript cannot execute
- Display name shows as plain text
- No XSS in DOM

### Test 3.4: Form Validation
**Steps:**
1. Try invalid inputs:
   - Empty email
   - Invalid email format (no @, no domain)
   - Too short password (<6 chars)
   - Invalid User ID format
2. Verify error messages

**Expected Result**: 🟢
- Clear error messages
- Form doesn't submit
- Can fix and resubmit

---

## 🚀 Phase 4: Feature Testing

### Test 4.1: Authentication Flow

#### 4.1.1: Sign Up
**Steps:**
1. Go to http://localhost:8082
2. Click "Sign Up" tab
3. Fill form:
   - User ID: `testuser123`
   - Display Name: `Test User`
   - Email: `test1@example.com`
   - Password: `TestPassword123`
4. Click "Sign Up" button
5. Wait for confirmation

**Expected Result**: 🟢
- Success toast appears
- User ID confirmed in message
- User logged in
- Redirected to dashboard

#### 4.1.2: Sign In with Email
**Steps:**
1. Sign out (if logged in)
2. Go to Sign In page
3. Select "Email" tab
4. Enter email and password
5. Click "Sign In"

**Expected Result**: 🟢
- Logs in successfully
- Redirected to dashboard
- No errors in console

#### 4.1.3: Sign In with User ID
**Steps:**
1. Sign out (if logged in)
2. Go to Sign In page
3. Select "User ID" tab
4. Enter user ID and password
5. Click "Sign In"

**Expected Result**: 🟢
- Logs in successfully
- Redirected to dashboard
- No errors in console

### Test 4.2: Rate Limiting
**Steps:**
1. Go to Sign In page
2. Try login 5 times with wrong password
3. On 5th attempt, verify rate limit kicks in

**Expected Result**: 🟢
- After 5 failed attempts
- Error message: "Too many login attempts"
- Cannot attempt more logins
- Message shows cooldown time
- After cooldown, can try again

### Test 4.3: Dashboard Loading
**Steps:**
1. Log in successfully
2. Verify dashboard loads
3. Check all sections load:
   - Friend list
   - Chat area
   - Love coins display
   - Daily streak

**Expected Result**: 🟢
- Dashboard loads completely
- No blank sections
- All data displays
- No console errors

### Test 4.4: Story Creation
**Steps:**
1. On dashboard, locate story creation section
2. Try creating general story
3. Try creating lovers story
4. Verify both create successfully

**Expected Result**: 🟢
- Story creation works
- Mode selection required
- Confirmation message shown
- Story appears in feed

### Test 4.5: Relationship Flow
**Steps:**
1. Search for another user
2. Send friend request
3. Accept request (from other account)
4. Verify relationship status shows "active"

**Expected Result**: 🟢
- Friend request sent
- Status shows "pending"
- Accept button works
- Status changes to "active"

### Test 4.6: Vault Access
**Steps:**
1. Go to Dream Room
2. Click "Love Vault"
3. Enter PIN (default: 1234 or configured)
4. Verify vault unlocks

**Expected Result**: 🟢
- Vault requires PIN
- PIN verification works
- Vault items display
- Can add new items

### Test 4.7: Push Notifications
**Steps:**
1. On user 1: Send friend request to user 2
2. On user 2: Check for notification
3. Verify notification appears (if permissions granted)

**Expected Result**: 🟢
- Notification received (if browser allows)
- Shows friend request details
- Can accept from notification

### Test 4.8: Love Coins System
**Steps:**
1. Daily login: Check coins earned
2. Perform activities: Check coins updates
3. Spend coins: Buy items
4. Verify balance updates

**Expected Result**: 🟢
- Login bonus awarded
- Streak increments
- Coins update in real-time
- Balance never negative

---

## 📱 Phase 5: Mobile Testing

### Test 5.1: Responsive Layout - iPhone
**Steps:**
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Select iPhone SE
4. Test navigation:
   - Can tap all buttons
   - Menus open/close properly
   - No horizontal scroll needed

**Expected Result**: 🟢
- Layout adapts to mobile width
- All buttons tappable
- No overflow or hidden elements
- Text readable (not too small)

### Test 5.2: Responsive Layout - iPad
**Steps:**
1. In Device Toolbar, select iPad
2. Test layout with larger screen
3. Verify tablet-optimized view

**Expected Result**: 🟢
- Layout optimizes for tablet
- Content properly distributed
- Navigation adapted for larger screen

### Test 5.3: Touch Interactions
**Steps:**
1. Stay in mobile view
2. Test touch interactions:
   - Tap buttons
   - Swipe navigation
   - Scroll lists
   - Tap input fields

**Expected Result**: 🟢
- All touch events work
- No hover effects needed
- Buttons easy to tap
- No accidental double-taps

### Test 5.4: Mobile Performance
**Steps:**
1. Open DevTools → Performance tab
2. Record while navigating
3. Check performance metrics

**Expected Result**: 🟢
- Load time < 3 seconds
- FCP (First Contentful Paint) < 1.5s
- LCP (Largest Contentful Paint) < 2.5s
- CLS (Cumulative Layout Shift) < 0.1

### Test 5.5: Keyboard on Mobile
**Steps:**
1. In mobile view, tap input field
2. Verify keyboard appears
3. Type text
4. Test auto-focus behavior

**Expected Result**: 🟢
- Keyboard appears/disappears correctly
- Input fields auto-focus
- Text entry works smoothly
- Scroll adjusts for keyboard

---

## 👥 Phase 6: Multi-Account Testing

### Test 6.1: Two Accounts
**Steps:**
1. Open two browser windows/tabs
2. Account 1: Sign in as `test1@example.com`
3. Account 2: Sign in as `test2@example.com`
4. Verify both logged in separately

**Expected Result**: 🟢
- Both accounts logged in
- Separate data for each
- No data mixing
- Both have unique sessions

### Test 6.2: Relationship Between Accounts
**Steps:**
1. Account 1: Send friend request to Account 2
2. Account 2: See request in notifications
3. Account 2: Accept request
4. Account 1: See acceptance

**Expected Result**: 🟢
- Request sent from Account 1
- Account 2 receives request
- Accept works
- Both see status change
- Data stays synchronized

### Test 6.3: Shared Content Access
**Steps:**
1. Account 1: Create "Lovers" story
2. Account 2: Try to view story (if not partners)
3. Accept relationship (as partners)
4. Account 2: Now can see story

**Expected Result**: 🟢
- Without relationship: Story hidden
- After relationship: Story visible
- Access control enforced at DB level
- Cannot bypass with frontend changes

### Test 6.4: Privacy - General Stories
**Steps:**
1. Account 1: Create "General" story
2. Account 2: Try to view story
3. Account 3 (another user): Try to view

**Expected Result**: 🟢
- Only Account 1 sees their own general stories
- Account 2 cannot see
- Account 3 cannot see
- Privacy fully enforced

### Test 6.5: Data Isolation
**Steps:**
1. Log in to Account 1
2. Check browser storage (F12 → Storage/Application)
3. Log in to Account 2
4. Verify storage doesn't mix

**Expected Result**: 🟢
- localStorage doesn't mix data
- sessionStorage isolated
- Cookies properly scoped
- No data leakage between accounts

### Test 6.6: Concurrent Operations
**Steps:**
1. Account 1: Create story
2. Account 2: Send message (simultaneously)
3. Account 1: Update profile (simultaneously)
4. Verify all complete without conflicts

**Expected Result**: 🟢
- No race conditions
- All operations complete
- No data corruption
- No "stale" data issues

---

## 📝 Test Results Template

### For Each Test:
```
Test: [Test Name]
Result: [ ] PASS [ ] FAIL [ ] SKIP
Notes: [Any observations]
Browser: [Chrome/Firefox/Safari/Edge]
Device: [Desktop/iPhone/iPad/Android]
Screenshot: [If needed]
```

---

## ✅ Sign-Off Checklist

### All Tests Passed?
- [ ] All error boundary tests pass
- [ ] All loading indicator tests pass
- [ ] All input sanitization tests pass
- [ ] All feature tests pass
- [ ] All mobile tests pass
- [ ] All multi-account tests pass

### No Console Errors?
- [ ] No JavaScript errors
- [ ] No network errors
- [ ] No security warnings
- [ ] No deprecation warnings

### Performance OK?
- [ ] Page loads < 3 seconds
- [ ] No jank/stuttering
- [ ] Smooth animations
- [ ] Responsive interactions

### Mobile OK?
- [ ] iPhone responsive ✅
- [ ] Android responsive ✅
- [ ] iPad responsive ✅
- [ ] Touch interactions work ✅

### Security OK?
- [ ] No XSS vulnerabilities
- [ ] Input sanitization working
- [ ] Rate limiting active
- [ ] No data leaks between accounts

---

## 🐛 Bug Report Template

If you find a bug:

```
Title: [Brief description]
Steps to Reproduce:
1. [First step]
2. [Second step]
3. [Expected result]

Actual Result: [What happened]
Expected Result: [What should happen]
Severity: [Critical/High/Medium/Low]
Browser: [Chrome/Firefox/etc]
Device: [Desktop/Mobile/etc]
Screenshot/Video: [Attached]
Console Errors: [If any]
```

---

## 🎯 Quick Test Sequence

If short on time, run this minimum test:

1. **Sign Up** - Create new account ✅
2. **Sign In** - Log back in ✅
3. **Error Test** - Trigger error in console ✅
4. **Mobile Test** - Toggle device toolbar ✅
5. **Two Accounts** - Open new window/tab ✅
6. **Relationship** - Send/accept friend request ✅
7. **Stories** - Create general + lovers ✅
8. **Privacy** - Verify privacy working ✅

**Time**: ~15 minutes
**Coverage**: 80% of critical functionality

---

## 🚀 Go Live Criteria

**Only deploy if:**
- ✅ All tests pass
- ✅ No critical bugs found
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Multi-account working
- ✅ Privacy enforced
- ✅ Performance acceptable

---

## 📚 Test Evidence

Document your testing:
- [ ] Screenshots of passing tests
- [ ] Browser console showing no errors
- [ ] DevTools performance metrics
- [ ] Test results checklist signed off
- [ ] Bug reports (if any)

---

**Start Testing**: http://localhost:8082 🚀  
**Test Report Due**: After all phases complete  
**Deployment Gate**: ✅ Testing must pass before deployment
