import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ArrowLeft, Sparkles, CheckCircle2, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface LoveQuizGameProps {
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  category: string;
  options: string[];
}

interface QuizGame {
  id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  compatibility_score: number | null;
  total_questions: number;
}

interface QuizAnswer {
  id: string;
  game_id: string;
  question_id: string;
  user_id: string;
  answer: string;
}

export const LoveQuizGame: React.FC<LoveQuizGameProps> = ({
  partnerId,
  partnerName,
  onBack,
}) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [game, setGame] = useState<QuizGame | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMutuallyLinked, setIsMutuallyLinked] = useState(false);

  const currentUserId = profile?.user_id;
  const myAnswers = answers.filter(a => a.user_id === currentUserId);
  const partnerAnswers = answers.filter(a => a.user_id === partnerId);
  const totalQ = questions.length;
  const iFinished = myAnswers.length >= totalQ && totalQ > 0;
  const partnerFinished = partnerAnswers.length >= totalQ && totalQ > 0;
  const bothFinished = iFinished && partnerFinished;

  // Calculate compatibility
  const compatibilityScore = useCallback(() => {
    if (!bothFinished || totalQ === 0) return null;
    let matches = 0;
    for (const q of questions) {
      const my = myAnswers.find(a => a.question_id === q.id);
      const their = partnerAnswers.find(a => a.question_id === q.id);
      if (my && their && my.answer === their.answer) matches++;
    }
    return Math.round((matches / totalQ) * 100);
  }, [bothFinished, totalQ, questions, myAnswers, partnerAnswers]);

  // Load or create game
  const loadQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('love_quiz_questions')
      .select('*')
      .limit(10);
    if (data) {
      setQuestions(data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })) as QuizQuestion[]);
    }
  }, []);

  const loadAnswers = useCallback(async (gameId: string) => {
    const { data } = await supabase
      .from('love_quiz_answers')
      .select('*')
      .eq('game_id', gameId);
    if (data) {
      const typedAnswers = data as unknown as QuizAnswer[];
      setAnswers(typedAnswers);
      // Set current index to first unanswered
      const myIds = new Set(typedAnswers.filter((answer) => answer.user_id === currentUserId).map((answer) => answer.question_id));
      const idx = questions.findIndex(q => !myIds.has(q.id));
      if (idx >= 0) setCurrentIdx(idx);
    }
  }, [currentUserId, questions]);

  useEffect(() => {
    if (!currentUserId || !partnerId) return;

    const checkMutualLink = async () => {
      const { data, error } = await supabase.rpc('are_linked_lovers', {
        _user_a: currentUserId,
        _user_b: partnerId,
      });

      if (error) {
        setIsMutuallyLinked(false);
        return;
      }

      setIsMutuallyLinked(Boolean(data));
    };

    checkMutualLink();
  }, [currentUserId, partnerId]);

  const loadGame = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: games } = await supabase
      .from('love_quiz_games')
      .select('*')
      .eq('status', 'active')
      .or(`and(player1_id.eq.${currentUserId},player2_id.eq.${partnerId}),and(player1_id.eq.${partnerId},player2_id.eq.${currentUserId})`);

    if (games && games.length > 0) {
      const g = games[0] as unknown as QuizGame;
      setGame(g);
      await loadQuestions();
      await loadAnswers(g.id);
    } else {
      await loadQuestions();
    }
    setLoading(false);
  }, [currentUserId, partnerId, loadQuestions, loadAnswers]);

  useEffect(() => {
    if (!currentUserId) return;
    loadGame();
  }, [currentUserId, loadGame]);

  // Real-time subscriptions
  useEffect(() => {
    if (!game?.id) return;

    const channel = supabase
      .channel(`quiz-${game.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'love_quiz_answers',
        filter: `game_id=eq.${game.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAnswer = payload.new as unknown as QuizAnswer;
          setAnswers(prev => {
            if (prev.some(a => a.id === newAnswer.id)) return prev;
            return [...prev, newAnswer];
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'love_quiz_games',
        filter: `id=eq.${game.id}`,
      }, (payload) => {
        setGame(payload.new as unknown as QuizGame);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  // Auto-complete game when both finish
  useEffect(() => {
    if (!bothFinished || !game || game.status === 'completed') return;
    const score = compatibilityScore();
    if (score === null) return;

    supabase
      .from('love_quiz_games')
      .update({ status: 'completed', compatibility_score: score })
      .eq('id', game.id)
      .then();
  }, [bothFinished, game, compatibilityScore]);

  const startNewGame = async () => {
    if (!currentUserId || questions.length === 0) return;

    if (!isMutuallyLinked) {
      toast({
        title: 'Quiz locked',
        description: `${partnerName} must link you back in Lovers Mode before starting Love Quiz.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('love_quiz_games')
      .insert({
        player1_id: currentUserId,
        player2_id: partnerId,
        status: 'active',
        total_questions: questions.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setGame(data as unknown as QuizGame);
    setAnswers([]);
    setCurrentIdx(0);
    setLoading(false);
    toast({ title: 'Quiz Started! 💕', description: `Answer ${questions.length} questions about love!` });
  };

  const submitAnswer = async (answer: string) => {
    if (!game || !currentUserId || submitting || iFinished) return;
    const question = questions[currentIdx];
    if (!question) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('love_quiz_answers')
      .insert({
        game_id: game.id,
        question_id: question.id,
        user_id: currentUserId,
        answer,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Move to next question
    if (currentIdx + 1 < totalQ) {
      setCurrentIdx(i => i + 1);
    }
    setSubmitting(false);
  };

  const endGame = async () => {
    if (!game) return;
    await supabase
      .from('love_quiz_games')
      .update({ status: 'completed', compatibility_score: compatibilityScore() })
      .eq('id', game.id);
    setGame(null);
    setAnswers([]);
    setCurrentIdx(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Heart className="w-8 h-8 animate-pulse text-[hsl(var(--lovers-primary))]" />
      </div>
    );
  }

  // No active game
  if (!game) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-center space-y-4">
          <Sparkles className="w-16 h-16 text-[hsl(var(--lovers-primary))] animate-pulse mx-auto" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] bg-clip-text text-transparent">
            Love Quiz 💕
          </h1>
          <p className="text-white/60 text-sm">
            Answer questions separately, then see how compatible you are with {partnerName}!
          </p>
        </div>
        <Card className="border-[hsl(var(--lovers-primary))]/20" style={{
          background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.6), hsla(270 30% 12% / 0.6))',
          backdropFilter: 'blur(12px)',
        }}>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>Both partners answer {questions.length} questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>See your compatibility score</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--lovers-primary))]" />
                <span>Compare answers side by side</span>
              </div>
            </div>
            <Button
              onClick={startNewGame}
              disabled={!isMutuallyLinked || questions.length === 0}
              className="w-full bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] hover:opacity-90 text-white"
            >
              <Heart className="w-4 h-4 mr-2" /> Start Quiz
            </Button>
            {!isMutuallyLinked && (
              <p className="text-xs text-white/60 text-center">
                Locked until both partners complete Lovers Mode linking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (bothFinished) {
    const score = compatibilityScore() ?? 0;
    const emoji = score >= 80 ? '💖' : score >= 60 ? '💕' : score >= 40 ? '💛' : '💔';

    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center space-y-3">
          <div className="text-6xl">{emoji}</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] bg-clip-text text-transparent">
            {score}% Compatible
          </h2>
          <p className="text-white/60 text-sm">
            {score >= 80 ? 'Soulmates! You think alike!' : score >= 60 ? 'Great connection!' : score >= 40 ? 'Opposites attract!' : 'Keep learning about each other!'}
          </p>
        </div>

        {/* Answer comparison */}
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider px-1">Answer Comparison</p>
          {questions.map((q) => {
            const my = myAnswers.find(a => a.question_id === q.id);
            const their = partnerAnswers.find(a => a.question_id === q.id);
            const match = my && their && my.answer === their.answer;
            return (
              <Card key={q.id} className="border-white/5" style={{
                background: match ? 'hsla(140 40% 15% / 0.4)' : 'hsla(270 30% 12% / 0.5)',
                backdropFilter: 'blur(8px)',
              }}>
                <CardContent className="p-3 space-y-1.5">
                  <p className="text-xs text-white/50">{q.question_text}</p>
                  <div className="flex justify-between text-xs gap-2">
                    <div className="flex-1">
                      <span className="text-white/30">You: </span>
                      <span className="text-white/80">{my?.answer || '—'}</span>
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-white/30">{partnerName}: </span>
                      <span className="text-white/80">{their?.answer || '—'}</span>
                    </div>
                  </div>
                  {match && <span className="text-[10px] text-green-400">✓ Match!</span>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={endGame} variant="outline" className="flex-1 border-white/10 text-white/60">
            End Quiz
          </Button>
          <Button
            onClick={async () => { await endGame(); await startNewGame(); }}
            className="flex-1 bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] hover:opacity-90"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Active game — answering
  const currentQuestion = questions[currentIdx];

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-center">
          <p className="text-xs text-white/50">Question {currentIdx + 1}/{totalQ}</p>
          <p className="text-sm font-medium text-white/80">
            {iFinished ? `⏳ Waiting for ${partnerName}` : '✨ Your turn'}
          </p>
        </div>
        <Button variant="ghost" onClick={endGame} className="text-white/50 hover:text-red-400" size="sm">
          End
        </Button>
      </div>

      {/* Progress bars */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-white/40">
          <span>You: {myAnswers.length}/{totalQ}</span>
          <span>{partnerName}: {partnerAnswers.length}/{totalQ}</span>
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[hsl(var(--lovers-primary))] transition-all" style={{ width: `${(myAnswers.length / totalQ) * 100}%` }} />
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[hsl(var(--lovers-secondary))] transition-all" style={{ width: `${(partnerAnswers.length / totalQ) * 100}%` }} />
          </div>
        </div>
      </div>

      {iFinished ? (
        <Card className="border-[hsl(var(--lovers-primary))]/20" style={{
          background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.7), hsla(270 30% 12% / 0.7))',
          backdropFilter: 'blur(12px)',
        }}>
          <CardContent className="p-6 text-center space-y-3">
            <Clock className="w-8 h-8 text-[hsl(var(--lovers-primary))] animate-pulse mx-auto" />
            <h3 className="text-lg font-semibold text-white/90">You're done!</h3>
            <p className="text-sm text-white/60">Waiting for {partnerName} to finish ({partnerAnswers.length}/{totalQ})...</p>
          </CardContent>
        </Card>
      ) : currentQuestion ? (
        <Card className="border-[hsl(var(--lovers-primary))]/20 overflow-hidden" style={{
          background: 'linear-gradient(135deg, hsla(320 40% 15% / 0.7), hsla(270 30% 12% / 0.7))',
          backdropFilter: 'blur(12px)',
        }}>
          <CardHeader className="pb-2">
            <Badge className="w-fit text-[10px]" style={{
              background: 'hsla(320 40% 25% / 0.5)',
              color: 'hsl(320 70% 70%)',
            }}>
              {currentQuestion.category}
            </Badge>
            <CardTitle className="text-base text-white/90 mt-2">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentQuestion.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => submitAnswer(opt)}
                disabled={submitting}
                className="block w-full text-left text-sm px-4 py-3 rounded-xl text-white/80 hover:text-white transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, hsla(280 40% 20% / 0.5), hsla(320 40% 25% / 0.5))',
                  border: '1px solid hsla(320 60% 50% / 0.2)',
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                {opt}
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
