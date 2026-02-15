import React, { useState, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Gamepad2, 
  Play, 
  RotateCcw,
  Heart,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Love Quiz Game ───
const loveQuizQuestions = [
  { q: "What's most important in a relationship?", options: ["Trust", "Communication", "Humor", "Adventure"], answer: 1 },
  { q: "Best date night activity?", options: ["Cooking together", "Stargazing", "Movie marathon", "Dancing"], answer: 0 },
  { q: "How do you show love?", options: ["Words", "Gifts", "Quality time", "Acts of service"], answer: 2 },
  { q: "Ideal weekend together?", options: ["Road trip", "Stay in bed", "Explore a new city", "Game night"], answer: 3 },
  { q: "Most romantic gesture?", options: ["Love letter", "Surprise trip", "Breakfast in bed", "Slow dance"], answer: 0 },
];

const LoveQuizGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    const correct = idx === loveQuizQuestions[qIdx].answer;
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 < loveQuizQuestions.length) {
        setQIdx(q => q + 1);
        setSelected(null);
      } else {
        setFinished(true);
      }
    }, 800);
  };

  const restart = () => { setQIdx(0); setScore(0); setSelected(null); setFinished(false); };

  if (finished) {
    return (
      <div className="text-center space-y-6 p-6">
        <div className="text-6xl mb-4">{score >= 4 ? '💖' : score >= 2 ? '💕' : '💔'}</div>
        <h2 className="text-2xl font-bold">You scored {score}/{loveQuizQuestions.length}</h2>
        <p className="text-muted-foreground">{score >= 4 ? 'Soulmate level!' : score >= 2 ? 'Getting there!' : 'Keep learning about each other!'}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={restart} className="btn-lovers"><RotateCcw className="w-4 h-4 mr-2" />Play Again</Button>
          <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </div>
      </div>
    );
  }

  const q = loveQuizQuestions[qIdx];
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Badge className="bg-lovers-primary/20 text-lovers-primary">{qIdx + 1}/{loveQuizQuestions.length}</Badge>
      </div>
      <div className="text-center">
        <div className="text-4xl mb-4">❤️</div>
        <h3 className="text-xl font-semibold mb-6">{q.q}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
        {q.options.map((opt, i) => (
          <Button
            key={i}
            variant="outline"
            onClick={() => selected === null && handleAnswer(i)}
            disabled={selected !== null}
            className={cn(
              "py-6 text-base transition-all",
              selected === i && i === q.answer && "bg-green-500/20 border-green-500 text-green-400",
              selected === i && i !== q.answer && "bg-red-500/20 border-red-500 text-red-400",
              selected !== null && i === q.answer && selected !== i && "bg-green-500/10 border-green-500/50"
            )}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
};

// ─── Truth or Dare Game ───
const truths = [
  "What's your favorite memory of us?",
  "What did you first notice about me?",
  "What's something you've never told me?",
  "When did you know you loved me?",
  "What's your biggest dream for us?",
  "What's the most romantic thing someone could do?",
  "What song reminds you of me?",
  "What's your love language?",
];
const dares = [
  "Send a voice message saying 'I love you' in 3 languages",
  "Write a 4-line poem about us right now",
  "Change your profile picture to a photo of us for 24 hours",
  "Send me your most embarrassing selfie",
  "Describe your perfect date in detail",
  "Record yourself singing our song",
  "Send a love letter in the chat right now",
  "Share your phone's last saved photo",
];

const TruthOrDareGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'choose' | 'truth' | 'dare'>('choose');
  const [current, setCurrent] = useState('');
  const [used, setUsed] = useState<Set<string>>(new Set());

  const pick = (type: 'truth' | 'dare') => {
    const pool = (type === 'truth' ? truths : dares).filter(x => !used.has(x));
    if (pool.length === 0) { setUsed(new Set()); return; }
    const item = pool[Math.floor(Math.random() * pool.length)];
    setUsed(prev => new Set(prev).add(item));
    setCurrent(item);
    setMode(type);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Badge className="bg-lovers-primary/20 text-lovers-primary">🎭 Truth or Dare</Badge>
      </div>

      {mode === 'choose' ? (
        <div className="text-center space-y-8 py-8">
          <div className="text-6xl">🎭</div>
          <h3 className="text-2xl font-bold">Choose your fate!</h3>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => pick('truth')} className="btn-lovers px-8 py-6 text-lg">💬 Truth</Button>
            <Button onClick={() => pick('dare')} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-6 text-lg rounded-2xl shadow-lg hover:scale-105 transition-transform">🔥 Dare</Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6 py-6">
          <div className="text-5xl">{mode === 'truth' ? '💬' : '🔥'}</div>
          <Badge className={mode === 'truth' ? 'bg-lovers-primary/20 text-lovers-primary' : 'bg-orange-500/20 text-orange-400'}>
            {mode === 'truth' ? 'TRUTH' : 'DARE'}
          </Badge>
          <p className="text-xl font-medium max-w-sm mx-auto leading-relaxed">{current}</p>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={() => setMode('choose')} variant="outline">Next Round</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Spin the Wheel Game ───
const spinOptions = [
  "Kiss 💋", "Compliment 💝", "Hug 🤗", "Dance 💃",
  "Song 🎵", "Massage 💆", "Cook 🍳", "Surprise 🎁"
];

const SpinGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const extraSpins = 360 * (3 + Math.floor(Math.random() * 3));
    const finalAngle = Math.floor(Math.random() * 360);
    const total = rotation + extraSpins + finalAngle;
    setRotation(total);
    
    setTimeout(() => {
      const idx = Math.floor(((360 - (total % 360)) / 360) * spinOptions.length) % spinOptions.length;
      setResult(spinOptions[idx]);
      setSpinning(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Badge className="bg-lovers-primary/20 text-lovers-primary">🎡 Spin the Wheel</Badge>
      </div>
      
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Wheel */}
        <div className="relative w-64 h-64">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>
          <div 
            className="w-full h-full rounded-full border-4 border-lovers-primary/30 overflow-hidden relative"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            {spinOptions.map((opt, i) => {
              const angle = (360 / spinOptions.length) * i;
              const hue = (360 / spinOptions.length) * i;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full flex items-start justify-center pt-4"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <span className="text-xs font-bold px-1 text-center leading-tight" style={{ color: `hsl(${hue}, 70%, 60%)` }}>
                    {opt}
                  </span>
                </div>
              );
            })}
            {/* Wheel lines */}
            {spinOptions.map((_, i) => (
              <div
                key={`line-${i}`}
                className="absolute top-0 left-1/2 w-px h-1/2 bg-white/20 origin-bottom"
                style={{ transform: `rotate(${(360 / spinOptions.length) * i}deg)` }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-lovers-primary flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={spin} disabled={spinning} className="btn-lovers px-8 py-4 text-lg">
          {spinning ? '🎡 Spinning...' : '💫 Spin!'}
        </Button>

        {result && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-3xl mb-2">{result}</p>
            <p className="text-muted-foreground">You must do this for your partner!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Quick Math Game (General) ───
const QuickMathGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', answer: 0 });
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 50) + 1;
    let b = Math.floor(Math.random() * 20) + 1;
    let answer = 0;
    if (op === '+') answer = a + b;
    else if (op === '-') { if (b > a) [a, b] = [b, a]; answer = a - b; }
    else { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; answer = a * b; }
    setProblem({ a, b, op, answer });
    setInput('');
  }, []);

  const start = () => { setStarted(true); setScore(0); setTimeLeft(30); setFinished(false); generateProblem(); };

  React.useEffect(() => {
    if (!started || finished) return;
    if (timeLeft <= 0) { setFinished(true); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, finished]);

  const checkAnswer = () => {
    if (parseInt(input) === problem.answer) {
      setScore(s => s + 1);
      generateProblem();
    } else {
      setInput('');
    }
  };

  if (!started || finished) {
    return (
      <div className="text-center space-y-6 p-6">
        <div className="text-6xl">🧮</div>
        {finished && <h2 className="text-2xl font-bold">Score: {score} 🎉</h2>}
        <Button onClick={start} className="btn-general"><Play className="w-4 h-4 mr-2" />{finished ? 'Play Again' : 'Start'}</Button>
        <Button variant="outline" onClick={onBack} className="ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 text-center">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <div className="flex gap-3">
          <Badge className="bg-general-primary/20 text-general-primary">Score: {score}</Badge>
          <Badge variant="outline">{timeLeft}s</Badge>
        </div>
      </div>
      <h3 className="text-4xl font-bold">{problem.a} {problem.op} {problem.b} = ?</h3>
      <div className="flex justify-center gap-2 max-w-xs mx-auto">
        <input
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkAnswer()}
          className="flex-1 text-center text-2xl p-3 rounded-xl bg-white/10 border border-white/20 outline-none"
          autoFocus
        />
        <Button onClick={checkAnswer} className="btn-general">✓</Button>
      </div>
    </div>
  );
};

// ─── Tic Tac Toe (General) ───
const TicTacToeGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  
  const checkWinner = (b: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    return null;
  };
  
  const winner = checkWinner(board);
  const isDraw = !winner && board.every(Boolean);
  
  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };
  
  return (
    <div className="space-y-6 p-4 text-center">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Badge className="bg-general-primary/20 text-general-primary">⭕ Tic Tac Toe</Badge>
      </div>
      <h3 className="text-xl font-semibold">
        {winner ? `${winner} wins! 🎉` : isDraw ? "It's a draw!" : `${xIsNext ? 'X' : 'O'}'s turn`}
      </h3>
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={cn(
              "w-20 h-20 rounded-xl text-3xl font-bold transition-all",
              "bg-white/10 hover:bg-white/20 border border-white/20",
              cell === 'X' && "text-general-primary",
              cell === 'O' && "text-general-secondary"
            )}
          >
            {cell}
          </button>
        ))}
      </div>
      {(winner || isDraw) && (
        <Button onClick={() => { setBoard(Array(9).fill(null)); setXIsNext(true); }} className="btn-general">
          <RotateCcw className="w-4 h-4 mr-2" />Play Again
        </Button>
      )}
    </div>
  );
};

// ─── Word Chain (General) ───
const WordChainGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [words, setWords] = useState<string[]>(['hello']);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);

  const submit = () => {
    const word = input.trim().toLowerCase();
    if (!word) return;
    const lastWord = words[words.length - 1];
    const lastChar = lastWord[lastWord.length - 1];
    
    if (word[0] !== lastChar) {
      setError(`Word must start with "${lastChar}"`);
      return;
    }
    if (words.includes(word)) {
      setError('Word already used!');
      return;
    }
    if (word.length < 2) {
      setError('Word too short!');
      return;
    }
    
    setWords(prev => [...prev, word]);
    setScore(s => s + word.length);
    setInput('');
    setError('');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Badge className="bg-general-primary/20 text-general-primary">Score: {score}</Badge>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">🔤 Word Chain</h3>
        <p className="text-muted-foreground text-sm">Type a word starting with the last letter</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
        {words.map((w, i) => (
          <Badge key={i} variant="outline" className="text-sm">{w}</Badge>
        ))}
      </div>
      <div className="text-center text-2xl font-bold">
        Next letter: <span className="text-general-primary">{words[words.length - 1].slice(-1).toUpperCase()}</span>
      </div>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      <div className="flex gap-2 max-w-xs mx-auto">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Type a word..."
          className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 outline-none text-center"
          autoFocus
        />
        <Button onClick={submit} className="btn-general">Go</Button>
      </div>
    </div>
  );
};

