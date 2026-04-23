"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Music2, MoreHorizontal, Volume2, VolumeX, Sparkles } from "lucide-react";
import { api, hasToken, mediaUrl, type Post } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then((r) => setMeId(r.user.id)).catch(() => {});
    api.getFeed(20)
      .then((r) => setPosts(r.posts))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="relative min-h-screen pb-28">
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-black/20 px-6 py-4 flex justify-between items-center max-w-md mx-auto">
        <h1 className="text-2xl font-black bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 text-transparent bg-clip-text">
          LoveLoop
        </h1>
        <button className="glass w-10 h-10 rounded-full flex items-center justify-center" aria-label="More">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>

      <div className="max-w-md mx-auto px-4 flex flex-col gap-5 mt-3">
        {loading ? (
          <div className="text-center text-white/50 py-12">loading vibes…</div>
        ) : posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          posts.map((p, i) => <PostCard key={p.id} post={p} priority={i < 2} meId={meId} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function EmptyFeed() {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="glass rounded-3xl p-8 text-center mt-6"
    >
      <Sparkles className="w-12 h-12 text-pink-300 mx-auto mb-3" />
      <h3 className="font-bold text-lg mb-1">No posts yet in your loop</h3>
      <p className="text-sm text-white/60 mb-5">Drop your first photo or video — set the vibe</p>
      <Link href="/upload" className="btn-gradient-pink inline-block px-6 py-3 rounded-full font-bold">
        + Create post
      </Link>
    </motion.div>
  );
}

function PostCard({ post, priority, meId }: { post: Post; priority?: boolean; meId: string | null }) {
  const isMine = meId === post.user_id;
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likes, setLikes] = useState(post.likes_count);
  const [muted, setMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);

  async function toggleLike(fromDoubleClick = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    // optimistic
    const willLike = !liked;
    setLiked(willLike);
    setLikes((n) => (willLike ? n + 1 : n - 1));
    if (fromDoubleClick && willLike) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    try {
      await api.likePost(post.id);
    } catch {
      setLiked(!willLike);
      setLikes((n) => (willLike ? n - 1 : n + 1));
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <Link href={`/u/${post.user_id}`} className="flex items-center gap-3">
          <Avatar name={post.display_name ?? post.username} src={post.avatar_url} />
          <div>
            <div className="font-semibold text-sm">{post.display_name ?? post.username}</div>
            <div className="text-[11px] text-white/50">@{post.username}</div>
          </div>
        </Link>
        {isMine ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 border border-white/10 rounded-full px-2.5 py-1">You</span>
        ) : (
          <FollowBtn userId={post.user_id} />
        )}
      </header>

      <div className="relative aspect-[4/5] bg-black/30" onDoubleClick={() => toggleLike(true)}>
        {post.media_type === "video" ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl(post.media_url)}
              autoPlay={priority}
              muted={muted}
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute bottom-3 right-3 glass w-9 h-9 rounded-full flex items-center justify-center"
              aria-label="mute"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(post.media_url)} alt={post.caption} className="w-full h-full object-cover" />
        )}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-pink-400 fill-pink-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-5 mb-2">
          <button onClick={() => toggleLike()} className="flex items-center gap-1.5 group" aria-label="like">
            <Heart className={`w-6 h-6 transition ${liked ? "text-pink-400 fill-pink-400 scale-110" : "text-white group-hover:text-pink-300"}`} />
            <span className="text-sm font-semibold">{likes}</span>
          </button>
          <Link href={`/p/${post.id}`} className="flex items-center gap-1.5 group" aria-label="comment">
            <MessageCircle className="w-6 h-6 group-hover:text-fuchsia-300 transition" />
            <span className="text-sm font-semibold">{post.comments_count}</span>
          </Link>
          <button className="flex items-center gap-1.5 group ml-auto" aria-label="share">
            <Share2 className="w-5 h-5 group-hover:text-cyan-300 transition" />
          </button>
        </div>

        {post.caption && (
          <p className="text-sm leading-snug">
            <span className="font-semibold mr-1.5">{post.username}</span>
            {post.caption}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-white/50">
          <Music2 className="w-3 h-3" /> original · {post.username}
        </div>
      </div>
    </motion.article>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-300/40" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 ring-2 ring-pink-300/40 flex items-center justify-center text-white font-bold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function FollowBtn({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(false);
  async function toggle() {
    const prev = following;
    setFollowing(!prev);
    try { await api.follow(userId); } catch { setFollowing(prev); }
  }
  return (
    <button
      onClick={toggle}
      className={`text-xs font-bold px-3 py-1 rounded-full transition ${
        following
          ? "bg-white/10 text-white/70 border border-white/10"
          : "text-pink-300 border border-pink-300/40 hover:bg-pink-300/10"
      }`}
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
