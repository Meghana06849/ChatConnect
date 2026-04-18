import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Sparkles, ListTodo, CalendarDays, Wallet, Radar, MapPin, ShieldAlert } from 'lucide-react';

interface CoupleIdentity {
  self?: { nickname?: string; avatar_url?: string };
}

interface CoupleToolsState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  events: Array<{ id: string; title: string; at: string }>;
  budgets: Array<{ id: string; title: string; amount: number }>;
  challenges: Array<{ id: string; title: string; progress: number; target: number; rewardXp: number; completed?: boolean }>;
}

interface SignalItem {
  id: string;
  signal_type: 'miss_you' | 'thinking' | 'busy' | 'tap_sync' | 'location_ping';
}

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

interface CoupleHubPanelProps {
  isLoversMode: boolean;
  conversationId: string;
  userId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isChatPaused: boolean;
  pauseUntil: number | null;
  onTogglePauseChat: () => void;
  onPanic: () => void;
  partnerAttention: number;
  bothInactive: boolean;
  identity: CoupleIdentity | null;
  setIdentity: React.Dispatch<React.SetStateAction<CoupleIdentity | null>>;
  onSavePrivateIdentity: () => void;
  signals: SignalItem[];
  onSendSignal: (signalType: SignalItem['signal_type']) => void;
  onRunRealitySync: () => void;
  newTodo: string;
  setNewTodo: (value: string) => void;
  onAddTodo: () => void;
  tools: CoupleToolsState;
  onToggleTodo: (id: string) => void;
  newEventTitle: string;
  setNewEventTitle: (value: string) => void;
  newEventAt: string;
  setNewEventAt: (value: string) => void;
  onAddEvent: () => void;
  newBudgetTitle: string;
  setNewBudgetTitle: (value: string) => void;
  newBudgetAmount: string;
  setNewBudgetAmount: (value: string) => void;
  onAddBudget: () => void;
  peakHour: number | null;
  moodTrend: { happy: number; low: number };
  weeklyMessageCount: number;
  weeklyRecap?: WeeklyRecap | null;
  recapLoading?: boolean;
  heatmapHours: number[];
  hourlyCounts: Record<number, number>;
}

