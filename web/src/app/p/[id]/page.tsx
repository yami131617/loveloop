"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Share2, Send, Music2, Volume2, VolumeX, MoreHorizontal, Trash2 } from "lucide-react";
import { api, hasToken, mediaUrl, type Post, type Comment } from "@/lib/api";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [muted, setMuted] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    loadAll();
    api.me().then((r) => setMeId(r.user.id)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function deletePost() {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deletePost(postId);
      router.replace("/me");
    } catch {
      setDeleting(false);
    }
  }

  async function loadAll() {
    try {
      const [pr, cr] = await Promise.all([
        api.getPost(postId),
        api.getComments(postId),
      ]);
      setPost(pr.post);
      setLiked(!!pr.post.liked_by_me);
      setLikes(pr.post.likes_count);
      setComments(cr.comments);
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleLike() {
    const willLike = !liked;
    setLiked(willLike);
    setLikes((n) => (willLike ? n + 1 : n - 1));
    try { await api.likePost(postId); } catch {
      setLiked(!willLike);
      setLikes((n) => (willLike ? n - 1 : n + 1));
    }
  }

  async function sendComment() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const r = await api.postComment(postId, t);
      setComments((prev) => [r.comment, ...prev]);
      setDraft("");
    } finally { setSending(false); }
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        loading post…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto lg:max-w-3xl">
      <header className="flex items-center gap-3 px-4 py-3 backdrop-blur-lg bg-black/30 border-b border-white/10">
        <button onClick={() => router.back()} className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Link href={`/u/${post.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar name={post.display_name ?? post.username} src={post.avatar_url} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{post.display_name ?? post.username}</div>
            <div className="text-[11px] text-white/50">@{post.username}</div>
          </div>
        </Link>
        {meId === post.user_id && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((m) => !m)}
              className="glass w-10 h-10 rounded-full flex items-center justify-center"
              aria-label="more"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-50 glass rounded-2xl overflow-hidden min-w-[160px] shadow-2xl">
                  <button
                    onClick={() => { setMenuOpen(false); if (confirm("Delete this post? This can't be undone.")) deletePost(); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" /> {deleting ? "Deleting…" : "Delete post"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative aspect-[4/5] bg-black/30" onDoubleClick={toggleLike}>
          {post.media_type === "video" ? (
            <>
              <video
                src={mediaUrl(post.media_url)}
                autoPlay
                muted={muted}
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <button onClick={() => setMuted((m) => !m)} className="absolute bottom-3 right-3 glass w-9 h-9 rounded-full flex items-center justify-center">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(post.media_url)} alt={post.caption} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-5 mb-2">
            <button onClick={toggleLike} className="flex items-center gap-1.5 group">
              <Heart className={`w-6 h-6 transition ${liked ? "text-pink-400 fill-pink-400 scale-110" : "text-white"}`} />
              <span className="text-sm font-semibold">{likes}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm font-semibold">{comments.length}</span>
            </div>
            <button className="ml-auto"><Share2 className="w-5 h-5" /></button>
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

        <div className="px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3">
            Comments ({comments.length})
          </div>
          {comments.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-6">be the first to comment 💬</p>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <Link href={`/u/${c.user_id}`}>
                      <Avatar name={c.display_name ?? c.username} src={c.avatar_url} />
                    </Link>
                    <div className="flex-1">
                      <div className="text-xs">
                        <Link href={`/u/${c.user_id}`} className="font-bold mr-2">
                          {c.display_name ?? c.username}
                        </Link>
                        <span className="text-white/50">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm leading-snug mt-0.5">{c.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-black/30 backdrop-blur-lg">
        <div className="glass rounded-full flex items-center gap-2 px-4 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="add a comment ✨"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
          />
          <button
            onClick={sendComment}
            disabled={sending || !draft.trim()}
            className="btn-gradient-pink w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50"
            aria-label="send"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-9 h-9 rounded-full object-cover" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
