"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Music2, Pencil, Zap, HelpCircle, Lock } from "lucide-react";
import { api, hasToken, mediaUrl, type Match } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

const GAMES = [
  { type: "quiz", name: "Vibe Check", blurb: "10 Qs, who knows who better", icon: HelpCircle, color: "from-pink-400 to-rose-500", unlocked: true },
  { type: "rhythm", name: "Beat Sync", blurb: "tap to the song, stay in sync", icon: Music2, color: "from-purple-400 to-fuchsia-600", unlocked: false },
  { type: "word", name: "Word Spark", blurb: "speed word association", icon: Zap, color: "from-cyan-400 to-blue-500", unlocked: false },
  { type: "trivia", name: "Trivia Clash", blurb: "10 questions, first right wins", icon: HelpCircle, color: "from-amber-400 to-orange-500", unlocked: false },
  { type: "drawing", name: "Sketch & Guess", blurb: "draw, they guess, laugh together", icon: Pencil, color: "from-emerald-400 to-teal-500", unlocked: false },
];

export default function PlayPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getMatches().then((r) => {
      setMatches(r.matches);
      if (r.matches.length > 0) setSelectedMatch(r.matches[0].id);
    }).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="relative min-h-screen pb-28 px-6 pt-8 max-w-md mx-auto lg:max-w-3xl">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-pink-300 font-bold">Play together</div>
        <h1 className="text-3xl font-black">
          Mini <span className="bg-gradient-to-r from-pink-400 to-fuchsia-500 text-transparent bg-clip-text">games</span>
        </h1>
        <p className="text-sm text-white/60 mt-1">level up your bond by playing with your match</p>
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-8">loading…</div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Gamepad2 className="w-10 h-10 text-pink-300 mx-auto mb-3" />
          <h3 className="font-bold mb-1">Match first, play later</h3>
          <p className="text-sm text-white/60 mb-4">You need at least one match to unlock games</p>
          <Link href="/discover" className="btn-gradient-pink inline-block px-6 py-2.5 rounded-full text-sm font-bold">
            Discover
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Play with</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {matches.map((m) => {
                const active = selectedMatch === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMatch(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border transition shrink-0 ${
                      active ? "bg-pink-500/20 border-pink-300/60 text-white" : "glass border-white/10 text-white/70"
                    }`}
                  >
                    <MiniAvatar name={m.other_display_name ?? m.other_username} src={m.other_avatar_url} />
                    <span className="text-sm font-semibold">{m.other_display_name ?? m.other_username}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {GAMES.map((g, i) => (
              <motion.div
                key={g.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {g.unlocked ? (
                  <Link
                    href={`/play/${g.type}/${selectedMatch}`}
                    className="glass rounded-3xl p-4 flex items-center gap-4 hover:bg-white/10 transition"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-lg`}>
                      <g.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{g.name}</div>
                      <div className="text-xs text-white/60">{g.blurb}</div>
                    </div>
                    <div className="text-xs font-bold text-pink-300">PLAY →</div>
                  </Link>
                ) : (
                  <div className="glass rounded-3xl p-4 flex items-center gap-4 opacity-60">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center relative`}>
                      <g.icon className="w-6 h-6 text-white/60" />
                      <Lock className="w-4 h-4 absolute -top-1 -right-1 text-white bg-black/60 rounded-full p-0.5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{g.name}</div>
                      <div className="text-xs text-white/40">coming soon</div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

function MiniAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-[10px] font-bold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
