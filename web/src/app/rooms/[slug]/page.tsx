"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Send, Image as ImageIcon, Smile, Sparkles } from "lucide-react";
import { api, hasToken, mediaUrl } from "@/lib/api";
import { getSocket } from "@/lib/socket";

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

type RoomMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://backend-production-61ee6.up.railway.app";

export default function RoomDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [members, setMembers] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then((r) => setMeId(r.user.id));
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!room) return;
    const s = getSocket();
    if (!s) return;
    s.emit("join_room", room.id);
    const onMsg = (m: RoomMessage) => {
      if (m.room_id === room.id) setMessages((prev) => [...prev, m]);
    };
    s.on("room_message", onMsg);
    return () => {
      s.emit("leave_room", room.id);
      s.off("room_message", onMsg);
    };
  }, [room]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function loadRoom() {
    const token = localStorage.getItem("loveloop_token");
    const r = await fetch(`${BASE}/rooms/${slug}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const j = await r.json();
    if (!r.ok) { console.error(j); return; }
    setRoom(j.room);
    setMessages(j.messages || []);
    setMembers(j.members || []);
  }

  async function join() {
    const token = localStorage.getItem("loveloop_token");
    if (!token) return;
    await fetch(`${BASE}/rooms/${slug}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    loadRoom();
  }

  async function send() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const token = localStorage.getItem("loveloop_token");
      const r = await fetch(`${BASE}/rooms/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: t }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        console.error("send failed", j);
      } else {
        setDraft("");
      }
    } finally { setSending(false); }
  }

  async function sendMedia(file: File) {
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", "");
      const token = localStorage.getItem("loveloop_token");
      const up = await fetch(BASE + "/posts/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const uj = await up.json();
      if (!up.ok) throw new Error(uj.error || `HTTP ${up.status}`);
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const url = mediaUrl(uj.post.media_url);
      await fetch(`${BASE}/rooms/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: "", media_url: url, media_type: kind }),
      });
    } catch (e) {
      console.error(e);
    } finally { setSending(false); }
  }

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">loading room…</div>;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto lg:max-w-3xl">
      <header className={`relative px-4 py-4 bg-gradient-to-br ${room.cover_gradient}`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex items-center gap-3">
          <Link href="/rooms" className="glass w-10 h-10 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-black text-lg leading-tight">{room.emoji} {room.name}</div>
            <div className="text-xs text-white/80 flex items-center gap-1">
              <Users className="w-3 h-3" /> {room.member_count} · {room.description}
            </div>
          </div>
          {!room.joined_by_me && (
            <button onClick={join} className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-full px-3 py-1.5 text-xs font-bold">
              Join
            </button>
          )}
        </div>

        {members.length > 0 && (
          <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {members.slice(0, 12).map((m) => (
              <Link key={m.id} href={`/u/${m.id}`} className="shrink-0">
                <MemberAvatar name={m.display_name ?? m.username} src={m.avatar_url} />
              </Link>
            ))}
            {members.length > 12 && (
              <span className="text-xs text-white/70 ml-1">+{members.length - 12}</span>
            )}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center glass rounded-3xl p-6">
              <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
              <p className="text-sm text-white/70">be the first to say hi 💫</p>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
            >
              <Link href={`/u/${m.sender_id}`} className="shrink-0">
                <MsgAvatar name={m.display_name ?? m.username} src={m.avatar_url} />
              </Link>
              <div className={`flex flex-col max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                <div className={`text-[11px] mb-0.5 ${mine ? "text-right" : ""}`}>
                  <span className="font-bold text-white/90">{m.display_name ?? m.username}</span>
                  <span className="text-white/40 ml-2">{timeAgo(m.created_at)}</span>
                </div>
                {m.media_url && (
                  <div className="rounded-2xl overflow-hidden mb-1 max-w-[220px]">
                    {m.media_type === "video" ? (
                      <video src={m.media_url} controls className="w-full" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.media_url} alt="shared" className="w-full" />
                    )}
                  </div>
                )}
                {m.content && (
                  <div className={`px-3.5 py-2 rounded-2xl text-sm ${
                    mine ? "btn-gradient-pink text-white rounded-tr-md"
                         : "glass rounded-tl-md"
                  }`}>
                    {m.content}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-[#120821]/92 backdrop-blur-xl">
        <div className="glass rounded-full flex items-center gap-2 px-4 py-2">
          <button onClick={() => fileRef.current?.click()} className="text-white/60 hover:text-pink-300 transition" aria-label="attach">
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
            placeholder={`say something in ${room.name.toLowerCase()}…`}
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
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center text-xs font-bold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function MsgAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xs font-bold">
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
