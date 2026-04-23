"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle, Trophy, Gamepad2, Check, X } from "lucide-react";
import { api, hasToken } from "@/lib/api";
import { pickRandomTen, type TriviaQuestion } from "@/lib/triviaBank";

type Phase = "intro" | "playing" | "result";

export default function TriviaClashPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timer, setTimer] = useState(10);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (picked !== null) return;
    if (timer <= 0) { commitAnswer(null); return; }
    const h = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timer, picked]);

  async function startGame() {
    setQuestions(pickRandomTen());
    try {
      const r = await api.startGame(matchId, "trivia");
      setSessionId(r.session.id);
    } catch {}
    setPhase("playing");
    setQIdx(0); setMyScore(0); setTheirScore(0); setPicked(null); setTimer(10);
  }

  function commitAnswer(idx: number | null) {
    const q = questions[qIdx];
    const correct = idx === q.correctIdx;
    const timeBonus = Math.max(0, timer);
    const myPoints = correct ? 10 + timeBonus : 0;
    // Opponent simulation: 55% correct, slightly slower — trivia is "harder" than Vibe Check
    const theirCorrect = Math.random() < 0.55;
    const theirPoints = theirCorrect ? 10 + Math.max(0, Math.floor(timer * 0.6)) : 0;
    setMyScore((s) => s + myPoints);
    setTheirScore((s) => s + theirPoints);
    setPicked(idx);
    setTimeout(() => {
      if (qIdx + 1 >= questions.length) finishGame(myScore + myPoints, theirScore + theirPoints);
      else { setQIdx((i) => i + 1); setPicked(null); setTimer(10); }
    }, 1400);
  }

  async function finishGame(p1: number, p2: number) {
    setPhase("result");
    if (!sessionId) return;
    await api.endGame(sessionId, p1, p2).catch(() => {});
  }

  const q = questions[qIdx];
  const progress = useMemo(() => (questions.length === 0 ? 0 :
    ((qIdx + (picked !== null ? 1 : 0)) / questions.length) * 100
  ), [qIdx, picked, questions.length]);

  return (
    <div className="relative min-h-screen flex flex-col max-w-md mx-auto lg:max-w-2xl">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/play" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-sm font-semibold text-white/70">Trivia Clash</div>
        <div className="w-10" />
      </header>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
              <HelpCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">Trivia Clash</h1>
              <p className="text-white/70">10 general-knowledge & pop-culture questions.<br />First right + fastest wins.</p>
            </div>
            <div className="glass rounded-3xl p-5 w-full text-left">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2">How to play</div>
              <ul className="text-sm space-y-1.5 text-white/80">
                <li>• 10 random trivia questions, 10 sec each</li>
                <li>• Mix of movies, music, science, internet lore</li>
                <li>• Tie-breaker: speed</li>
                <li>• Winner earns double XP 💎</li>
              </ul>
            </div>
            <button onClick={startGame} className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg">
              Start Trivia 🧠
            </button>
          </motion.div>
        )}

        {phase === "playing" && q && (
          <motion.div key={`q${qIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col px-6">
            <div className="mb-6">
              <div className="flex justify-between text-xs font-semibold text-white/60 mb-2">
                <span>Question {qIdx + 1} / {questions.length}</span>
                <span className={timer <= 3 ? "text-rose-400" : ""}>{timer}s</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <ScoreCard label="You" score={myScore} color="from-amber-400 to-orange-500" />
              <ScoreCard label="Them" score={theirScore} color="from-purple-400 to-fuchsia-500" />
            </div>

            <div className="glass rounded-3xl p-6 mb-5">
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-2">
                {q.category}
              </div>
              <h2 className="text-xl font-bold leading-tight">{q.prompt}</h2>
            </div>

            <div className="grid gap-3">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = picked !== null && i === q.correctIdx;
                const isWrong = isPicked && i !== q.correctIdx;
                return (
                  <button key={i} onClick={() => picked === null && commitAnswer(i)} disabled={picked !== null}
                    className={`glass rounded-2xl px-5 py-4 text-left font-semibold transition flex items-center justify-between ${
                      isCorrect ? "!bg-emerald-500/40 ring-2 ring-emerald-400"
                      : isWrong ? "!bg-rose-500/40 ring-2 ring-rose-400"
                      : picked === null ? "hover:bg-white/10 active:scale-[0.98]" : "opacity-60"
                    }`}>
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
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1, repeat: Infinity }}
              className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
              <Trophy className="w-14 h-14 text-white" />
            </motion.div>
            <div>
              <h2 className="text-4xl font-black mb-1">
                {myScore > theirScore ? "Genius!" : myScore < theirScore ? "Close one!" : "Tied brains!"}
              </h2>
              <p className="text-white/70">{myScore} <span className="text-white/40">vs</span> {theirScore}</p>
            </div>
            <div className="glass rounded-3xl p-5 w-full">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-3">Rewards</div>
              <div className="grid grid-cols-2 gap-3">
                <RewardBadge icon="💰" label="Coins" value={myScore > theirScore ? "+60" : "+25"} />
                <RewardBadge icon="⚡" label="XP" value={myScore > theirScore ? "+50" : "+20"} />
                <RewardBadge icon="🧠" label="Bond" value="+" />
                <RewardBadge icon="✨" label="Streak" value="x1" />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={() => { setPhase("intro"); }}
                className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg">Play again</button>
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
