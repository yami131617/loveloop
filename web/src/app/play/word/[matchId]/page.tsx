"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Trophy, Gamepad2, Send } from "lucide-react";
import { api, hasToken } from "@/lib/api";
import { pickRandomPrompts, scoreAnswer } from "@/lib/wordBank";

type Phase = "intro" | "playing" | "result";
const ROUND_SECONDS = 5;
const TOTAL_ROUNDS = 8;

export default function WordSparkPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [answer, setAnswer] = useState("");
  const [opponentAnswer, setOpponentAnswer] = useState<string | null>(null);
  const [roundLocked, setRoundLocked] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasToken()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (phase !== "playing" || roundLocked) return;
    if (timer <= 0) { lockRound(); return; }
    const h = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timer, roundLocked]);

  useEffect(() => {
    if (phase === "playing" && !roundLocked) inputRef.current?.focus();
  }, [qIdx, phase, roundLocked]);

  async function startGame() {
    setPrompts(pickRandomPrompts(TOTAL_ROUNDS));
    try {
      const r = await api.startGame(matchId, "word");
      setSessionId(r.session.id);
    } catch {}
    setPhase("playing");
    setQIdx(0); setMyScore(0); setTheirScore(0);
    setTimer(ROUND_SECONDS); setAnswer(""); setOpponentAnswer(null);
    setRoundLocked(false); setUsedWords(new Set());
  }

  function submitAnswer() {
    if (roundLocked) return;
    lockRound();
  }

  function lockRound() {
    setRoundLocked(true);
    const clean = answer.trim().toLowerCase();
    let myPoints = 0;
    if (clean && !usedWords.has(clean)) {
      myPoints = scoreAnswer(prompts[qIdx], clean, timer, ROUND_SECONDS);
      setUsedWords(new Set([...usedWords, clean]));
    }
    // Opponent bot: word association from a small pool + speed bonus
    const bots = ["chill", "light", "soft", "warm", "fast", "bright", "smooth", "cozy", "sweet", "shine", "play", "glow"];
    const bot = bots[Math.floor(Math.random() * bots.length)];
    setOpponentAnswer(bot);
    const theirPoints = scoreAnswer(prompts[qIdx], bot, Math.max(0, timer - 1), ROUND_SECONDS);

    setMyScore((s) => s + myPoints);
    setTheirScore((s) => s + theirPoints);

    setTimeout(() => {
      if (qIdx + 1 >= TOTAL_ROUNDS) finishGame(myScore + myPoints, theirScore + theirPoints);
      else {
        setQIdx((i) => i + 1);
        setAnswer(""); setOpponentAnswer(null); setRoundLocked(false);
        setTimer(ROUND_SECONDS);
      }
    }, 1500);
  }

  async function finishGame(p1: number, p2: number) {
    setPhase("result");
    if (!sessionId) return;
    await api.endGame(sessionId, p1, p2).catch(() => {});
  }

  const prompt = prompts[qIdx];
  const progress = prompts.length === 0 ? 0 : ((qIdx + (roundLocked ? 1 : 0)) / TOTAL_ROUNDS) * 100;

  return (
    <div className="relative min-h-screen flex flex-col max-w-md mx-auto lg:max-w-2xl">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/play" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-sm font-semibold text-white/70">Word Spark</div>
        <div className="w-10" />
      </header>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">Word Spark ⚡</h1>
              <p className="text-white/70">See a word → type the first thing it makes you think of.<br />5 seconds per round. Repeat a word = 0 pts.</p>
            </div>
            <div className="glass rounded-3xl p-5 w-full text-left">
              <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2">Scoring</div>
              <ul className="text-sm space-y-1.5 text-white/80">
                <li>• Base: 5 pts per valid answer</li>
                <li>• Speed bonus: up to +10 (faster = more)</li>
                <li>• Length bonus: up to +10 (longer = more)</li>
                <li>• Max 25 per round × 8 rounds = 200 cap</li>
              </ul>
            </div>
            <button onClick={startGame} className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg">
              Let&apos;s spark ⚡
            </button>
          </motion.div>
        )}

        {phase === "playing" && prompt && (
          <motion.div key={`q${qIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col px-6">
            <div className="mb-5">
              <div className="flex justify-between text-xs font-semibold text-white/60 mb-2">
                <span>Round {qIdx + 1} / {TOTAL_ROUNDS}</span>
                <span className={timer <= 2 ? "text-rose-400" : ""}>{timer}s</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <ScoreCard label="You" score={myScore} color="from-cyan-400 to-blue-500" />
              <ScoreCard label="Them" score={theirScore} color="from-purple-400 to-fuchsia-500" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-6 -mt-8">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Your prompt</div>
              <motion.div
                key={qIdx}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 text-transparent bg-clip-text"
              >
                {prompt}
              </motion.div>

              {!roundLocked ? (
                <div className="w-full max-w-xs">
                  <div className="glass rounded-full flex items-center gap-2 px-5 py-3 focus-within:ring-2 focus-within:ring-cyan-400/60">
                    <input
                      ref={inputRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                      placeholder="first word that sparks…"
                      className="bg-transparent outline-none w-full text-center text-lg font-semibold placeholder:text-white/30 placeholder:font-normal"
                      autoFocus
                    />
                    {answer.trim() && (
                      <button onClick={submitAnswer} className="btn-gradient-pink w-9 h-9 rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 text-center mt-2">Enter to lock · 5s or bust</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xs text-center">
                  <div className="glass rounded-3xl p-4 mb-3">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">You said</div>
                    <div className="text-2xl font-black">{answer.trim() || <span className="text-white/30">—</span>}</div>
                  </div>
                  <div className="glass rounded-3xl p-4">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">They said</div>
                    <div className="text-2xl font-black">{opponentAnswer}</div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1, repeat: Infinity }}
              className="w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl">
              <Trophy className="w-14 h-14 text-white" />
            </motion.div>
            <div>
              <h2 className="text-4xl font-black mb-1">
                {myScore > theirScore ? "Electric!" : myScore < theirScore ? "So close!" : "Same brain!"}
              </h2>
              <p className="text-white/70">{myScore} <span className="text-white/40">vs</span> {theirScore}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button onClick={() => setPhase("intro")} className="btn-gradient-pink w-full py-4 rounded-full font-bold shadow-lg">
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
