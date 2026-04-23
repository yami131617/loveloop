"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Search, Sparkles } from "lucide-react";
import { hasToken } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

type Room = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  cover_gradient: string;
  member_count: number;
  joined_by_me: boolean;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://backend-production-61ee6.up.railway.app";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    const token = localStorage.getItem("loveloop_token");
    fetch(BASE + "/rooms", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((j) => setRooms(j.rooms || []))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    r.description.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pb-28 px-6 pt-8 max-w-md mx-auto">
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-pink-300 font-bold">Public</div>
        <h1 className="text-3xl font-black">
          Vibe <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">rooms</span> 🌈
        </h1>
        <p className="text-sm text-white/60 mt-1">chat with people who share your energy</p>
      </div>

      <label className="glass rounded-full px-4 py-2.5 flex items-center gap-2 mb-5">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search rooms…"
          className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
        />
      </label>

      {loading ? (
        <div className="text-center text-white/50 py-10">loading…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-pink-300 mx-auto mb-3" />
          <p className="text-sm text-white/60">no rooms match that search</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/rooms/${r.slug}`}
                className={`relative block rounded-3xl aspect-[4/5] overflow-hidden shadow-lg bg-gradient-to-br ${r.cover_gradient}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold">
                  <Users className="w-3 h-3" /> {r.member_count}
                </div>
                {r.joined_by_me && (
                  <div className="absolute top-3 left-3 bg-pink-500/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold">
                    joined
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-3xl mb-1">{r.emoji}</div>
                  <div className="font-black text-lg leading-tight">{r.name}</div>
                  <div className="text-xs text-white/80 line-clamp-2 mt-1">{r.description}</div>
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
