"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Image as ImageIcon, Gamepad2, Smile, Video as VideoIcon } from "lucide-react";
import { api, hasToken, mediaUrl, type Message } from "@/lib/api";
import { useCall } from "@/components/CallProvider";

type MatchLite = { id: string; other_user_id: string; other_username: string; other_display_name: string | null; other_avatar_url: string | null; relationship_level: number };

export default function ChatDetailPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();
  const [match, setMatch] = useState<MatchLite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { startCall } = useCall();

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then((r) => setMeId(r.user.id));
    api.getMatches().then((r) => {
      const m = r.matches.find((x) => x.id === matchId);
      if (m) setMatch(m as MatchLite);
    });
    api.getMessages(matchId).then((r) => setMessages(r.messages));
  }, [matchId, router]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const r = await api.sendMessage(matchId, t);
      setMessages((prev) => [...prev, r.message]);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function sendMedia(file: File) {
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", "");
      const token = localStorage.getItem("loveloop_token");
      const r = await fetch(api.base + "/posts/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const url = j.post.media_url;
      const msg = await api.sendMessage(matchId, "", mediaUrl(url), kind);
      setMessages((prev) => [...prev, msg.message]);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 backdrop-blur-lg bg-black/30 border-b border-white/10">
        <Link href="/chats" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        {match && (
          <Link href={`/u/${match.other_user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar name={match.other_display_name ?? match.other_username} src={match.other_avatar_url} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{match.other_display_name ?? match.other_username}</div>
              <div className="text-[11px] text-white/50">Lv {match.relationship_level} loop · tap for profile</div>
            </div>
          </Link>
        )}
        {match && (
          <button
            onClick={() => startCall(match.other_user_id, match.other_display_name ?? match.other_username, match.other_avatar_url, matchId)}
            className="glass w-10 h-10 rounded-full flex items-center justify-center hover:bg-pink-500/30 transition"
            aria-label="video call"
          >
            <VideoIcon className="w-4 h-4 text-pink-300" />
          </button>
        )}
        <Link href={`/play/quiz/${matchId}`} className="glass w-10 h-10 rounded-full flex items-center justify-center" aria-label="play game">
          <Gamepad2 className="w-4 h-4 text-cyan-300" />
        </Link>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-sm my-8">say hi 💕</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return <Bubble key={m.id} mine={mine} msg={m} />;
        })}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-black/30 backdrop-blur-lg">
        <div className="glass rounded-full flex items-center gap-2 px-4 py-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-white/60 hover:text-pink-300 transition"
            aria-label="attach media"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && sendMedia(e.target.files[0])}
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="say something cute ✨"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
          />
          <button className="text-white/60 hover:text-yellow-300 transition" aria-label="emoji">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={send}
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

function Bubble({ mine, msg }: { mine: boolean; msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-[78%] ${mine ? "self-end" : "self-start"}`}
    >
      {msg.media_url && (
        <div className={`rounded-2xl overflow-hidden mb-1 ${mine ? "ml-auto" : ""}`} style={{ maxWidth: 220 }}>
          {msg.media_type === "video" ? (
            <video src={msg.media_url} controls className="w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={msg.media_url} alt="shared" className="w-full" />
          )}
        </div>
      )}
      {msg.content && (
        <div
          className={`px-4 py-2 rounded-2xl text-sm ${
            mine
              ? "btn-gradient-pink text-white rounded-tr-md"
              : "glass rounded-tl-md"
          }`}
        >
          {msg.content}
        </div>
      )}
    </motion.div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-300/40" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 ring-2 ring-pink-300/40 flex items-center justify-center text-white font-bold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
