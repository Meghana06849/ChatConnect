import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Sparkles, ArrowLeft, Send, Zap, Shield, Clock, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface TruthOrDareGameProps {
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}

interface Game {
  id: string;
  player1_id: string;
  player2_id: string;
  current_turn: string;
  status: string;
  round: number;
}

interface Round {
  id: string;
  game_id: string;
  round_number: number;
  chooser_id: string;
  asker_id: string;
  choice_type: string | null;
  question: string | null;
  answer: string | null;
  status: string;
}

const TRUTH_SUGGESTIONS = [
  "What's the most romantic dream you've had about us?",
  "What's something you've always wanted to tell me but haven't?",
  "When did you first realize you were falling for me?",
  "What's your favorite memory of us together?",
  "What's one thing I do that makes your heart skip a beat?",
  "If we could go anywhere in the world together, where would you pick?",
  "What song reminds you of me and why?",
  "What's the sweetest thing I've ever done for you?",
];

const DARE_SUGGESTIONS = [
  "Send me the sweetest voice note right now 💕",
  "Write a 4-line love poem for me in 2 minutes",
  "Change your profile picture to our favorite photo for 24 hours",
  "Record yourself singing our song and send it",
  "Write 5 things you love about me in 60 seconds",
  "Send me the most romantic emoji sequence you can think of",
  "Describe your perfect date with me in detail",
  "Tell me your favorite thing about my personality",
];

