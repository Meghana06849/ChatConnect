import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { useCall } from '@/components/features/CallProvider';
import { useChatSettings } from '@/hooks/useChatSettings';
import { useChatActions } from '@/hooks/useChatActions';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useScreenshotDetection } from '@/hooks/useScreenshotDetection';
import { TypingIndicator } from './TypingIndicator';
import { CoupleHubPanel } from './CoupleHubPanel';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { EmojiKeyboard } from './EmojiKeyboard';
import { MediaAttachmentPicker } from './MediaAttachmentPicker';
import { MessageBubble } from './MessageBubble';
import { ChatHeader } from './ChatHeader';
import { ReplyPreview } from './ReplyPreview';
import { ChatSettingsDialog } from './ChatSettingsDialog';
import { DisappearingMessageIndicator } from './DisappearingMessageIndicator';
import { ChatWallpaperUpload } from './ChatWallpaperUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Mic, Heart, Loader2, ChevronDown, Settings, Moon, Sparkles, Gift, Music2, Plus, MoreHorizontal, PauseCircle, ShieldAlert, BarChart3, HandHeart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  selectedContact?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string | null;
    isVerified?: boolean;
    verificationType?: string;
  };
  conversationId?: string;
  onBack?: () => void;
  onDreamRoom?: () => void;
}

interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
  messageType?: string;
}

interface ChatMessageView {
  id: string;
  content: string;
  sender_id: string;
  message_type: string;
  created_at: string;
  read_at?: string | null;
  reactions?: unknown;
  metadata?: Record<string, unknown> | null;
  delivered_at?: string | null;
}

type ReplyMetadata = {
  replyTo?: ReplyInfo;
};

type LoveLevel = 'Crush' | 'Close' | 'Deep Love' | 'Soulmate';

interface LoveState {
  xp: number;
  streak: number;
  lastHugDate: string | null;
  hugsToday: number;
  level: LoveLevel;
}

type ThemePreset = 'galaxy' | 'rainy_night' | 'sunset';
type RomanceAmbienceProfile = 'low' | 'medium' | 'high';

interface WeeklyRecap {
  message_count: number;
  active_chat_minutes: number;
  call_minutes: number;
  total_time_minutes: number;
  surprises_unlocked: number;
  milestones?: {
    first_chat?: string | null;
    first_call?: string | null;
    first_moment?: string | null;
    days_since_first_chat?: number | null;
  };
}

interface CoupleIdentity {
  self?: { nickname?: string; avatar_url?: string };
  partner?: { nickname?: string; avatar_url?: string };
  partner_id?: string;
}

interface CoupleToolsState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  events: Array<{ id: string; title: string; at: string }>;
  budgets: Array<{ id: string; title: string; amount: number }>;
  challenges: Array<{ id: string; title: string; progress: number; target: number; rewardXp: number; completed?: boolean }>;
}

