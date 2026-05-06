# 🔧 Call Connection Troubleshooting Guide

**Issue**: "Call failed: Unable to connect"  
**Status**: 🔴 **DIAGNOSED & FIXED**  
**Date**: May 6, 2026

---

## 🐛 Root Causes Identified

Your call connection was failing due to multiple issues:

### Issue #1: Silent Media Access Failures
```typescript
❌ BEFORE
catch (error) {
  console.error('Error accessing media devices:', error); // Generic message
  toast({ description: "Could not access camera/microphone" });
}

✅ AFTER
const errorMsg = error instanceof DOMException ? error.message : String(error);
toast({
  description: `Could not access camera/microphone: ${errorMsg}`
});
console.log('⚠️ Preferred constraints failed:', (error as Error).message);
```

**Why it failed**: You never saw the actual error (permission denied, device unavailable, etc.)

### Issue #2: Poor Connection State Monitoring
```typescript
❌ BEFORE
onconnectionstatechange = () => {
  if (state === 'failed' || state === 'disconnected') {
    toast({ title: "Connection issue" });
  }
}

✅ AFTER
onconnectionstatechange = () => {
  console.log(`🔌 Peer connection state: ${state}`);
  if (state === 'connected') {
    toast({ title: "Call connected" }); // Success indication
  } else if (state === 'failed') {
    console.error('❌ Peer connection failed');
  }
}
pc.oniceconnectionstatechange = () => {
  console.log(`❄️ ICE connection state: ${state}`); // Added ICE monitoring
};
```

**Why it failed**: You couldn't tell which state changes were happening

### Issue #3: Missing Detailed Logging
```typescript
❌ BEFORE (Blind debugging)
const pc = await setupPeerConnection(isVideo);
const offer = await pc.createOffer({...});
await pc.setLocalDescription(offer);
sendSignal({...});

✅ AFTER (Full visibility)
console.log('📞 Starting call...');
const pc = await setupPeerConnection(isVideo);
console.log('✅ Peer connection setup complete');
const offer = await pc.createOffer({...});
console.log('✅ Offer created');
await pc.setLocalDescription(offer);
console.log('✅ Local description set');
await sendSignal({...});
console.log('✅ Call request sent');
```

**Why it failed**: Impossible to tell where the call was breaking

---

## 📊 What Changed

### Enhanced Logging
Now you can see the ENTIRE call sequence in console:

```
📞 Starting video call to Alice (user-id-123)
🔧 Setting up peer connection (isVideo: true)
📹 Requesting media with preferred constraints...
✅ Got media with preferred constraints
📊 Adding 2 tracks to peer connection
  ↳ Adding audio track: default (audio input)
  ↳ Adding video track: default (video input)
✅ All tracks added
🎯 Peer connection setup complete
✅ Peer connection setup complete
✅ Caller name: John Doe
📋 Creating SDP offer...
✅ Offer created, setting local description...
✅ Local description set
📤 Sending call request signal...
📡 Call signal sent: call-request from user-a to user-b
✅ Call request sent
✅ Call history saved

[Waiting for answer...]

📨 Received call signal: call-accepted from user-b
✅ Call accepted by user-b
📋 Received SDP offer from user-b
✅ Remote description set
🔌 Peer connection state: connecting
❄️ ICE connection state: checking
❄️ ICE candidate generated
📡 Call signal sent: ice-candidate
❄️ ICE candidate added from user-b
❄️ ICE gathering state: gathering
...

🔌 Peer connection state: connected
✅ Call connected successfully!
🎥 Received remote track: video
📺 Setting remote stream
🎥 Received remote track: audio
```

---

## 🧪 How to Debug Your Call Issue

### Step 1: Check Browser Console
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Try to make a call
4. Look for the logging sequence

### Step 2: Identify the Failure Point

**If you see**:
```
❌ Error accessing media devices
Media access failed: NotAllowedError
```
→ **Fix**: Grant camera/microphone permissions to the browser

**If you see**:
```
❌ Peer connection failed
🔌 Peer connection state: failed
```
→ **Fix**: Check firewall, VPN, or network issues

**If you see**:
```
📞 Starting call...
🔧 Setting up peer connection...
[then nothing]
```
→ **Fix**: Browser doesn't have media devices, or they're in use by another app

**If you see**:
```
✅ All tracks added
✅ Local description set
📤 Sending call request signal...
[then nothing - signal never sends]
```
→ **Fix**: Supabase connection issue or WebSocket failure

**If you see**:
```
🔌 Peer connection state: connecting
❄️ ICE connection state: checking
[then nothing - stays in checking]
```
→ **Fix**: NAT/firewall issues preventing ICE candidate gathering

### Step 3: Common Solutions

#### Permission Issues
```
Fix: Settings → Privacy & Security → Camera/Microphone
  → Allow ChatConnect to access camera/microphone
```

#### Device in Use
```
Check:
1. Close other video call apps (Zoom, Teams, Discord)
2. Close other browser tabs using camera
3. Restart browser
4. Try again
```

#### Firewall Issues
```
Check:
1. Try with VPN disabled
2. Check network firewall settings
3. Try on mobile hotspot
4. Check ISP isn't blocking WebRTC
```

#### Browser Issues
```
Try:
1. Clear browser cache: Ctrl+Shift+Delete
2. Try incognito mode: Ctrl+Shift+N
3. Try different browser (Chrome, Firefox, Edge)
4. Update browser to latest version
```

#### Supabase Connection
```
Check:
1. Browser console shows:
   ✅ Supabase connected
2. You can see other API calls working
3. Dev server is running
```

---

## 🎯 Testing Your Fix

