"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Image as ImageIcon, Smile, Users, UserPlus } from "lucide-react";
import { api, hasToken, mediaUrl, type GroupChat, type GroupMember, type Message } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type GroupMessageRow = Message & {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function GroupChatPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessageRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then((r) => setMeId(r.user.id));
    api.getGroup(groupId).then((r) => {
      setGroup(r.group);
      setMembers(r.members);
      setMessages(r.messages as GroupMessageRow[]);
    }).catch(() => router.replace("/chats"));
  }, [groupId, router]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.emit("join_group", groupId);
    const onMsg = (m: GroupMessageRow) => {
      if (m.match_id && m.match_id !== groupId) return; // ignore stray
      setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    };
    const onMembersChanged = () => {
      api.getGroup(groupId).then((r) => setMembers(r.members)).catch(() => {});
    };
    s.on("group_message", onMsg);
    s.on("group_members_updated", onMembersChanged);
    return () => {
      s.emit("leave_group", groupId);
      s.off("group_message", onMsg);
      s.off("group_members_updated", onMembersChanged);
    };
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api.sendGroupMessage(groupId, t);
      setDraft("");
    } finally { setSending(false); }
  }

  async function sendMedia(file: File) {
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", "");
      const token = localStorage.getItem("loveloop_token");
      const up = await fetch(api.base + "/posts/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const uj = await up.json();
      if (!up.ok) throw new Error(uj.error);
      const kind = file.type.startsWith("video/") ? "video" : "image";
      await api.sendGroupMessage(groupId, "", mediaUrl(uj.post.media_url), kind);
    } catch (e) {
      console.error(e);
    } finally { setSending(false); }
  }

  async function leave() {
    if (!meId || !confirm("Leave this group?")) return;
    await api.leaveGroup(groupId, meId).catch(() => {});
    router.replace("/chats");
  }

  if (!group) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">loading group…</div>;
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto lg:max-w-3xl">
      <header className="relative px-4 py-3 bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/chats" className="glass w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <button onClick={() => setShowMembers((s) => !s)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <GroupAvatar name={group.name} src={group.avatar_url} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{group.name}</div>
              <div className="text-[11px] text-white/70 flex items-center gap-1">
                <Users className="w-3 h-3" /> {members.length} members · tap to view
              </div>
            </div>
          </button>
          <Link
            href={`/chats/g/${groupId}/add`}
            className="glass w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            aria-label="add member"
          >
            <UserPlus className="w-4 h-4" />
          </Link>
        </div>

        {showMembers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {members.map((m) => (
              <Link key={m.id} href={`/u/${m.id}`} className="flex items-center gap-2 glass rounded-full px-2.5 py-1">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(m.avatar_url)} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {(m.display_name ?? m.username).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold">{m.display_name ?? m.username}</span>
                {m.role === "admin" && <span className="text-[9px] uppercase tracking-widest bg-yellow-500/40 rounded-full px-1.5 font-bold">admin</span>}
              </Link>
            ))}
            <button
              onClick={leave}
              className="text-xs font-bold text-rose-300 hover:text-rose-200 px-2.5 py-1 ml-auto"
            >
              Leave
            </button>
          </motion.div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
            be the first to say hi 💫
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
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(m.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xs font-bold">
                    {(m.display_name ?? m.username).slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className={`flex flex-col max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                <div className="text-[11px] mb-0.5 text-white/60">{m.display_name ?? m.username}</div>
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
                    mine ? "btn-gradient-pink text-white rounded-tr-md" : "glass rounded-tl-md"
                  }`}>
                    {m.content}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-black/30 backdrop-blur-lg">
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
            placeholder={`message ${group.name}…`}
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

function GroupAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-10 h-10 rounded-2xl object-cover" />;
  }
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
      <Users className="w-4 h-4" />
    </div>
  );
}
