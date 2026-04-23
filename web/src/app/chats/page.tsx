"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Search, Gamepad2 } from "lucide-react";
import { api, hasToken, type Match } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

export default function ChatsPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getMatches().then((r) => setMatches(r.matches)).finally(() => setLoading(false));
  }, [router]);

  const filtered = matches.filter((m) =>
    (m.other_display_name ?? m.other_username).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pb-28 px-6 pt-8 max-w-md mx-auto">
      <h1 className="text-3xl font-black mb-5">
        Your <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">loops</span> 💕
      </h1>

      <label className="glass rounded-full px-4 py-2.5 flex items-center gap-2 mb-5">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search your matches"
          className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
        />
      </label>

      {loading ? (
        <div className="text-white/50 text-center py-10">loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />
          <h3 className="font-bold mb-1">No matches yet</h3>
          <p className="text-sm text-white/60 mb-4">start swiping to find your loop</p>
          <Link href="/discover" className="btn-gradient-pink inline-block px-6 py-2.5 rounded-full text-sm font-bold">
            Discover
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/chats/${m.id}`}
                className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition"
              >
                <MatchAvatar name={m.other_display_name ?? m.other_username} src={m.other_avatar_url} level={m.relationship_level} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{m.other_display_name ?? m.other_username}</span>
                    <LevelBadge level={m.relationship_level} />
                  </div>
                  <div className="text-xs text-white/50 truncate">@{m.other_username} · {m.total_games_played} games played</div>
                </div>
                <div className="glass w-9 h-9 rounded-full flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-cyan-300" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function MatchAvatar({ name, src, level }: { name: string; src: string | null; level: number }) {
  const ringColor = level >= 4 ? "ring-yellow-400" : level >= 3 ? "ring-pink-400" : level >= 2 ? "ring-purple-400" : level >= 1 ? "ring-cyan-400" : "ring-white/30";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`w-12 h-12 rounded-full object-cover ring-2 ${ringColor}`} />;
  }
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 ring-2 ${ringColor} flex items-center justify-center text-white font-bold`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  const labels = ["✨ new", "💕 lv1", "🌹 lv2", "🌟 lv3", "👑 lv4"];
  const colors = ["bg-white/10", "bg-cyan-500/30", "bg-purple-500/30", "bg-pink-500/30", "bg-yellow-500/30"];
  const i = Math.max(0, Math.min(4, level));
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[i]}`}>{labels[i]}</span>;
}