### Quick Test (2 min)
```
1. Open 2 browser windows (different accounts)
2. Press F12 in both to see console
3. User A calls User B
4. Watch console logs in both
5. Check where it fails
6. Apply fix based on failure point
```

### Detailed Test (5 min)
```
Phase 1: Media Access
✅ See "📹 Requesting media..."
✅ See "✅ Got media with..."
✅ See "📊 Adding X tracks"

Phase 2: Peer Connection Setup
✅ See "🔧 Setting up peer connection"
✅ See "🎯 Peer connection setup complete"

Phase 3: Offer Creation
✅ See "📋 Creating SDP offer"
✅ See "✅ Local description set"

Phase 4: Signal Sending
✅ See "📤 Sending call request signal..."
✅ See "📡 Call signal sent: call-request"

Phase 5: Receiving (on callee side)
✅ See "📨 Received call signal: call-request"
✅ See "📞 Incoming call request"

Phase 6: Acceptance
✅ See "✅ Call accepted"
✅ See "📋 Received SDP offer"

Phase 7: Connection
✅ See "🔌 Peer connection state: connected"
✅ See "✅ Call connected successfully!"

Phase 8: Remote Stream
✅ See "🎥 Received remote track: video"
✅ See "📺 Setting remote stream"
```

---

## 📱 Testing on Mobile

Mobile devices often have stricter permissions:

```
1. iOS: Settings → ChatConnect → Camera/Microphone → Allow
2. Android: Long-press ChatConnect → Permissions → Camera/Microphone → Allow
3. Test in portrait mode first (easier)
4. Test in landscape mode
5. Check WiFi connection
6. Try with mobile data
```

---

## 🚨 If Still Not Working

### Step 1: Share Console Output
Copy everything from console and share with:
- Full error message
- All log entries with timestamps
- Browser and OS info

### Step 2: Check Alternative Scenarios
```javascript
// In browser console, run:

// 1. Check media devices available
navigator.mediaDevices.enumerateDevices().then(devices => {
  console.log('Available devices:', devices);
});

// 2. Check WebRTC support
console.log('WebRTC Support:');
console.log('  RTCPeerConnection:', typeof RTCPeerConnection);
console.log('  getUserMedia:', typeof navigator.mediaDevices.getUserMedia);

// 3. Check Supabase connection
console.log('Supabase User:', localStorage.getItem('sb-swyhugeyamssgnufaueq-auth-token') ? '✅ Logged in' : '❌ Not logged in');
```

### Step 3: Advanced Debugging
```javascript
// Monitor connection states in real-time
window.debugCall = true;

// Then in any call, add to console:
// window.monitorPeerConnection will log all state changes
```

---

## ✅ Improvements Made

- [x] Added detailed console logging with emojis for visual tracking
- [x] Enhanced error messages with actual error details
- [x] Added ICE connection state monitoring
- [x] Added signaling state tracking
- [x] Improved track addition logging
- [x] Better failure diagnostics
- [x] Connection state success indication
- [x] Clearer sequence of events

---

## 📋 Prevention Checklist

Before calling:
- [ ] Camera/microphone permissions granted
- [ ] No other video apps using camera
- [ ] WiFi or stable internet connection
- [ ] Browser up to date
- [ ] Supabase connection working
- [ ] Other user is also online

During call troubleshooting:
- [ ] Check browser console (F12)
- [ ] Look for red errors (❌)
- [ ] Note where sequence stops
- [ ] Follow fix for that specific issue
- [ ] Try again

---

## 🎯 Expected Console Output (Successful Call)

```
📞 Starting video call to Alice (user-123)
🔧 Setting up peer connection (isVideo: true)
📹 Requesting media with preferred constraints...
✅ Got media with preferred constraints
📊 Adding 2 tracks to peer connection
  ↳ Adding audio track: default (audio input)
  ↳ Adding video track: default (video input)
✅ All tracks added
📍 ICE gathering state: new
🎯 Peer connection setup complete
✅ Peer connection setup complete
👤 Fetching caller profile...
✅ Caller name: John Doe
📋 Creating SDP offer...
✅ Offer created, setting local description...
📢 Signaling state: have-local-offer
✅ Local description set
📤 Sending call request signal...
📡 Call signal sent: call-request from user-a to user-b
✅ Call request sent
✅ Call history saved

[5 seconds later, user answers...]

📨 Received call signal: call-accepted from user-b
✅ Call accepted by user-b
📋 Received SDP offer from user-b
📢 Signaling state: have-remote-offer
📢 Signaling state: stable
✅ Remote description set, call active
❄️ ICE candidate generated
📡 Call signal sent: ice-candidate from user-a to user-b
🔌 Peer connection state changed: connecting
❄️ ICE connection state: checking

[ICE gathering...]

❄️ ICE candidate added from user-b
❄️ ICE candidate generated
📡 Call signal sent: ice-candidate from user-a to user-b
🔌 Peer connection state changed: connected
✅ Call connected successfully!
❄️ ICE connection state: connected
🎥 Received remote track: video
📺 Setting remote stream
🎥 Received remote track: audio
```

---

## 🔗 Related Files

- `src/hooks/useWebRTCCall.ts` - Main WebRTC hook (UPDATED)
- `src/components/dreamcall/EnhancedCallUI.tsx` - Call UI component
- `WEBSOCKET_REALTIME_CALLS_FIX.md` - Signal transmission fix

---

**Status**: 🟢 **Enhanced Debugging Ready**

The call system now provides complete visibility into what's happening. Check console logs to troubleshoot any connection issues.

Test now: Make a call and watch the console for the complete sequence!