// ─── Main GamesHub ───
interface GameDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const generalGames: GameDef[] = [
  { id: 'wordchain', title: 'Word Chain', description: 'Create words from the last letter', icon: '🔤', category: 'puzzle', difficulty: 'easy' },
  { id: 'quickmath', title: 'Quick Math', description: 'Fast calculation challenges', icon: '🧮', category: 'arcade', difficulty: 'medium' },
  { id: 'tictactoe', title: 'Tic Tac Toe', description: 'Classic strategy game', icon: '⭕', category: 'strategy', difficulty: 'easy' },
];

const loversGames: GameDef[] = [
  { id: 'lovequiz', title: 'Love Quiz', description: 'How well do you know each other?', icon: '❤️', category: 'romance', difficulty: 'medium' },
  { id: 'truthdare', title: 'Truth or Dare', description: 'Romantic edition for couples', icon: '🎭', category: 'couples', difficulty: 'easy' },
  { id: 'spin', title: 'Spin the Wheel', description: 'Spin for romantic challenges!', icon: '🎡', category: 'romance', difficulty: 'easy' },
];

export const GamesHub: React.FC = () => {
  const { mode } = useChat();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const isLoversMode = mode === 'lovers';
  const games = isLoversMode ? loversGames : generalGames;

  const getDifficultyBadge = (d: string) => {
    const c: Record<string, string> = { easy: 'bg-green-500/20 text-green-500', medium: 'bg-yellow-500/20 text-yellow-500', hard: 'bg-red-500/20 text-red-500' };
    return c[d] || c.easy;
  };

  const renderGame = () => {
    const onBack = () => setActiveGame(null);
    switch (activeGame) {
      case 'lovequiz': return <LoveQuizGame onBack={onBack} />;
      case 'truthdare': return <TruthOrDareGame onBack={onBack} />;
      case 'spin': return <SpinGame onBack={onBack} />;
      case 'quickmath': return <QuickMathGame onBack={onBack} />;
      case 'tictactoe': return <TicTacToeGame onBack={onBack} />;
      case 'wordchain': return <WordChainGame onBack={onBack} />;
      default: return null;
    }
  };

  if (activeGame) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Card className="glass border-white/20">
            <CardContent className="p-0">
              {renderGame()}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
            isLoversMode ? "bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20" : "bg-gradient-to-br from-general-primary/20 to-general-secondary/20"
          )}>
            <Gamepad2 className={cn("w-10 h-10", isLoversMode ? "text-lovers-primary" : "text-general-primary")} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{isLoversMode ? 'Love Games' : 'Games Hub'}</h1>
          <p className="text-muted-foreground text-sm">{isLoversMode ? 'Play romantic games together' : 'Fun games to play with friends'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card key={game.id} className="glass border-white/20 hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1" onClick={() => setActiveGame(game.id)}>
              <CardHeader className="text-center pb-2">
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{game.icon}</div>
                <CardTitle className="text-lg">{game.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{game.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center mb-3">
                  <Badge className={getDifficultyBadge(game.difficulty)}>{game.difficulty}</Badge>
                </div>
                <Button className={cn("w-full", isLoversMode ? "btn-lovers" : "btn-general")}>
                  <Play className="w-4 h-4 mr-2" />Play Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
