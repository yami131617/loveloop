"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Trophy, Heart, Gamepad2, Check, X } from "lucide-react";
import { api, hasToken } from "@/lib/api";
import { QUESTIONS } from "@/lib/quizBank";

type Phase = "intro" | "playing" | "result";

export default function QuizPlayPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timer, setTimer] = useState(10);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<{ winner_id: string; total_games: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasToken()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (picked !== null) return;
    if (timer <= 0) {
      // Ran out — auto wrong
      commitAnswer(null);
      return;
    }
    const h = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(h);
  }, [phase, timer, picked]);

  async function startGame() {
    try {
      const r = await api.startGame(matchId, "quiz");
      setSessionId(r.session.id);
      setPhase("playing");
      setQIdx(0);
      setMyScore(0);
      setTheirScore(0);
      setPicked(null);
      setTimer(10);
    } catch (e) {
      console.error(e);
      // Fallback: allow playing without session (stand-alone demo)
      setPhase("playing");
    }
  }

  function commitAnswer(idx: number | null) {
    const q = QUESTIONS[qIdx];
    const correct = idx === q.correctIdx;
    const timeBonus = Math.max(0, timer);
    const myPoints = correct ? 10 + timeBonus : 0;
    // Simulate opponent: correct with 60% probability, slightly slower
    const theirCorrect = Math.random() < 0.6;
    const theirPoints = theirCorrect ? 10 + Math.max(0, Math.floor(timer * 0.7)) : 0;

    setMyScore((s) => s + myPoints);
    setTheirScore((s) => s + theirPoints);
    setPicked(idx);

    setTimeout(() => {
      if (qIdx + 1 >= QUESTIONS.length) {
        finishGame(myScore + myPoints, theirScore + theirPoints);
      } else {
        setQIdx((i) => i + 1);
        setPicked(null);
        setTimer(10);
      }
    }, 1500);
  }

  async function finishGame(p1: number, p2: number) {
    setPhase("result");
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const r = await api.endGame(sessionId, p1, p2);
      setRewards(r);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const q = QUESTIONS[qIdx];
  const progress = ((qIdx + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <div className="relative min-h-screen flex flex-col max-w-md mx-auto">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/play" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-sm font-semibold text-white/70">Vibe Check</div>
        <div className="w-10" />
      </header>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6"
          >
            <div className="w-24 h-24 btn-gradient-pink rounded-3xl flex items-center justify-center shadow-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">Vibe Check</h1>
              <p className="text-white/70">10 quick questions. Fastest + correct wins.</p>
              <p className="text-xs text-white/50 mt-2">Earn <span className="text-pink-300 font-bold">coins & XP</span> · level up your bond</p>
            </div>
            <div className="glass rounded-3xl p-5 w-full text-left">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2">How to play</div>
              <ul className="text-sm space-y-1.5 text-white/80">
                <li>• 10 questions, 10 seconds each</li>
                <li>• Faster correct answers = more points</li>
                <li>• Both players answer live</li>
                <li>• Winner gets bonus coins 💰</li>
              </ul>
            </div>
            <button onClick={startGame} className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg">
              Start Quiz ✨
            </button>
          </motion.div>
        )}

        {phase === "playing" && q && (
          <motion.div
            key={`q${qIdx}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col px-6"
          >
            <div className="mb-6">
              <div className="flex justify-between text-xs font-semibold text-white/60 mb-2">
                <span>Question {qIdx + 1} / {QUESTIONS.length}</span>
                <span className={timer <= 3 ? "text-rose-400" : ""}>{timer}s</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-pink-400 to-fuchsia-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <ScoreCard label="You" score={myScore} color="from-pink-400 to-rose-500" />
              <ScoreCard label="Them" score={theirScore} color="from-purple-400 to-fuchsia-500" />
            </div>

            <div className="glass rounded-3xl p-6 mb-5">
              <h2 className="text-xl font-bold leading-tight">{q.prompt}</h2>
            </div>

            <div className="grid gap-3">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = picked !== null && i === q.correctIdx;
                const isWrong = isPicked && i !== q.correctIdx;
                return (
                  <button
                    key={i}
                    onClick={() => picked === null && commitAnswer(i)}
                    disabled={picked !== null}
                    className={`glass rounded-2xl px-5 py-4 text-left font-semibold transition flex items-center justify-between ${
                      isCorrect ? "!bg-emerald-500/40 ring-2 ring-emerald-400" :
                      isWrong ? "!bg-rose-500/40 ring-2 ring-rose-400" :
                      picked === null ? "hover:bg-white/10 active:scale-[0.98]" : "opacity-60"
                    }`}
                  >
                    <span>{opt}</span>
                    {isCorrect && <Check className="w-5 h-5 text-emerald-300" />}
                    {isWrong && <X className="w-5 h-5 text-rose-300" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-28 h-28 btn-gradient-pink rounded-3xl flex items-center justify-center shadow-2xl"
            >
              <Trophy className="w-14 h-14 text-white" />
            </motion.div>
            <div>
              <h2 className="text-4xl font-black mb-1">
                {myScore > theirScore ? "You won!" : myScore < theirScore ? "So close!" : "Tie vibes!"}
              </h2>
              <p className="text-white/70">
                {myScore} <span className="text-white/40">vs</span> {theirScore}
              </p>
            </div>

            <div className="glass rounded-3xl p-5 w-full">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-3">Rewards</div>
              <div className="grid grid-cols-2 gap-3">
                <RewardBadge icon="💰" label="Coins" value={myScore > theirScore ? "+50" : "+20"} />
                <RewardBadge icon="⚡" label="XP" value={myScore > theirScore ? "+40" : "+15"} />
                <RewardBadge icon="💕" label="Bond" value={rewards?.total_games ? `lv ${Math.min(4, Math.floor(rewards.total_games / 3))}` : "+"} />
                <RewardBadge icon="✨" label="Streak" value="x1" />
              </div>
              {submitting && <p className="text-xs text-white/40 mt-3">saving…</p>}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => { setPhase("intro"); setQIdx(0); setMyScore(0); setTheirScore(0); }}
                className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg"
              >
                Play again
              </button>
              <Link href="/play" className="glass w-full py-3 rounded-full font-semibold text-center">
                <Gamepad2 className="w-4 h-4 inline mr-1" /> Back to games
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-0.5">{label}</div>
      <div className={`text-2xl font-black bg-gradient-to-r ${color} text-transparent bg-clip-text`}>{score}</div>
    </div>
  );
}

function RewardBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-2xl px-3 py-2.5 flex items-center gap-2">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}
