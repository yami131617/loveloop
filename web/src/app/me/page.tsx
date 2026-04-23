"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, Share2, Grid3x3, Heart, Gamepad2, LogOut, Pencil } from "lucide-react";
import { api, hasToken, clearAuth, mediaUrl, type User, type Post } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "liked">("posts");

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then(async (r) => {
      setUser(r.user);
      try {
        const p = await api.getUserPosts(r.user.id);
        setPosts(p.posts);
      } catch {}
    }).catch(() => router.replace("/"));
  }, [router]);

  function logout() {
    clearAuth();
    router.replace("/");
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">loading…</div>;
  }

  return (
    <div className="relative min-h-screen pb-28 max-w-md mx-auto lg:max-w-4xl">
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="glass w-10 h-10 rounded-full flex items-center justify-center" aria-label="share">
            <Share2 className="w-4 h-4" />
          </button>
          <Link href="/settings" className="glass w-10 h-10 rounded-full flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="relative px-6 -mt-16">
        <div className="flex items-end justify-between">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-pink-400 to-purple-500 ring-4 ring-[#1a0e2e] flex items-center justify-center text-5xl font-black shadow-xl overflow-hidden">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              (user.display_name ?? user.username).slice(0, 1).toUpperCase()
            )}
          </div>
          <Link
            href="/settings/profile"
            className="btn-gradient-pink px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-lg"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-black">{user.display_name ?? user.username}</h1>
          <p className="text-sm text-white/60">@{user.username}</p>
          {user.bio && <p className="text-sm mt-3 leading-snug">{user.bio}</p>}
          {user.interests && user.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.interests.map((i) => (
                <span key={i} className="text-xs bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <StatCard label="Level" value={user.level ?? 1} gradient="from-yellow-400 to-orange-500" />
          <StatCard label="Hearts" value={user.coins_balance ?? 0} gradient="from-pink-400 to-rose-500" />
          <StatCard label="Gems" value={user.gems_balance ?? 0} gradient="from-cyan-400 to-blue-500" />
        </div>

        {/* Level XP progress — explains what "Lv 1" means */}
        <LevelProgress user={user} />


        <div className="flex gap-2 mt-8 border-b border-white/10">
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")} icon={<Grid3x3 className="w-4 h-4" />} label="Posts" />
          <TabBtn active={tab === "liked"} onClick={() => setTab("liked")} icon={<Heart className="w-4 h-4" />} label="Liked" />
        </div>

        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-3xl p-8 text-center mt-6"
          >
            <Gamepad2 className="w-10 h-10 text-pink-300 mx-auto mb-3" />
            <h3 className="font-bold mb-1">No posts yet</h3>
            <p className="text-sm text-white/60 mb-4">drop your first vibe and let the loop find you</p>
            <Link href="/upload" className="btn-gradient-pink inline-block px-6 py-2.5 rounded-full text-sm font-bold">
              + Create post
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-4">
            {posts.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square overflow-hidden bg-black/30 group">
                {p.media_type === "video" ? (
                  <video src={mediaUrl(p.media_url)} muted playsInline className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.media_url)} alt={p.caption} className="w-full h-full object-cover" />
                )}
                {p.likes_count > 0 && (
                  <div className="absolute bottom-1 left-1 text-[10px] font-semibold flex items-center gap-0.5 bg-black/50 backdrop-blur rounded-full px-1.5 py-0.5">
                    <Heart className="w-2.5 h-2.5 fill-pink-400 text-pink-400" /> {p.likes_count}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <button
          onClick={logout}
          className="mt-8 w-full glass rounded-full py-3 text-white/70 text-sm font-semibold flex items-center justify-center gap-2 hover:text-rose-300 transition"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

// XP needed for level N: 100 * N^1.5 (matches backend utils/economy.js)
function xpForLevel(lv: number) { return Math.round(100 * Math.pow(lv, 1.5)); }

function LevelProgress({ user }: { user: User }) {
  const level = user.level ?? 1;
  const xp = user.total_xp ?? 0;
  const thisLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progressXp = Math.max(0, xp - thisLevelXp);
  const needed = nextLevelXp - thisLevelXp;
  const pct = Math.min(100, Math.round((progressXp / needed) * 100));

  return (
    <details className="glass rounded-3xl mt-3 group [&_summary::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer px-5 py-3 flex items-center gap-3 hover:bg-white/5 rounded-3xl transition">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-white/70">LEVEL {level}</span>
            <span className="text-[10px] text-white/40">{progressXp}/{needed} XP to Lv {level + 1}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500"
            />
          </div>
        </div>
        <span className="text-[10px] font-bold text-pink-300 group-open:rotate-180 transition">▼</span>
      </summary>
      <div className="px-5 pb-4 pt-1 text-[11px] text-white/60 leading-relaxed">
        Play mini-games with your matches to earn XP. Formula: <span className="font-mono text-white/80">100 × N^1.5</span> XP per level.
        Higher levels unlock cosmetics, priority in Discover, and profile badges.
        {" "}Next milestone: <span className="text-pink-300 font-bold">Lv {level + 1}</span> at {nextLevelXp.toLocaleString()} total XP.
      </div>
    </details>
  );
}

function StatCard({ label, value, gradient }: { label: string; value: number | string; gradient: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`text-2xl font-black bg-gradient-to-r ${gradient} text-transparent bg-clip-text`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-0.5">{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition relative ${
        active ? "text-pink-300" : "text-white/50"
      }`}
    >
      {icon}
      {label}
      {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-400 to-purple-400" />}
    </button>
  );
}