interface SignalItem {
  id: string;
  sender_id: string;
  signal_type: 'miss_you' | 'thinking' | 'busy' | 'tap_sync' | 'location_ping';
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface PresenceItem {
  user_id: string;
  status: 'available' | 'thinking' | 'busy' | 'offline';
  attention: number;
  updated_at: string;
}

const LOVE_LEVELS: Array<{ minXp: number; label: LoveLevel }> = [
  { minXp: 0, label: 'Crush' },
  { minXp: 120, label: 'Close' },
  { minXp: 280, label: 'Deep Love' },
  { minXp: 500, label: 'Soulmate' },
];

const getLoveLevel = (xp: number): LoveLevel => {
  if (xp >= 500) return 'Soulmate';
  if (xp >= 280) return 'Deep Love';
  if (xp >= 120) return 'Close';
  return 'Crush';
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  selectedContact, 
  conversationId,
  onBack,
  onDreamRoom,
}) => {
  const { mode, switchMode } = useChat();
  const { startCall } = useCall();
  const { toast } = useToast();
  const runRpc = useCallback(async (fn: string, args?: Record<string, unknown>) => {
    const rpc = supabase.rpc as unknown as (
      name: string,
      params?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: unknown }>;
    return rpc(fn, args);
  }, []);
  const [messageInput, setMessageInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showRemoveFriendConfirm, setShowRemoveFriendConfirm] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [isThinkingOfYou, setIsThinkingOfYou] = useState(false);
  const [hugHoldMs, setHugHoldMs] = useState(0);
  const [isHoldingHug, setIsHoldingHug] = useState(false);
  const [typingPressure, setTypingPressure] = useState(0);
  const [sharedTheme, setSharedTheme] = useState<ThemePreset>('galaxy');
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [isSchedulingSurprise, setIsSchedulingSurprise] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const [showCoupleHub, setShowCoupleHub] = useState(false);
  const [identity, setIdentity] = useState<CoupleIdentity | null>(null);
  const [tools, setTools] = useState<CoupleToolsState>({
    todos: [],
    events: [],
    budgets: [],
    challenges: [
      { id: 'c1', title: 'No dry replies for 24h', progress: 0, target: 1, rewardXp: 20 },
      { id: 'c2', title: 'Ask 3 deep questions today', progress: 0, target: 3, rewardXp: 25 },
    ],
  });
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [presence, setPresence] = useState<PresenceItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventAt, setNewEventAt] = useState('');
  const [newBudgetTitle, setNewBudgetTitle] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [showSurpriseComposer, setShowSurpriseComposer] = useState(false);
  const [surpriseText, setSurpriseText] = useState('');
  const [surpriseUnlockAt, setSurpriseUnlockAt] = useState('');
  const [showSongComposer, setShowSongComposer] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [loveState, setLoveState] = useState<LoveState>({
    xp: 0,
    streak: 0,
    lastHugDate: null,
    hugsToday: 0,
    level: 'Crush',
  });
  const [romanceAmbienceProfile, setRomanceAmbienceProfile] = useState<RomanceAmbienceProfile>('medium');

  // Chat settings hook
  const { 
    settings: chatSettings, 
    toggleMute, 
    setDisappearingMode,
    setWallpaper,
    reload: refreshSettings
  } = useChatSettings(conversationId || null);

  // Chat actions hook
  const {
    clearChat,
    removeFriend,
    deleteMessage,
    sendMediaMessage,
    forwardMessage,
    loading: actionLoading
  } = useChatActions();

  // Blocked users hook
  const { blockUser } = useBlockedUsers();

  // Screenshot detection hook
  useScreenshotDetection(conversationId || null, true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hugHoldStartRef = useRef<number | null>(null);
  const hugHoldTimerRef = useRef<number | null>(null);
  const typingPauseTimerRef = useRef<number | null>(null);
  const lastKeystrokeRef = useRef<number | null>(null);
  const isLoversMode = mode === 'lovers';

  useEffect(() => {
    if (!isLoversMode) {
      setShowCoupleHub(false);
    }
  }, [isLoversMode]);

  const {
    messages,
    typingUsers,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    addReaction,
    setTyping,
    loadOlderMessages,
  } = useEnhancedRealTimeChat(conversationId || null, chatSettings?.disappearing_mode || 'off');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!conversationId || !isLoversMode) return;

    const loadTheme = async () => {
      const { data, error } = await runRpc('get_couple_theme', {
        p_conversation_id: conversationId,
      });
      if (!error && data && ['galaxy', 'rainy_night', 'sunset'].includes(data)) {
        setSharedTheme(data as ThemePreset);
      }
    };

    void loadTheme();
  }, [conversationId, isLoversMode, runRpc]);

  const loadWeeklyRecap = useCallback(async () => {
    if (!conversationId || !isLoversMode) return;
    setRecapLoading(true);
    const { data, error } = await runRpc('get_weekly_relationship_recap', {
      p_conversation_id: conversationId,
    });

    if (!error && data) {
      setWeeklyRecap(data as WeeklyRecap);
    }
    setRecapLoading(false);
  }, [conversationId, isLoversMode, runRpc]);

  const revealDueSurprises = useCallback(async () => {
    if (!conversationId || !isLoversMode) return;
    const { data, error } = await runRpc('reveal_due_couple_surprises', {
      p_conversation_id: conversationId,
    });

    if (!error && typeof data === 'number' && data > 0) {
      toast({
        title: 'Surprise unlocked',
        description: `${data} hidden love note${data > 1 ? 's were' : ' was'} revealed.`,
      });
      void loadWeeklyRecap();
    }
  }, [conversationId, isLoversMode, loadWeeklyRecap, runRpc, toast]);

  useEffect(() => {
    if (!conversationId || !isLoversMode) return;

    void loadWeeklyRecap();
    void revealDueSurprises();

    const id = window.setInterval(() => {
      void revealDueSurprises();
    }, 30000);

    return () => window.clearInterval(id);
  }, [conversationId, isLoversMode, loadWeeklyRecap, revealDueSurprises]);

  const loadIdentity = useCallback(async () => {
    if (!conversationId || !isLoversMode) return;
    const { data, error } = await runRpc('get_lovers_identity_for_conversation', {
      p_conversation_id: conversationId,
    });
    if (!error && data && typeof data === 'object') {
      setIdentity(data as CoupleIdentity);
    }
  }, [conversationId, isLoversMode, runRpc]);

  const loadTools = useCallback(async () => {
    if (!conversationId || !isLoversMode) return;
    const { data, error } = await runRpc('get_couple_tools', {
      p_conversation_id: conversationId,
    });
    if (!error && data && typeof data === 'object') {
      const value = data as Record<string, unknown>;
      setTools((prev) => ({
        ...prev,
        todos: Array.isArray(value.todos) ? (value.todos as CoupleToolsState['todos']) : prev.todos,
        events: Array.isArray(value.events) ? (value.events as CoupleToolsState['events']) : prev.events,
        budgets: Array.isArray(value.budgets) ? (value.budgets as CoupleToolsState['budgets']) : prev.budgets,
        challenges: Array.isArray(value.challenges) ? (value.challenges as CoupleToolsState['challenges']) : prev.challenges,
      }));
    }
  }, [conversationId, isLoversMode, runRpc]);

  const saveTools = useCallback(async (next: CoupleToolsState) => {
    if (!conversationId || !isLoversMode) return;
    setTools(next);
    await runRpc('update_couple_tools', {
      p_conversation_id: conversationId,
      p_todos: next.todos,
      p_events: next.events,
      p_budgets: next.budgets,
      p_challenges: next.challenges,
    });
  }, [conversationId, isLoversMode, runRpc]);

  const loadSignalsAndPresence = useCallback(async () => {
    if (!conversationId || !isLoversMode) return;

    const [{ data: signalsData, error: signalsError }, { data: statusData, error: statusError }] = await Promise.all([
      runRpc('get_recent_couple_signals', { p_conversation_id: conversationId, p_limit: 20 }),
      runRpc('get_couple_status', { p_conversation_id: conversationId }),
    ]);

    if (!signalsError && Array.isArray(signalsData)) {
      setSignals(signalsData as SignalItem[]);
    }

    if (!statusError && Array.isArray(statusData)) {
      setPresence(statusData as PresenceItem[]);
    }
  }, [conversationId, isLoversMode, runRpc]);

  useEffect(() => {
    if (!conversationId || !isLoversMode) return;
    void loadIdentity();
    void loadTools();
    void loadSignalsAndPresence();
  }, [conversationId, isLoversMode, loadIdentity, loadSignalsAndPresence, loadTools]);

  useEffect(() => {
    if (!conversationId || !isLoversMode) return;
    const id = window.setInterval(() => {
      void loadSignalsAndPresence();
    }, 20000);
    return () => window.clearInterval(id);
  }, [conversationId, isLoversMode, loadSignalsAndPresence]);

  useEffect(() => {
    if (!pauseUntil) return;
    const id = window.setInterval(() => {
      if (Date.now() >= pauseUntil) {
        setIsChatPaused(false);
        setPauseUntil(null);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [pauseUntil]);

  useEffect(() => {
    if (!conversationId || !isLoversMode || !currentUserId) return;
    const status: PresenceItem['status'] = isChatPaused ? 'busy' : isThinkingOfYou ? 'thinking' : 'available';
    const attention = Math.max(20, Math.min(100, Math.round(50 + typingPressure * 45)));
    void runRpc('upsert_couple_status', {
      p_conversation_id: conversationId,
      p_status: status,
      p_attention: attention,
    });
  }, [conversationId, isLoversMode, currentUserId, isChatPaused, isThinkingOfYou, typingPressure, runRpc]);

  useEffect(() => {
    if (!conversationId || !isLoversMode) return;
    const raw = localStorage.getItem(`lovers:progress:${conversationId}`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LoveState;
      setLoveState({
        xp: parsed.xp || 0,
        streak: parsed.streak || 0,
        lastHugDate: parsed.lastHugDate || null,
        hugsToday: parsed.hugsToday || 0,
        level: getLoveLevel(parsed.xp || 0),
      });
    } catch {
      // Ignore malformed local data.
    }
  }, [conversationId, isLoversMode]);

  useEffect(() => {
    if (!isLoversMode) return;
    const raw = localStorage.getItem('lovers:ambience-profile');
    if (raw === 'low' || raw === 'medium' || raw === 'high') {
      setRomanceAmbienceProfile(raw);
    }
  }, [isLoversMode]);

  const handleAmbienceProfileChange = (profile: RomanceAmbienceProfile) => {
    setRomanceAmbienceProfile(profile);
    localStorage.setItem('lovers:ambience-profile', profile);
    toast({
      title: 'Ambience tuned',
      description: `Romance ambience set to ${profile}.`,
    });
  };

  const persistLoveState = (next: LoveState) => {
    if (!conversationId || !isLoversMode) return;
    localStorage.setItem(`lovers:progress:${conversationId}`, JSON.stringify(next));
  };

  const triggerEmotionEffect = useCallback((effect: 'hug' | 'kiss' | 'touch') => {
    if ('vibrate' in navigator) {
      const pattern = effect === 'hug' ? [50, 30, 60] : effect === 'kiss' ? [35] : [25, 20, 25];
      navigator.vibrate(pattern);
    }
  }, []);

  const addLoveXp = (amount: number, reason: string) => {
    if (!isLoversMode) return;
    setLoveState((prev) => {
      const xp = prev.xp + amount;
      const level = getLoveLevel(xp);
      const next = { ...prev, xp, level };
      persistLoveState(next);

      if (level !== prev.level) {
        toast({
          title: `${level} unlocked`,
          description: `You reached ${level}. Keep nurturing your bond.`,
        });
      } else {
        toast({
          title: `+${amount} Love XP`,
          description: reason,
        });
      }

      return next;
    });
  };

  const updateChallengeProgress = (content: string) => {
    if (!isLoversMode) return;

    const trimmed = content.trim().toLowerCase();
    const isDryReply = ['ok', 'k', 'hmm', 'fine'].includes(trimmed);
    const asksQuestion = content.includes('?');

    const nextChallenges = tools.challenges.map((ch) => {
      let progress = ch.progress;
      let completed = ch.completed || false;

      if (ch.id === 'c1' && !isDryReply) {
        progress = Math.min(ch.target, 1);
      }
      if (ch.id === 'c2' && asksQuestion) {
        progress = Math.min(ch.target, ch.progress + 1);
      }

      if (!completed && progress >= ch.target) {
        completed = true;
        addLoveXp(ch.rewardXp, `Challenge complete: ${ch.title}`);
      }

      return { ...ch, progress, completed };
    });

    const next = { ...tools, challenges: nextChallenges };
    void saveTools(next);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop < 100 && !loadingMore && hasMore) {
      loadOlderMessages();
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollButton(!isNearBottom);
  };

  const handleSendMessage = async () => {
    if (isChatPaused) {
      toast({
        title: 'Chat paused',
        description: 'Cooldown is active. Unpause when you are ready.',
      });
      return;
    }

    if (!messageInput.trim()) return;

    const metadata: Record<string, unknown> = {};
    if (replyTo) {
      metadata.replyTo = {
        id: replyTo.id,
        content: replyTo.content.slice(0, 100),
        senderName: replyTo.senderName,
        messageType: replyTo.messageType,
      };
    }

    await sendMessage(messageInput, 'text', Object.keys(metadata).length > 0 ? metadata : undefined);
    updateChallengeProgress(messageInput);

    if (isLoversMode) {
      addLoveXp(8, 'Meaningful message sent');
      if (Math.random() < 0.18) {
        toast({
          title: 'Secret love drop',
          description: 'You unlocked a hidden love note. Keep the spark alive.',
        });
        addLoveXp(4, 'Love drop bonus');
      }
    }

    setMessageInput('');
    setReplyTo(null);
    setTyping(false);
    setIsThinkingOfYou(false);
    scrollToBottom();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    const now = Date.now();
    if (lastKeystrokeRef.current) {
      const delta = now - lastKeystrokeRef.current;
      const pressure = delta < 120 ? 1 : delta < 220 ? 0.7 : delta < 420 ? 0.4 : 0.2;
      setTypingPressure(pressure);
    }
    lastKeystrokeRef.current = now;

    if (typingPauseTimerRef.current) {
      window.clearTimeout(typingPauseTimerRef.current);
      typingPauseTimerRef.current = null;
    }

    if (value.trim()) {
      setTyping(true);
      if (isLoversMode) {
        setIsThinkingOfYou(false);
        typingPauseTimerRef.current = window.setTimeout(() => {
          setIsThinkingOfYou(true);
        }, 1800);
      }
    } else {
      setIsThinkingOfYou(false);
      setTyping(false);
      setTypingPressure(0);
    }
  };

  useEffect(() => {
    return () => {
      if (typingPauseTimerRef.current) {
        window.clearTimeout(typingPauseTimerRef.current);
      }
      if (hugHoldTimerRef.current) {
        window.clearInterval(hugHoldTimerRef.current);
      }
    };
  }, []);

  const finalizeHug = async () => {
    if (!isLoversMode) return;
    const heldMs = hugHoldMs;
    const seconds = Math.max(1, Math.round(heldMs / 1000));
    await sendMessage(`🤗 Hold Hug for ${seconds}s`, 'text', {
      interaction: 'hold_hug',
      durationMs: heldMs,
      intimacy: heldMs >= 5000 ? 'deep' : 'gentle',
    });

    const today = new Date().toISOString().slice(0, 10);
    setLoveState((prev) => {
      const isSameDay = prev.lastHugDate === today;
      const hugsToday = isSameDay ? prev.hugsToday + 1 : 1;
      const streak = isSameDay
        ? prev.streak
        : prev.lastHugDate
          ? prev.streak + 1
          : 1;

      const xpBoost = heldMs >= 5000 ? 20 : 12;
      const xp = prev.xp + xpBoost;
      const level = getLoveLevel(xp);
      const next = { ...prev, hugsToday, streak, lastHugDate: today, xp, level };
      persistLoveState(next);

      if (hugsToday >= 3) {
        toast({
          title: 'Warm Couple Streak unlocked',
          description: 'Three hugs today. Your emotional bond is glowing.',
        });
      }

      if (level !== prev.level) {
        toast({
          title: `${level} unlocked`,
          description: `You reached ${level} through affectionate consistency.`,
        });
      }

      return next;
    });

    toast({
      title: heldMs >= 5000 ? 'Deep hug delivered' : 'Warm hug delivered',
      description: heldMs >= 5000 ? 'That embrace felt extra close.' : 'A sweet moment just landed.',
    });

    if (hugSyncReady) {
      triggerEmotionEffect('hug');
      addLoveXp(10, 'Synchronized hug bonus');
      toast({ title: 'Synchronized hug', description: 'Both of you held the moment together.' });
    } else {
      triggerEmotionEffect('hug');
    }

    scrollToBottom();
  };

  const startHoldingHug = () => {
    if (!isLoversMode || isHoldingHug) return;
    setIsHoldingHug(true);
    setHugHoldMs(0);
    hugHoldStartRef.current = Date.now();
    hugHoldTimerRef.current = window.setInterval(() => {
      if (!hugHoldStartRef.current) return;
      setHugHoldMs(Date.now() - hugHoldStartRef.current);
    }, 100);
  };

  const stopHoldingHug = async () => {
    if (!isLoversMode || !isHoldingHug) return;
    setIsHoldingHug(false);
    if (hugHoldTimerRef.current) {
      window.clearInterval(hugHoldTimerRef.current);
      hugHoldTimerRef.current = null;
    }

    if (hugHoldStartRef.current) {
      setHugHoldMs(Date.now() - hugHoldStartRef.current);
      hugHoldStartRef.current = null;
    }

    if (hugHoldMs >= 400) {
      await finalizeHug();
    } else {
      setHugHoldMs(0);
    }
  };

  const handleReply = (msg: ChatMessageView) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === currentUserId ? 'You' : selectedContact?.name || 'Unknown',
      messageType: msg.message_type,
    });
  };

  const handleCall = async (isVideo: boolean) => {
    if (!selectedContact) return;
    try {
      await startCall(selectedContact.id, selectedContact.name, isVideo);
    } catch (error) {
      toast({
        title: "Call failed",
        description: "Could not initiate call",
        variant: "destructive",
      });
    }
  };

  const handleMediaSelect = async (type: string, file: File) => {
    if (isChatPaused) {
      toast({ title: 'Chat paused', description: 'Media sending is paused during cooldown.' });
      return;
    }
    if (!conversationId) return;
    
    const success = await sendMediaMessage(conversationId, file);
    if (success) {
      scrollToBottom();
    }
  };

  const handleBlock = async () => {
    if (!selectedContact) return;
    const success = await blockUser(selectedContact.id, { isLoversMode });
    if (success) {
      setShowBlockConfirm(false);
      setShowSettingsDialog(false);
      onBack?.();
    }
  };

  const handleRemoveFriend = async () => {
    if (!selectedContact) return;
    const success = await removeFriend(selectedContact.id, { isLoversMode });
    if (success) {
      setShowRemoveFriendConfirm(false);
      setShowSettingsDialog(false);
      onBack?.();
    }
  };

  const handleClearChat = async () => {
    if (!conversationId) return;
    const success = await clearChat(conversationId, { isLoversMode });
    if (success) {
      setShowClearChatConfirm(false);
      setShowSettingsDialog(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleWallpaperUpload = async (url: string) => {
    if (url) {
      await setWallpaper(url);
      setShowWallpaperDialog(false);
      refreshSettings();
    }
  };

  const triggerPanicMode = () => {
    switchMode('general');
    toast({
      title: 'Switched to Public Mode',
      description: 'Lovers UI is hidden. You are now in normal chat mode.',
    });
  };

  const togglePauseChat = () => {
    if (!isChatPaused) {
      const until = Date.now() + 15 * 60 * 1000;
      setIsChatPaused(true);
      setPauseUntil(until);
      toast({ title: 'Cooldown active', description: 'Chat paused for 15 minutes.' });
      return;
    }

    setIsChatPaused(false);
    setPauseUntil(null);
    toast({ title: 'Cooldown ended', description: 'Chat is active again.' });
  };

  const sendSignal = async (signalType: SignalItem['signal_type'], metadata?: Record<string, unknown>) => {
    if (!conversationId || !isLoversMode) return;
    const { error } = await runRpc('send_couple_signal', {
      p_conversation_id: conversationId,
      p_signal_type: signalType,
      p_metadata: metadata || null,
    });

    if (!error) {
      void loadSignalsAndPresence();
    }
  };

  const savePrivateIdentity = async () => {
    if (!conversationId || !isLoversMode || !identity?.partner_id) return;
    const nickname = (identity.self?.nickname || '').trim();
    if (!nickname) {
      toast({ title: 'Nickname required', description: 'Set a Lovers nickname first.', variant: 'destructive' });
      return;
    }

    const { error } = await runRpc('upsert_lovers_identity', {
      p_partner_user_id: identity.partner_id,
      p_nickname: nickname,
      p_avatar_url: identity.self?.avatar_url || null,
    });

    if (error) {
      toast({ title: 'Could not save Lovers identity', description: 'Please try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Lovers identity saved', description: 'Only your partner sees this profile.' });
    void loadIdentity();
  };

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    const next: CoupleToolsState = {
      ...tools,
      todos: [...tools.todos, { id: crypto.randomUUID(), text, done: false }],
    };
    setNewTodo('');
    void saveTools(next);
  };

  const toggleTodo = (id: string) => {
    const next: CoupleToolsState = {
      ...tools,
      todos: tools.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    };
    void saveTools(next);
  };

  const addEvent = () => {
    const title = newEventTitle.trim();
    if (!title || !newEventAt) return;
    const next: CoupleToolsState = {
      ...tools,
      events: [...tools.events, { id: crypto.randomUUID(), title, at: newEventAt }],
    };
    setNewEventTitle('');
    setNewEventAt('');
    void saveTools(next);
  };

  const addBudget = () => {
    const title = newBudgetTitle.trim();
    const amount = Number(newBudgetAmount);
    if (!title || !Number.isFinite(amount) || amount <= 0) return;
    const next: CoupleToolsState = {
      ...tools,
      budgets: [...tools.budgets, { id: crypto.randomUUID(), title, amount }],
    };
    setNewBudgetTitle('');
    setNewBudgetAmount('');
    void saveTools(next);
  };

  const scheduleSurpriseFromComposer = async () => {
    if (!conversationId || !isLoversMode || isSchedulingSurprise) return;
    const content = surpriseText.trim();
    const unlockAt = surpriseUnlockAt ? new Date(surpriseUnlockAt).toISOString() : '';
    if (!content || !unlockAt) {
      toast({ title: 'Missing details', description: 'Add both message and unlock time.', variant: 'destructive' });
      return;
    }

    setIsSchedulingSurprise(true);
    const { error } = await runRpc('schedule_couple_surprise_message', {
      p_conversation_id: conversationId,
      p_content: content,
      p_unlock_at: unlockAt,
    });
    setIsSchedulingSurprise(false);

    if (error) {
      toast({ title: 'Could not schedule surprise', description: 'Please try a different unlock time.', variant: 'destructive' });
      return;
    }

    setSurpriseText('');
    setShowSurpriseComposer(false);
    setMessageInput('');
    addLoveXp(10, 'Scheduled surprise composed');
    toast({ title: 'Surprise scheduled', description: 'Your secret note will unlock on time.' });
    void loadWeeklyRecap();
  };

  const shareSong = async () => {
    if (!songUrl.trim()) {
      toast({ title: 'Song link required', description: 'Add a URL so both of you can listen.', variant: 'destructive' });
      return;
    }

    const title = songTitle.trim() || 'A song for us';
    await sendMessage(`🎵 Listen together: ${title}\n${songUrl.trim()}`, 'text', {
      interaction: 'shared_song',
      title,
      url: songUrl.trim(),
    });
    setSongTitle('');
    setSongUrl('');
    setShowSongComposer(false);
    addLoveXp(8, 'Shared a song together');
  };

  const runRealitySync = async () => {
    if (!isLoversMode) return;
    if (!navigator.geolocation) {
      toast({ title: 'Location unavailable', description: 'Geolocation is not supported.', variant: 'destructive' });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      await sendSignal('location_ping', { lat, lon });

      try {
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`);
        const weatherJson = await weatherRes.json();
        const code = weatherJson?.current?.weather_code;
        if (typeof code === 'number' && (code >= 51 && code <= 67)) {
          void handleSharedThemeSelect('rainy_night');
          toast({ title: 'Weather sync', description: 'Rain detected. Cozy Rainy Night theme enabled.' });
        }
      } catch {
        // Ignore weather fetch failures silently.
      }
    }, () => {
      toast({ title: 'Location denied', description: 'Enable location if you want reality sync triggers.', variant: 'destructive' });
    });
  };

  const handleSharedThemeSelect = async (theme: ThemePreset) => {
    if (!conversationId || !isLoversMode || theme === sharedTheme) return;

    const { data, error } = await runRpc('set_couple_theme', {
      p_conversation_id: conversationId,
      p_theme_name: theme,
    });

    if (error) {
      toast({
        title: 'Theme update failed',
        description: 'Could not update your couple theme right now.',
        variant: 'destructive',
      });
      return;
    }

    const resolvedTheme = (data || theme) as ThemePreset;
    setSharedTheme(resolvedTheme);
    toast({
      title: 'Couple theme updated',
      description: `Now using ${resolvedTheme.replace('_', ' ')} preset.`,
    });
  };

  const isPartnerTyping = typingUsers.length > 0;
  const currentDisappearingMode = chatSettings?.disappearing_mode || 'off';
  const nowHour = new Date().getHours();
  const isNightVibe = isLoversMode && selectedContact?.isOnline && nowHour >= 21;
  const bothPresent = isLoversMode && Boolean(currentUserId) && Boolean(selectedContact?.isOnline);

  const recentText = messages
    .slice(-8)
    .map((m) => (m.content || '').toLowerCase())
    .join(' ');
  const moodTone = isLoversMode
    ? recentText.match(/miss|sad|lonely|cry|hurt/)
      ? 'soft-blue'
      : recentText.match(/love|kiss|hug|sweet|darling|baby/)
        ? 'rose'
        : recentText.match(/wow|yay|party|hype|excited/)
          ? 'gold'
          : 'lavender'
    : 'none';

  const touchSyncWindowMs = 12000;
  const recentTouchEvents = messages
    .filter((m) => {
      const metadata = m.metadata as Record<string, unknown> | null;
      return metadata?.interaction === 'touch-sync';
    })
    .slice(-2);

  const touchSyncReady = recentTouchEvents.length === 2
    && recentTouchEvents[0].sender_id !== recentTouchEvents[1].sender_id
    && (new Date(recentTouchEvents[1].created_at).getTime() - new Date(recentTouchEvents[0].created_at).getTime()) <= touchSyncWindowMs;

  const recentHugEvents = messages
    .filter((m) => {
      const metadata = m.metadata as Record<string, unknown> | null;
      return metadata?.interaction === 'hold_hug';
    })
    .slice(-2);

  const hugSyncReady = recentHugEvents.length === 2
    && recentHugEvents[0].sender_id !== recentHugEvents[1].sender_id
    && (new Date(recentHugEvents[1].created_at).getTime() - new Date(recentHugEvents[0].created_at).getTime()) <= touchSyncWindowMs;

  const partnerPresence = presence.find((p) => p.user_id !== currentUserId);
  const selfPresence = presence.find((p) => p.user_id === currentUserId);
  const partnerAttention = partnerPresence?.attention ?? 0;
  const bothInactive = Boolean(selfPresence && partnerPresence && selfPresence.status !== 'available' && partnerPresence.status !== 'available');
  const hourlyCounts = messages.reduce<Record<number, number>>((acc, m) => {
    const h = new Date(m.created_at).getHours();
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {});
  const peakHourEntry = Object.entries(hourlyCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const peakHour = peakHourEntry ? Number(peakHourEntry[0]) : null;
  const heatmapHours = [6, 9, 12, 15, 18, 21, 23];
  const moodTrend = messages.slice(-40).reduce(
    (acc, m) => {
      const text = (m.content || '').toLowerCase();
      if (/love|happy|sweet|cute|kiss|hug|thanks/.test(text)) acc.happy += 1;
      if (/sad|miss|lonely|hurt|angry|upset/.test(text)) acc.low += 1;
      return acc;
    },
    { happy: 0, low: 0 }
  );
  const currentLevelMeta = [...LOVE_LEVELS].reverse().find((entry) => loveState.xp >= entry.minXp) || LOVE_LEVELS[0];
  const nextLevelMeta = LOVE_LEVELS.find((entry) => entry.minXp > loveState.xp);
  const levelRange = nextLevelMeta ? Math.max(1, nextLevelMeta.minXp - currentLevelMeta.minXp) : 1;
  const levelProgressPercent = nextLevelMeta
    ? Math.max(0, Math.min(100, ((loveState.xp - currentLevelMeta.minXp) / levelRange) * 100))
    : 100;
  const xpToNextLevel = nextLevelMeta ? Math.max(0, nextLevelMeta.minXp - loveState.xp) : 0;
  const moodDescriptor = moodTone === 'rose'
    ? 'Rose Glow'
    : moodTone === 'soft-blue'
      ? 'Midnight Calm'
      : moodTone === 'gold'
        ? 'Golden Rush'
        : 'Lavender Drift';
  const moodHeadlineClass = moodTone === 'rose'
    ? 'bg-gradient-to-r from-pink-200 via-rose-100 to-pink-300 bg-clip-text text-transparent'
    : moodTone === 'soft-blue'
      ? 'bg-gradient-to-r from-sky-200 via-blue-100 to-cyan-200 bg-clip-text text-transparent'
      : moodTone === 'gold'
        ? 'bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-200 bg-clip-text text-transparent'
        : 'bg-gradient-to-r from-violet-200 via-fuchsia-100 to-indigo-200 bg-clip-text text-transparent';
  const moodOrbPrimaryClass = moodTone === 'rose'
    ? 'from-rose-400/28 to-pink-500/8'
    : moodTone === 'soft-blue'
      ? 'from-cyan-400/26 to-blue-500/8'
      : moodTone === 'gold'
        ? 'from-amber-400/28 to-orange-500/10'
        : 'from-fuchsia-400/24 to-indigo-500/10';
  const moodOrbSecondaryClass = moodTone === 'rose'
    ? 'from-pink-300/20 to-rose-500/5'
    : moodTone === 'soft-blue'
      ? 'from-sky-300/20 to-cyan-500/5'
      : moodTone === 'gold'
        ? 'from-yellow-300/20 to-amber-500/5'
        : 'from-violet-300/18 to-fuchsia-500/6';
  const ambienceConfig = romanceAmbienceProfile === 'low'
    ? { opacity: 0.42, primaryPulseMs: 6800, secondaryPulseMs: 8200 }
    : romanceAmbienceProfile === 'high'
      ? { opacity: 0.9, primaryPulseMs: 2600, secondaryPulseMs: 3400 }
      : { opacity: 0.64, primaryPulseMs: 4300, secondaryPulseMs: 5600 };
  const loversHeadline = bothInactive
    ? 'Soft silence between two hearts'
    : moodTrend.happy > moodTrend.low
      ? 'Romance energy is glowing tonight'
      : moodTrend.low > moodTrend.happy
        ? 'Gentle words can shift the mood'
        : 'Write a message that feels unforgettable';

  const displayContact = selectedContact
    ? {
        ...selectedContact,
        name: isLoversMode && identity?.partner?.nickname ? identity.partner.nickname : selectedContact.name,
        avatar: isLoversMode && identity?.partner?.avatar_url ? identity.partner.avatar_url : selectedContact.avatar,
      }
    : undefined;

  const themeOverlayClass = isLoversMode
    ? sharedTheme === 'rainy_night'
      ? 'bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.1),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(30,64,175,0.12),transparent_45%)]'
      : sharedTheme === 'sunset'
        ? 'bg-[radial-gradient(circle_at_20%_0%,rgba(251,146,60,0.13),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(244,63,94,0.12),transparent_45%)]'
        : 'bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.1),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.1),transparent_45%)]'
    : '';

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto",
            isLoversMode
              ? "bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20"
              : "bg-gradient-to-br from-general-primary/20 to-general-secondary/20"
          )}>
            {isLoversMode ? (
              <Heart className="w-12 h-12 text-lovers-primary animate-heart-beat" />
            ) : (
              <Send className="w-12 h-12 text-general-primary" />
            )}
          </div>
          <h3 className="text-xl font-semibold">
            {isLoversMode ? 'Choose your partner' : 'Start a conversation'}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {isLoversMode
              ? 'Open your Couple Space to send sweet messages, voice notes, and moments.'
              : 'Pick a contact from your list to start chatting'}
          </p>
          {isLoversMode && onDreamRoom && (
            <Button
              onClick={onDreamRoom}
              className="mt-2 bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white border-0 hover:opacity-90"
            >
              <Moon className="w-4 h-4 mr-2" />
              Enter Our Dream Room 💜
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative flex-1 flex flex-col h-full overflow-hidden"
      style={chatSettings?.wallpaper_url ? { 
        backgroundImage: `url(${chatSettings.wallpaper_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : undefined}
    >
      {isLoversMode && (
        <div className={cn(
          'pointer-events-none absolute inset-0 z-0 transition-opacity duration-500',
          moodTone === 'soft-blue' && 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_55%)]',
          moodTone === 'rose' && 'bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.24),transparent_55%)]',
          moodTone === 'gold' && 'bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.2),transparent_55%)]',
          moodTone === 'lavender' && 'bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.22),transparent_55%)]',
        )} />
      )}

      {isLoversMode && (
        <div className={cn('pointer-events-none absolute inset-0 z-0', themeOverlayClass)} />
      )}

      {isLoversMode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-lovers-primary/12 to-transparent" />
      )}

      {isLoversMode && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <div className={cn(
            'absolute -left-12 -top-10 h-56 w-56 rounded-full bg-gradient-to-br blur-3xl animate-pulse motion-reduce:animate-none',
            moodOrbPrimaryClass
          )} style={{ opacity: ambienceConfig.opacity, animationDuration: `${ambienceConfig.primaryPulseMs}ms` }} />
          <div className={cn(
            'absolute -right-10 top-24 h-48 w-48 rounded-full bg-gradient-to-br blur-3xl animate-pulse [animation-delay:1.4s] motion-reduce:animate-none',
            moodOrbSecondaryClass
          )} style={{ opacity: ambienceConfig.opacity * 0.95, animationDuration: `${ambienceConfig.secondaryPulseMs}ms` }} />
          <div className="absolute inset-x-12 bottom-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {isNightVibe && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(15,23,42,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(88,28,135,0.18),transparent_45%)]" />
      )}

      {/* Chat Header */}
      <ChatHeader
        contact={displayContact}
        isTyping={isPartnerTyping || isThinkingOfYou}
        typingText={isThinkingOfYou ? 'thinking of you...' : undefined}
        isMuted={chatSettings?.is_muted}
        isLoversMode={isLoversMode}
        onCall={() => handleCall(false)}
        onVideoCall={() => handleCall(true)}
        onOpenSettings={() => setShowSettingsDialog(true)}
        onMuteToggle={toggleMute}
        onBlock={() => setShowBlockConfirm(true)}
        onClearChat={() => setShowClearChatConfirm(true)}
        onBack={onBack}
        onDreamRoom={onDreamRoom}
      />

      {isLoversMode && (
        <div className="relative z-10 px-4 pt-2 animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-2 rounded-full border border-lovers-primary/20 bg-black/10 px-3 py-2 backdrop-blur-sm transition-all duration-300 hover:border-lovers-primary/30">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Heart className={cn('h-4 w-4 shrink-0', bothPresent ? 'text-lovers-primary animate-heart-beat' : 'text-muted-foreground')} />
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {bothInactive
                    ? 'Quiet moment'
                    : loveState.streak > 0
                      ? `${loveState.level} • ${loveState.streak} day streak`
                      : `${loveState.level} • start your streak`}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] text-lovers-primary sm:flex">
              <Sparkles className="h-3 w-3" />
              {loveState.hugsToday} hugs today
            </div>

            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:block">
              <div
                className={cn('h-full rounded-full transition-all duration-300', bothInactive ? 'bg-muted-foreground/60' : 'bg-lovers-primary')}
                style={{ width: `${Math.max(6, Math.min(100, partnerAttention))}%` }}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon" variant="outline" className="h-7 w-7 rounded-full border-lovers-primary/25 text-lovers-primary transition-transform hover:scale-105">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass border-white/20">
                <DropdownMenuItem onClick={() => setShowCoupleHub(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Open Couple Hub
                </DropdownMenuItem>
                <DropdownMenuItem onClick={togglePauseChat}>
                  <PauseCircle className="w-4 h-4 mr-2" />
                  {isChatPaused ? 'Resume Chat' : 'Pause Chat'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAmbienceProfileChange('low')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {romanceAmbienceProfile === 'low' ? '• ' : ''}Ambience: Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAmbienceProfileChange('medium')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {romanceAmbienceProfile === 'medium' ? '• ' : ''}Ambience: Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAmbienceProfileChange('high')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {romanceAmbienceProfile === 'high' ? '• ' : ''}Ambience: High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={triggerPanicMode}>
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Panic Mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-gradient-to-r from-lovers-primary/15 via-black/20 to-lovers-secondary/15 px-3 py-3 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lovers-primary/90">Lovers Atmosphere</p>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/75">
                    {romanceAmbienceProfile}
                  </span>
                </div>
                <p className={cn('truncate text-sm font-semibold md:text-[15px] font-serif italic leading-tight', moodHeadlineClass)}>{loversHeadline}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/65">Tone: {moodDescriptor}</p>
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">
                {nextLevelMeta ? `${xpToNextLevel} XP to ${nextLevelMeta.label}` : 'Top level reached'}
              </div>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lovers-primary to-lovers-secondary transition-all duration-500"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Level</p>
                <p className="text-xs font-semibold text-lovers-primary">{loveState.level}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Streak</p>
                <p className="text-xs font-semibold text-lovers-primary">{loveState.streak} day{loveState.streak === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Total XP</p>
                <p className="text-xs font-semibold text-lovers-primary">{loveState.xp}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoversMode && (
        <CoupleHubPanel
          isLoversMode={isLoversMode}
          conversationId={conversationId || 'unknown'}
          userId={currentUserId}
          open={showCoupleHub}
          onOpenChange={setShowCoupleHub}
          isChatPaused={isChatPaused}
          pauseUntil={pauseUntil}
          onTogglePauseChat={togglePauseChat}
          onPanic={triggerPanicMode}
          partnerAttention={partnerAttention}
          bothInactive={bothInactive}
          identity={identity}
          setIdentity={setIdentity}
          onSavePrivateIdentity={savePrivateIdentity}
          signals={signals}
          onSendSignal={(signalType) => void sendSignal(signalType)}
          onRunRealitySync={() => void runRealitySync()}
          newTodo={newTodo}
          setNewTodo={setNewTodo}
          onAddTodo={addTodo}
          tools={tools}
          onToggleTodo={toggleTodo}
          newEventTitle={newEventTitle}
          setNewEventTitle={setNewEventTitle}
          newEventAt={newEventAt}
          setNewEventAt={setNewEventAt}
          onAddEvent={addEvent}
          newBudgetTitle={newBudgetTitle}
          setNewBudgetTitle={setNewBudgetTitle}
          newBudgetAmount={newBudgetAmount}
          setNewBudgetAmount={setNewBudgetAmount}
          onAddBudget={addBudget}
          peakHour={peakHour}
          moodTrend={moodTrend}
          weeklyMessageCount={weeklyRecap?.message_count ?? 0}
          weeklyRecap={weeklyRecap}
          recapLoading={recapLoading}
          heatmapHours={heatmapHours}
          hourlyCounts={hourlyCounts}
        />
      )}

      {/* Disappearing Message Indicator */}
      {chatSettings?.disappearing_mode && chatSettings.disappearing_mode !== 'off' && (
        <div className="px-4 py-1 flex justify-center">
          <DisappearingMessageIndicator 
            mode={chatSettings.disappearing_mode} 
            isLoversMode={isLoversMode}
          />
        </div>
      )}

      {/* Chat Settings Dialog */}
      <ChatSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settings={chatSettings}
        contactName={selectedContact.name}
        isLoversMode={isLoversMode}
        onMuteToggle={toggleMute}
        onDisappearingModeChange={setDisappearingMode}
        onWallpaperChange={() => setShowWallpaperDialog(true)}
        onWallpaperReset={async () => {
          await setWallpaper(null);
          refreshSettings();
        }}
        currentTheme={sharedTheme}
        onThemeChange={(theme) => void handleSharedThemeSelect(theme)}
        onBlock={() => setShowBlockConfirm(true)}
        onRemoveFriend={() => setShowRemoveFriendConfirm(true)}
        onClearChat={() => setShowClearChatConfirm(true)}
      />

      <Dialog open={showWallpaperDialog} onOpenChange={setShowWallpaperDialog}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle>Change Chat Wallpaper</DialogTitle>
          </DialogHeader>
          <ChatWallpaperUpload 
            onUploadComplete={handleWallpaperUpload}
            currentWallpaper={chatSettings?.wallpaper_url}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showSurpriseComposer} onOpenChange={setShowSurpriseComposer}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle>Schedule Surprise Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={surpriseText}
              onChange={(e) => setSurpriseText(e.target.value)}
              placeholder="Write your hidden love note"
            />
            <Input
              type="datetime-local"
              value={surpriseUnlockAt}
              onChange={(e) => setSurpriseUnlockAt(e.target.value)}
            />
            <div className="rounded-lg border border-lovers-primary/20 bg-lovers-primary/10 p-2 text-xs text-muted-foreground">
              Preview: A secret love note is waiting 💌
            </div>
            <Button onClick={() => void scheduleSurpriseFromComposer()} className="w-full btn-lovers" disabled={isSchedulingSurprise}>
              {isSchedulingSurprise ? 'Scheduling...' : 'Schedule Surprise'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSongComposer} onOpenChange={setShowSongComposer}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle>Listen Together</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Song title"
            />
            <Input
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button onClick={() => void shareSong()} className="w-full btn-lovers">
              Share Song With Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLoversMode ? `Block ${selectedContact.name} from Couple Space?` : `Block ${selectedContact.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLoversMode
                ? 'They will no longer be able to message or call you in your private couple space. You can unblock them later in Settings.'
                : "They won't be able to message or call you. You can unblock them later in Settings."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
              {isLoversMode ? 'Block Contact' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Friend Confirmation */}
      <AlertDialog open={showRemoveFriendConfirm} onOpenChange={setShowRemoveFriendConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLoversMode ? `Leave Couple Space with ${selectedContact.name}?` : `Remove ${selectedContact.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLoversMode
                ? 'This ends your current couple connection in chat. You can reconnect again later.'
                : 'They will be removed from your friends list. You can add them back later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive text-destructive-foreground">
              {isLoversMode ? 'Leave Space' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Chat Confirmation */}
      <AlertDialog open={showClearChatConfirm} onOpenChange={setShowClearChatConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLoversMode ? 'Clear your shared love chat?' : 'Clear chat history?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLoversMode
                ? 'This will erase your shared couple messages in this conversation. This action cannot be undone.'
                : 'This will clear the full chat history for this conversation. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground">
              {isLoversMode ? 'Clear Messages' : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="p-4 space-y-3 min-h-full flex flex-col">
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <div className="text-center py-4">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs",
                "bg-white/10 text-muted-foreground"
              )}>
                🔒 Messages are end-to-end encrypted
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                  isLoversMode
                    ? "bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20"
                    : "bg-gradient-to-br from-general-primary/20 to-general-secondary/20"
                )}>
                  {isLoversMode ? (
                    <Heart className="w-8 h-8 text-lovers-primary animate-heart-beat" />
                  ) : (
                    <Send className="w-8 h-8 text-general-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    {isLoversMode ? 'Start your love story' : 'No messages yet'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {isLoversMode
                      ? 'Send your first romantic message to begin this chapter together 💕'
                      : 'Send a message to start chatting!'}
                  </p>
                </div>
                {isLoversMode && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {[
                      'I miss you already 💞',
                      'Date night idea: sunset walk? 🌇',
                      'Tell me your favorite memory of us ✨'
                    ].map((starter) => (
                      <Button
                        key={starter}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMessageInput(starter);
                          requestAnimationFrame(() => {
                            const inputEl = document.querySelector<HTMLInputElement>('input[placeholder="Send love..."]');
                            inputEl?.focus();
                          });
                        }}
                        className="rounded-full border-lovers-primary/30 text-lovers-primary hover:bg-lovers-primary/10"
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const typedMsg = msg as ChatMessageView;
                const typedMetadata = (typedMsg.metadata as ReplyMetadata | null) || null;
                return (
                <MessageBubble
                  key={typedMsg.id}
                  id={typedMsg.id}
                  content={typedMsg.content}
                  senderId={typedMsg.sender_id}
                  currentUserId={currentUserId}
                  messageType={typedMsg.message_type}
                  createdAt={typedMsg.created_at}
                  readAt={typedMsg.read_at}
                  deliveredAt={typedMsg.delivered_at}
                  reactions={Array.isArray(typedMsg.reactions) ? typedMsg.reactions : []}
                  metadata={typeof typedMsg.metadata === 'object' && typedMsg.metadata !== null ? typedMsg.metadata : {}}
                  replyTo={typedMetadata?.replyTo}
                  isLoversMode={isLoversMode}
                  onReply={() => handleReply(typedMsg)}
                  onForward={() => toast({ title: 'Forward', description: 'Select a chat to forward this message' })}
                  onReaction={(emoji) => addReaction(typedMsg.id, emoji)}
                  onStar={() => toast({ title: 'Starred', description: 'Message starred' })}
                  onDelete={() => handleDeleteMessage(typedMsg.id)}
                  onInfo={() => toast({ 
                    title: 'Message Info',
                    description: `Sent: ${new Date(typedMsg.created_at).toLocaleString()}${typedMsg.read_at ? `\nRead: ${new Date(typedMsg.read_at).toLocaleString()}` : ''}`
                  })}
                />
              );
              })}
            </>
          )}

          {isPartnerTyping && <TypingIndicator typingUsers={typingUsers} />}
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <Button
            size="icon"
            onClick={() => scrollToBottom()}
            className={cn(
              "absolute bottom-4 right-4 rounded-full shadow-lg w-10 h-10",
              isLoversMode ? "bg-lovers-primary" : "bg-general-primary"
            )}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          onCancel={() => setReplyTo(null)}
          isLoversMode={isLoversMode}
        />
      )}

      {/* Message Input */}
      <div className="p-3 border-t border-white/20 glass">
        {isRecordingVoice ? (
          <VoiceMessageRecorder
            isLoversMode={isLoversMode}
            onSend={async (audioBlob, duration) => {
              if (conversationId) {
                const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
                await sendMediaMessage(conversationId, audioFile);
              }
              setIsRecordingVoice(false);
              scrollToBottom();
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
            {isLoversMode && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onPointerDown={startHoldingHug}
                  onPointerUp={stopHoldingHug}
                  onPointerLeave={() => {
                    if (isHoldingHug) {
                      void stopHoldingHug();
                    }
                  }}
                  className={cn(
                    'rounded-full border-lovers-primary/35 bg-lovers-primary/10 text-lovers-primary whitespace-nowrap transition-transform active:scale-95 hover:bg-lovers-primary/20',
                    isHoldingHug && 'bg-lovers-primary/20 border-lovers-primary/50 scale-[1.03]'
                  )}
                >
                  <HandHeart className="w-3.5 h-3.5 mr-1" />
                  Hug {isHoldingHug ? `${(hugHoldMs / 1000).toFixed(1)}s` : ''}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await sendMessage('💋 A kiss for you', 'text', { interaction: 'kiss' });
                    addLoveXp(6, 'Romantic gesture sent');
                    triggerEmotionEffect('kiss');
                  }}
                  className="rounded-full border-rose-300/30 bg-rose-500/10 text-rose-200 whitespace-nowrap transition-transform active:scale-95 hover:bg-rose-500/20"
                >
                  💋 Kiss
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-lovers-primary/25 bg-white/5 text-lovers-primary whitespace-nowrap transition-transform active:scale-95 hover:bg-white/10"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass border-white/20">
                    <DropdownMenuItem
                      onClick={async () => {
                        await sendMessage('🫶 Feeling your touch', 'text', { interaction: 'touch-sync' });
                        addLoveXp(6, 'Affection shared');
                        triggerEmotionEffect('touch');
                        if (touchSyncReady) {
                          toast({
                            title: 'Touch sync achieved',
                            description: 'Both hearts tapped in sync.',
                          });
                          addLoveXp(10, 'Touch sync bonus');
                        }
                      }}
                    >
                      🫶 Touch
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSongComposer(true)}>
                      <Music2 className="w-4 h-4 mr-2" />
                      Listen Together
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const defaultUnlock = new Date(Date.now() + 2 * 60 * 60 * 1000);
                        setSurpriseUnlockAt(defaultUnlock.toISOString().slice(0, 16));
                        setSurpriseText(messageInput.trim());
                        setShowSurpriseComposer(true);
                      }}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Surprise Composer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex items-end gap-2 transition-all duration-300">
              <MediaAttachmentPicker
                onImageSelect={(file) => handleMediaSelect('Image', file)}
                onVideoSelect={(file) => handleMediaSelect('Video', file)}
                onDocumentSelect={(file) => handleMediaSelect('Document', file)}
                onCameraCapture={() => toast({ title: 'Camera', description: 'Camera access requires device permissions' })}
                onLocationShare={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const locationUrl = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
                        await sendMessage(locationUrl, 'location');
                        scrollToBottom();
                      },
                      () => toast({ title: 'Location', description: 'Location access denied', variant: 'destructive' })
                    );
                  } else {
                    toast({ title: 'Location', description: 'Geolocation not supported', variant: 'destructive' });
                  }
                }}
                onContactShare={() => {
                  if (conversationId && currentUserId) {
                    supabase.from('profiles').select('display_name, username, avatar_url').eq('user_id', currentUserId).single().then(({ data }) => {
                      if (data) {
                        const contactCard = `📇 Contact: ${data.display_name || 'Unknown'}\n@${data.username || 'N/A'}`;
                        sendMessage(contactCard, 'text');
                        scrollToBottom();
                      }
                    });
                  }
                }}
                isLoversMode={isLoversMode}
              />

              <div className="relative flex-1">
              <Input
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onBlur={() => !messageInput.trim() && setTyping(false)}
                placeholder={isLoversMode ? "Send love..." : "Type a message..."}
                className="rounded-full glass border-white/20 py-2.5 pr-10 text-sm transition-shadow duration-200 focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.12)]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <EmojiKeyboard
                  onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                  isLoversMode={isLoversMode}
                />
              </div>
            </div>
              {messageInput.trim() ? (
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className={cn(
                    'rounded-full h-10 w-10 shrink-0',
                    isLoversMode ? 'btn-lovers' : 'btn-general'
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRecordingVoice(true)}
                  className={cn(
                    'rounded-full h-10 w-10 shrink-0 hover:bg-white/10',
                    isLoversMode ? 'text-lovers-primary' : 'text-general-primary'
                  )}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};