export const TruthOrDareGame: React.FC<TruthOrDareGameProps> = ({
  partnerId,
  partnerName,
  onBack,
}) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [game, setGame] = useState<Game | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionInput, setQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserId = profile?.user_id;
  const isMyTurn = game?.current_turn === currentUserId;

  // Load or create game
  const loadRounds = useCallback(async (gameId: string) => {
    const { data } = await supabase
      .from('truth_dare_rounds')
      .select('*')
      .eq('game_id', gameId)
      .order('round_number', { ascending: true });

    if (data) {
      const typedRounds = data as unknown as Round[];
      setRounds(typedRounds);
      const active = typedRounds.find(r => r.status !== 'completed');
      setCurrentRound(active || null);
    }
  }, []);

  const loadGame = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: games } = await supabase
      .from('truth_dare_games')
      .select('*')
      .in('status', ['waiting', 'active'])
      .or(`and(player1_id.eq.${currentUserId},player2_id.eq.${partnerId}),and(player1_id.eq.${partnerId},player2_id.eq.${currentUserId})`);

    if (games && games.length > 0) {
      const g = games[0] as unknown as Game;
      setGame(g);
      await loadRounds(g.id);
    }
    setLoading(false);
  }, [currentUserId, partnerId, loadRounds]);

  useEffect(() => {
    if (!currentUserId) return;
    loadGame();
  }, [currentUserId, loadGame]);

  // Real-time subscriptions — reload full state on any change for consistency
  useEffect(() => {
    if (!game?.id) return;

    const gameChannel = supabase
      .channel(`game-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'truth_dare_games',
        filter: `id=eq.${game.id}`,
      }, (payload) => {
        if (payload.new) {
          const updated = payload.new as unknown as Game;
          setGame(updated);
          // If game was completed externally, clear state
          if (updated.status === 'completed') {
            setCurrentRound(null);
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'truth_dare_rounds',
        filter: `game_id=eq.${game.id}`,
      }, (payload) => {
        // Always reload rounds for consistency
        loadRounds(game.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(gameChannel); };
  }, [game?.id, loadRounds]);

  const startNewGame = async () => {
    if (!currentUserId || actionLoading) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase
        .from('truth_dare_games')
        .insert({
          player1_id: currentUserId,
          player2_id: partnerId,
          current_turn: currentUserId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      const g = data as unknown as Game;
      setGame(g);

      // Create first round
      const { error: roundError } = await supabase.from('truth_dare_rounds').insert({
        game_id: g.id,
        round_number: 1,
        chooser_id: currentUserId,
        asker_id: partnerId,
        status: 'choosing',
      });

      if (roundError) throw roundError;

      await loadRounds(g.id);
      toast({ title: 'Game Started! 🎮', description: `It's your turn to choose Truth or Dare!` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const chooseType = async (type: 'truth' | 'dare') => {
    if (!currentRound || !isMyTurn || currentRound.status !== 'choosing' || actionLoading) return;
    // Validate: only the chooser can choose
    if (currentRound.chooser_id !== currentUserId) return;

    setActionLoading(true);
    try {
      const { error: roundErr } = await supabase
        .from('truth_dare_rounds')
        .update({ choice_type: type, status: 'asking' })
        .eq('id', currentRound.id);

      if (roundErr) throw roundErr;

      // Turn passes to the asker (opponent)
      const { error: gameErr } = await supabase
        .from('truth_dare_games')
        .update({ current_turn: currentRound.asker_id })
        .eq('id', game!.id);

      if (gameErr) throw gameErr;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const sendQuestion = async () => {
    if (!currentRound || !isMyTurn || currentRound.status !== 'asking' || actionLoading) return;
    const q = questionInput.trim();
    if (!q) {
      toast({ title: 'Question required', description: 'Please type a question', variant: 'destructive' });
      return;
    }
    if (q.length > 200) {
      toast({ title: 'Too long', description: 'Question must be under 200 characters', variant: 'destructive' });
      return;
    }

    // Validate: only opponent (asker) can send question
    if (currentRound.asker_id !== currentUserId) return;

    setActionLoading(true);
    try {
      const { error: roundErr } = await supabase
        .from('truth_dare_rounds')
        .update({ question: q, status: 'answering' })
        .eq('id', currentRound.id);

      if (roundErr) throw roundErr;

      // Turn passes back to chooser to answer
      const { error: gameErr } = await supabase
        .from('truth_dare_games')
        .update({ current_turn: currentRound.chooser_id })
        .eq('id', game!.id);

      if (gameErr) throw gameErr;

      setQuestionInput('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentRound || !isMyTurn || currentRound.status !== 'answering' || actionLoading) return;
    const a = answerInput.trim();
    if (!a) {
      toast({ title: 'Answer required', variant: 'destructive' });
      return;
    }

    // Validate: only chooser can answer
    if (currentRound.chooser_id !== currentUserId) return;

    setActionLoading(true);
    try {
      // Complete round
      const { error: roundErr } = await supabase
        .from('truth_dare_rounds')
        .update({ answer: a, status: 'completed' })
        .eq('id', currentRound.id);

      if (roundErr) throw roundErr;

      // Next round: swap roles
      const nextRound = (game?.round || 1) + 1;
      const nextChooser = currentRound.asker_id;
      const nextAsker = currentRound.chooser_id;

      const { error: gameErr } = await supabase
        .from('truth_dare_games')
        .update({ round: nextRound, current_turn: nextChooser })
        .eq('id', game!.id);

      if (gameErr) throw gameErr;

      // Create next round
      const { error: nextRoundErr } = await supabase.from('truth_dare_rounds').insert({
        game_id: game!.id,
        round_number: nextRound,
        chooser_id: nextChooser,
        asker_id: nextAsker,
        status: 'choosing',
      });

      if (nextRoundErr) throw nextRoundErr;

      setAnswerInput('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const applySuggestion = (text: string) => {
    setQuestionInput(text);
  };

  const fetchAiSuggestions = async () => {
    if (!currentRound?.choice_type) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-question', {
        body: { type: currentRound.choice_type },
      });
      if (error) throw error;
      if (data?.questions) {
        setAiSuggestions(data.questions);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to generate';
      toast({ title: 'AI Error', description: message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const endGame = async () => {
    if (!game) return;
    await supabase
      .from('truth_dare_games')
      .update({ status: 'completed' })
      .eq('id', game.id);
    setGame(null);
    setCurrentRound(null);
    setRounds([]);
    toast({ title: 'Game Ended 💕', description: `You played ${game.round} rounds!` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Heart className="w-8 h-8 animate-pulse text-[hsl(var(--lovers-primary))]" />
      </div>
    );
  }

  // No active game — show start screen
  if (!game) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Sparkles className="w-16 h-16 text-[hsl(var(--lovers-primary))] animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] bg-clip-text text-transparent">
            Truth or Dare 💕
          </h1>
          <p className="text-white/60 text-sm">
            A romantic game just for you and {partnerName}
          </p>
        </div>

        <Card className="border-[hsl(var(--lovers-primary))]/20" style={{
          background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.6), hsla(270 30% 12% / 0.6))',
          backdropFilter: 'blur(12px)',
        }}>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>Take turns choosing Truth or Dare</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>Your partner sends romantic questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>Private — only between you two</span>
              </div>
            </div>

            <Button
              onClick={startNewGame}
              disabled={actionLoading}
              className="w-full bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] hover:opacity-90 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active game
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-center">
          <p className="text-xs text-white/50">Round {game.round}</p>
          <p className="text-sm font-medium text-white/80">
            {isMyTurn ? '✨ Your Turn' : `⏳ ${partnerName}'s Turn`}
          </p>
        </div>
        <Button variant="ghost" onClick={endGame} className="text-white/50 hover:text-red-400" size="sm">
          End
        </Button>
      </div>

      {/* Current round action */}
      {currentRound && (
        <Card className="border-[hsl(var(--lovers-primary))]/20 overflow-hidden" style={{
          background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.7), hsla(270 30% 12% / 0.7))',
          backdropFilter: 'blur(12px)',
        }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white/90 flex items-center gap-2">
              {currentRound.status === 'choosing' && <Zap className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />}
              {currentRound.status === 'asking' && <Send className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />}
              {currentRound.status === 'answering' && <Heart className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />}
              {currentRound.status === 'choosing' && (isMyTurn ? 'Choose Truth or Dare!' : `${partnerName} is choosing...`)}
              {currentRound.status === 'asking' && (isMyTurn
                ? `Send a ${currentRound.choice_type} question!`
                : `${partnerName} is writing a question...`)}
              {currentRound.status === 'answering' && (isMyTurn
                ? `Answer the ${currentRound.choice_type}!`
                : `${partnerName} is answering...`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* CHOOSING PHASE */}
            {currentRound.status === 'choosing' && isMyTurn && (
              <div className="flex gap-3">
                <Button
                  onClick={() => chooseType('truth')}
                  disabled={actionLoading}
                  className="flex-1 h-20 text-lg bg-gradient-to-br from-blue-500/80 to-blue-700/80 hover:from-blue-500 hover:to-blue-700 border border-blue-400/30"
                >
                  💭 Truth
                </Button>
                <Button
                  onClick={() => chooseType('dare')}
                  disabled={actionLoading}
                  className="flex-1 h-20 text-lg bg-gradient-to-br from-[hsl(var(--lovers-primary))]/80 to-[hsl(var(--lovers-secondary))]/80 hover:opacity-90 border border-[hsl(var(--lovers-primary))]/30"
                >
                  🔥 Dare
                </Button>
              </div>
            )}

            {currentRound.status === 'choosing' && !isMyTurn && (
              <div className="flex items-center justify-center py-6">
                <Clock className="w-6 h-6 text-[hsl(var(--lovers-primary))] animate-pulse mr-2" />
                <span className="text-white/60">Waiting for {partnerName}...</span>
              </div>
            )}

            {/* ASKING PHASE */}
            {currentRound.status === 'asking' && isMyTurn && (
              <div className="space-y-3">
                <div className="px-3 py-1.5 rounded-lg text-xs text-center text-white/50" style={{
                  background: 'hsla(320 40% 20% / 0.5)',
                }}>
                  {partnerName} chose <span className="font-bold text-[hsl(var(--lovers-primary))]">{currentRound.choice_type?.toUpperCase()}</span>
                </div>

                <Textarea
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value.slice(0, 200))}
                  placeholder={`Ask a ${currentRound.choice_type} question...`}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  rows={2}
                />
                <p className="text-[10px] text-white/30 text-right">{questionInput.length}/200</p>

                <div className="flex gap-2">
                  <Button
                    onClick={sendQuestion}
                    disabled={!questionInput.trim() || actionLoading}
                    className="flex-1 bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] hover:opacity-90"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Question
                  </Button>
                  <Button
                    onClick={fetchAiSuggestions}
                    disabled={aiLoading}
                    variant="outline"
                    className="border-[hsl(var(--lovers-primary))]/30 text-[hsl(var(--lovers-primary))] hover:bg-[hsl(var(--lovers-primary))]/10"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    <span className="ml-1 text-xs">AI</span>
                  </Button>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-[hsl(var(--lovers-primary))] uppercase tracking-wider flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> AI Suggestions
                    </p>
                    <div className="space-y-1.5">
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(s)}
                          className="block w-full text-left text-[11px] px-3 py-2 rounded-lg text-white/70 hover:text-white/90 transition-colors"
                          style={{
                            background: 'linear-gradient(135deg, hsla(280 40% 20% / 0.5), hsla(320 40% 25% / 0.5))',
                            border: '1px solid hsla(320 60% 50% / 0.2)',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Suggestions */}
                <div className="space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Quick picks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(currentRound.choice_type === 'truth' ? TRUTH_SUGGESTIONS : DARE_SUGGESTIONS)
                      .slice(0, 4)
                      .map((s, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(s)}
                          className="text-[11px] px-2 py-1 rounded-full text-white/60 hover:text-white/90 transition-colors"
                          style={{
                            background: 'hsla(320 40% 25% / 0.5)',
                            border: '1px solid hsla(320 60% 50% / 0.15)',
                          }}
                        >
                          {s.slice(0, 40)}{s.length > 40 ? '…' : ''}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {currentRound.status === 'asking' && !isMyTurn && (
              <div className="text-center py-6">
                <p className="text-sm text-white/50 mb-1">
                  You chose <span className="font-bold text-[hsl(var(--lovers-primary))]">{currentRound.choice_type?.toUpperCase()}</span>
                </p>
                <Clock className="w-6 h-6 text-[hsl(var(--lovers-primary))] animate-pulse mx-auto" />
                <p className="text-xs text-white/40 mt-1">{partnerName} is writing a question...</p>
              </div>
            )}

            {/* ANSWERING PHASE */}
            {currentRound.status === 'answering' && (
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-xl" style={{
                  background: 'hsla(280 40% 20% / 0.6)',
                  border: '1px solid hsla(320 60% 50% / 0.2)',
                }}>
                  <p className="text-[10px] text-white/40 mb-1">
                    {currentRound.choice_type?.toUpperCase()} from {currentRound.asker_id === currentUserId ? 'you' : partnerName}
                  </p>
                  <p className="text-sm text-white/90">{currentRound.question}</p>
                </div>

                {isMyTurn ? (
                  <>
                    <Textarea
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Type your answer..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                      rows={3}
                    />
                    <Button
                      onClick={submitAnswer}
                      disabled={!answerInput.trim() || actionLoading}
                      className="w-full bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] hover:opacity-90"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="w-6 h-6 text-[hsl(var(--lovers-primary))] animate-pulse mx-auto" />
                    <p className="text-xs text-white/40 mt-1">{partnerName} is answering...</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed rounds history */}
      {rounds.filter(r => r.status === 'completed').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider px-1">Previous Rounds</p>
          {rounds.filter(r => r.status === 'completed').reverse().map((r) => (
            <Card key={r.id} className="border-white/5" style={{
              background: 'hsla(270 30% 12% / 0.5)',
              backdropFilter: 'blur(8px)',
            }}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">Round {r.round_number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                    background: r.choice_type === 'truth'
                      ? 'hsla(210 60% 40% / 0.3)'
                      : 'hsla(320 60% 40% / 0.3)',
                    color: r.choice_type === 'truth'
                      ? 'hsl(210 70% 70%)'
                      : 'hsl(320 70% 70%)',
                  }}>
                    {r.choice_type === 'truth' ? '💭' : '🔥'} {r.choice_type}
                  </span>
                </div>
                <p className="text-xs text-white/60">Q: {r.question}</p>
                <p className="text-xs text-white/80">A: {r.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
