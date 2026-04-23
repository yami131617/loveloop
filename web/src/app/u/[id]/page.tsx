"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Grid3x3, Heart, MessageCircle, UserPlus, Check } from "lucide-react";
import { api, mediaUrl, type User, type Post } from "@/lib/api";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      api.getProfile(userId).then((r) => setUser({ ...r.profile, interests: r.interests })).catch(() => setUser(null)),
      api.getUserPosts(userId).then((r) => setPosts(r.posts)).catch(() => setPosts([])),
    ]).finally(() => setLoading(false));
  }, [userId]);

  async function toggleFollow() {
    const prev = following;
    setFollowing(!prev);
    try { await api.follow(userId); } catch { setFollowing(prev); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">loading…</div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-white/70">User not found</p>
        <button onClick={() => router.back()} className="btn-gradient-pink px-5 py-2 rounded-full">Go back</button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20 max-w-md mx-auto">
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 glass w-10 h-10 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="relative px-6 -mt-14">
        <div className="flex items-end justify-between">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-400 to-purple-500 ring-4 ring-[#1a0e2e] flex items-center justify-center text-4xl font-black overflow-hidden shadow-xl">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(user.avatar_url)} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              (user.display_name ?? user.username).slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFollow}
              className={`px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 transition ${
                following ? "glass text-white/80" : "btn-gradient-pink text-white shadow-lg"
              }`}
            >
              {following ? <><Check className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
            </button>
            <button className="glass w-11 h-11 rounded-full flex items-center justify-center" aria-label="message">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
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
          <Stat label="Posts" value={posts.length} />
          <Stat label="Level" value={user.level ?? 1} />
          <Stat label="Hearts" value={user.coins_balance ?? 0} />
        </div>

        <div className="flex gap-2 mt-8 border-b border-white/10">
          <div className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-pink-300 relative">
            <Grid3x3 className="w-4 h-4" /> Posts
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-400 to-purple-400" />
          </div>
        </div>

        {posts.length === 0 ? (
          <motion.div initial={false} animate={{ opacity: 1 }} className="glass rounded-3xl p-8 text-center mt-6">
            <Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />
            <p className="text-sm text-white/60">No posts yet</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-4">
            {posts.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square overflow-hidden bg-black/30">
                {p.media_type === "video" ? (
                  <video src={mediaUrl(p.media_url)} muted className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.media_url)} alt={p.caption} className="w-full h-full object-cover" />
                )}
                {p.likes_count > 0 && (
                  <div className="absolute bottom-1 left-1 text-[10px] font-semibold flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    <Heart className="w-2.5 h-2.5 fill-pink-400 text-pink-400" /> {p.likes_count}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-xl font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mt-0.5">{label}</div>
    </div>
  );
}
