

# Fix Plan: 6 Issues in ChatConnect

## 1. Top-Aligned Notification Popup

**Problem:** Toast notifications appear at the bottom by default (Sonner/shadcn default position).

**Fix:**
- Update `src/components/ui/sonner.tsx` to set `position="top-right"` on the Sonner `<Toaster>`.
- Update `src/components/ui/toaster.tsx` to position toasts at the top of the viewport using a top-aligned container class.

---

## 2. Blue Tick Color State Bug

**Problem:** The `HeartReadReceipt` component currently shows blue ticks (`text-blue-400`) for the "seen" state in general mode, but the "delivered" state shows `text-muted-foreground` (gray). The visual difference between "sent" (single gray check) and "delivered" (double gray check) is too subtle -- both look grayish. Users expect blue-tinted ticks for delivered and a brighter blue for seen (WhatsApp-style).

**Fix in `src/components/chat/HeartReadReceipt.tsx`:**
- "sent": single check, gray (`text-muted-foreground`)
- "delivered": double check, light blue (`text-blue-300`)
- "seen": double check, bright blue (`text-blue-500`)
- Lovers mode keeps its existing heart/pink styles for seen

---

## 3. Mobile Responsiveness

**Problem:** The sidebar navigation (`w-16 lg:w-64`) is always visible on mobile, eating screen space. The chat input and header elements need better mobile sizing.

**Fix:**
- In `src/components/layout/ChatLayout.tsx`: Hide the `<Navigation>` sidebar when a contact is selected on mobile (use `useIsMobile` hook).
- In `src/components/layout/Navigation.tsx`: Make the sidebar fully collapsible on mobile viewports -- when `activeSection === 'chats'` and a contact is selected, hide the nav.
- Ensure `ChatHeader` back button shows on mobile (already implemented via `md:hidden`).
- Add responsive padding adjustments to `ChatInterface` message input area.

---

## 4. Delete for Me and Delete for Everyone (Backend Synced)

**Problem:** Currently `deleteMessage` in `useChatActions` always hard-deletes the message from the database (Delete for Everyone behavior). There is no "Delete for Me" option that hides the message only for the current user.

**Fix:**
- Create a new migration adding a `deleted_for` JSONB column (default `[]`) to the `messages` table. This stores an array of user IDs who have soft-deleted the message.
- Update `MessageContextMenu.tsx` to show two separate options for own messages: "Delete for me" and "Delete for everyone". For other users' messages, only show "Delete for me".
- Update `useChatActions.ts`:
  - `deleteForMe(messageId)`: Updates the message's `deleted_for` array by appending the current user's ID (using a JSONB append operation).
  - `deleteForEveryone(messageId)`: Hard-deletes the message from the database (only allowed for sender).
- Update `ChatInterface.tsx` to pass both handlers to `MessageBubble`.
- Update `useEnhancedRealTimeChat` to filter out messages where `deleted_for` contains the current user's ID.

---

## 5. General <-> Lovers Mode Chat Sync

**Problem:** Per the architecture memory, General and Lovers mode are strictly isolated and should NOT share chat history. This is working as designed. However, if the user wants to see the same contacts/chats across both modes, that would require removing mode isolation.

**Clarification needed:** Based on the architecture rules, mode isolation is intentional. The fix here will ensure that when switching modes, the chat list properly reloads to show contacts for the active mode, and any active conversation is properly deselected to avoid showing stale data.

**Fix:**
- In `ChatLayout.tsx`: Reset `selectedContact` to `undefined` when `mode` changes (add a `useEffect` watching `mode`).
- Ensure `ContactsList` re-fetches on mode change (it already depends on the current user, but should refresh).

---

## 6. Dark/Light Toggle Icon in Header

**Problem:** There is no dark/light mode toggle anywhere in the UI. The project has `next-themes` installed and `darkMode: ["class"]` in tailwind config, but no `ThemeProvider` is set up, and no toggle button exists.

**Fix:**
- Wrap the app in `ThemeProvider` from `next-themes` in `src/App.tsx` with `attribute="class"`, `defaultTheme="dark"`.
- Add a Sun/Moon toggle button in `src/components/layout/Navigation.tsx` in the header area (next to "ChatConnect" text) that calls `setTheme()` from `useTheme()`.

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap in `ThemeProvider` from next-themes |
| `src/components/ui/sonner.tsx` | Set `position="top-right"` |
| `src/components/ui/toaster.tsx` | Move toast viewport to top |
| `src/components/chat/HeartReadReceipt.tsx` | Fix delivered/seen tick colors |
| `src/components/layout/ChatLayout.tsx` | Hide nav on mobile when chatting; reset contact on mode switch |
| `src/components/layout/Navigation.tsx` | Add dark/light toggle icon; accept `hideOnMobile` prop |
| `src/components/chat/MessageContextMenu.tsx` | Split delete into "Delete for me" / "Delete for everyone" |
| `src/hooks/useChatActions.ts` | Add `deleteForMe` and `deleteForEveryone` functions |
| `src/components/chat/ChatInterface.tsx` | Pass both delete handlers to MessageBubble |
| `src/components/chat/MessageBubble.tsx` | Accept both delete handler props |
| `src/hooks/useEnhancedRealTimeChat.ts` | Filter messages by `deleted_for` |
| New migration | Add `deleted_for` JSONB column to `messages` table |