export const CoupleHubPanel: React.FC<CoupleHubPanelProps> = ({
  isLoversMode,
  conversationId,
  userId,
  open,
  onOpenChange,
  isChatPaused,
  pauseUntil,
  onTogglePauseChat,
  onPanic,
  partnerAttention,
  bothInactive,
  identity,
  setIdentity,
  onSavePrivateIdentity,
  signals,
  onSendSignal,
  onRunRealitySync,
  newTodo,
  setNewTodo,
  onAddTodo,
  tools,
  onToggleTodo,
  newEventTitle,
  setNewEventTitle,
  newEventAt,
  setNewEventAt,
  onAddEvent,
  newBudgetTitle,
  setNewBudgetTitle,
  newBudgetAmount,
  setNewBudgetAmount,
  onAddBudget,
  peakHour,
  moodTrend,
  weeklyMessageCount,
  weeklyRecap,
  recapLoading,
  heatmapHours,
  hourlyCounts,
}) => {
  const [activeTab, setActiveTab] = React.useState<'identity' | 'tools' | 'signals' | 'analytics'>('identity');
  const tabStorageKey = React.useMemo(() => {
    if (!isLoversMode || !conversationId) return null;
    return `coupleHub:lastTab:${userId || 'anonymous'}:${conversationId}`;
  }, [isLoversMode, userId, conversationId]);

  React.useEffect(() => {
    if (!tabStorageKey) return;
    const saved = localStorage.getItem(tabStorageKey);
    if (saved === 'identity' || saved === 'tools' || saved === 'signals' || saved === 'analytics') {
      setActiveTab(saved);
    }
  }, [tabStorageKey]);

  React.useEffect(() => {
    if (!tabStorageKey) return;
    localStorage.setItem(tabStorageKey, activeTab);
  }, [tabStorageKey, activeTab]);

  if (!isLoversMode) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl glass border-white/20 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lovers-primary">Couple Hub</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-lovers-primary/20 bg-black/10 p-2 flex gap-2 overflow-x-auto">
            {[
              { id: 'identity', label: 'Identity' },
              { id: 'tools', label: 'Tools' },
              { id: 'signals', label: 'Signals' },
              { id: 'analytics', label: 'Analytics' },
            ].map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveTab(tab.id as 'identity' | 'tools' | 'signals' | 'analytics')}
                className={cn(
                  'h-7 rounded-full border-lovers-primary/25 text-lovers-primary whitespace-nowrap',
                  activeTab === tab.id && 'bg-lovers-primary/20 border-lovers-primary/50'
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="rounded-2xl border border-lovers-primary/20 bg-black/10 px-3 py-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onTogglePauseChat}
              className={cn('h-7 rounded-full border-lovers-primary/25 text-lovers-primary', isChatPaused && 'bg-lovers-primary/20 border-lovers-primary/45')}
            >
              {isChatPaused ? 'Resume Chat' : 'Pause Chat'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPanic}
              className="h-7 rounded-full border-amber-500/40 text-amber-500"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Panic
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">Partner attention: {partnerAttention}%</span>
          </div>

          {bothInactive && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
              You both disappeared 😶
            </div>
          )}

          {isChatPaused && pauseUntil && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Cooldown active until {new Date(pauseUntil).toLocaleTimeString()}.
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="rounded-xl border border-white/10 p-2">
              <p className="text-xs text-muted-foreground mb-2">Private Lovers Identity</p>
              <Input
                value={identity?.self?.nickname || ''}
                onChange={(e) => setIdentity((prev) => ({
                  ...(prev || {}),
                  self: { ...(prev?.self || {}), nickname: e.target.value }
                }))}
                placeholder="Your secret nickname"
                className="h-8 text-xs"
              />
              <Input
                value={identity?.self?.avatar_url || ''}
                onChange={(e) => setIdentity((prev) => ({
                  ...(prev || {}),
                  self: { ...(prev?.self || {}), avatar_url: e.target.value }
                }))}
                placeholder="Secret avatar URL"
                className="h-8 text-xs mt-2"
              />
              <Button type="button" size="sm" variant="outline" onClick={onSavePrivateIdentity} className="mt-2 h-7 text-xs border-lovers-primary/25 text-lovers-primary">
                Save identity
              </Button>
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="rounded-xl border border-white/10 p-2">
              <p className="text-xs text-muted-foreground mb-2">Silent Signals</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onSendSignal('miss_you')} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Miss you</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onSendSignal('thinking')} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Thinking</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onSendSignal('busy')} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Busy</Button>
                <Button type="button" size="sm" variant="outline" onClick={onRunRealitySync} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">
                  <MapPin className="w-3 h-3 mr-1" />
                  Reality Sync
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 truncate">Latest: {signals[0]?.signal_type || 'no signals yet'}</p>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 p-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <ListTodo className="w-3.5 h-3.5" /> Shared To-Do
                </div>
                <div className="flex gap-1">
                  <Input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Add task" className="h-7 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={onAddTodo} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Add</Button>
                </div>
                <div className="mt-2 space-y-1 max-h-24 overflow-auto">
                  {tools.todos.slice(-5).map((t) => (
                    <button key={t.id} type="button" onClick={() => onToggleTodo(t.id)} className={cn('w-full text-left text-xs rounded px-2 py-1 border', t.done ? 'line-through opacity-60 border-white/10' : 'border-lovers-primary/20')}>
                      {t.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <CalendarDays className="w-3.5 h-3.5" /> Event Planner
                </div>
                <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Date idea" className="h-7 text-xs mb-1" />
                <div className="flex gap-1">
                  <Input type="datetime-local" value={newEventAt} onChange={(e) => setNewEventAt(e.target.value)} className="h-7 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={onAddEvent} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Plan</Button>
                </div>
                <div className="mt-2 space-y-1 max-h-24 overflow-auto">
                  {tools.events.slice(-4).map((ev) => (
                    <p key={ev.id} className="text-xs px-2 py-1 rounded border border-white/10">
                      {ev.title} - {new Date(ev.at).toLocaleString()}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <Wallet className="w-3.5 h-3.5" /> Budget Tracker
                </div>
                <Input value={newBudgetTitle} onChange={(e) => setNewBudgetTitle(e.target.value)} placeholder="Trip / gift" className="h-7 text-xs mb-1" />
                <div className="flex gap-1">
                  <Input value={newBudgetAmount} onChange={(e) => setNewBudgetAmount(e.target.value)} type="number" placeholder="Amount" className="h-7 text-xs" />
                  <Button type="button" size="sm" variant="outline" onClick={onAddBudget} className="h-7 text-xs border-lovers-primary/25 text-lovers-primary">Track</Button>
                </div>
                <div className="mt-2 space-y-1 max-h-24 overflow-auto">
                  {tools.budgets.slice(-4).map((b) => (
                    <p key={b.id} className="text-xs px-2 py-1 rounded border border-white/10">
                      {b.title}: ${b.amount.toFixed(2)} (split ${(b.amount / 2).toFixed(2)})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 p-2 md:col-span-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Weekly Relationship Recap
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {recapLoading && <p>Refreshing recap...</p>}
                  {!recapLoading && weeklyRecap?.milestones?.first_chat && (
                    <p>First chapter started on {new Date(weeklyRecap.milestones.first_chat).toLocaleDateString()}.</p>
                  )}
                  <p>This week you shared {weeklyRecap?.message_count ?? weeklyMessageCount} messages.</p>
                  <p>
                    Time together: {weeklyRecap?.total_time_minutes ?? 0} min
                    {weeklyRecap ? ` (${weeklyRecap.active_chat_minutes} chat + ${weeklyRecap.call_minutes} calls)` : ''}
                  </p>
                  {weeklyRecap && <p>Surprises unlocked: {weeklyRecap.surprises_unlocked}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <Radar className="w-3.5 h-3.5" /> Relationship Analytics
                </div>
                <p className="text-xs text-muted-foreground">Peak talk hour: {peakHour !== null ? `${peakHour}:00` : 'Not enough data'}</p>
                <p className="text-xs text-muted-foreground">Mood trend: {moodTrend.happy >= moodTrend.low ? 'More happy chats ❤️' : 'Low mood detected - send warmth'}</p>
                <p className="text-xs text-muted-foreground">Weekly messages: {weeklyMessageCount}</p>
                <div className="mt-2 flex items-end gap-1 h-8">
                  {heatmapHours.map((h) => {
                    const count = hourlyCounts[h] || 0;
                    const height = Math.max(4, Math.min(28, count * 4));
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center">
                        <div className="w-full rounded-sm bg-lovers-primary/60" style={{ height }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-2">
                <div className="flex items-center gap-1 text-xs text-lovers-primary mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Challenges & Growth
                </div>
                <div className="space-y-2">
                  {tools.challenges.map((c) => (
                    <div key={c.id} className="text-xs border border-white/10 rounded p-2">
                      <p className="text-muted-foreground">{c.title}</p>
                      <div className="h-1.5 rounded bg-white/10 mt-1 overflow-hidden">
                        <div className="h-full bg-lovers-primary" style={{ width: `${Math.min(100, (c.progress / Math.max(1, c.target)) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">Reward: +{c.rewardXp} XP</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
