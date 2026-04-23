"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Search, Gamepad2, Plus, Users, UserPlus } from "lucide-react";
import { api, hasToken, mediaUrl, type Match, type GroupChat, type Friend, type FriendRequest } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

type Tab = "dm" | "groups" | "friends";

export default function ChatsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dm");
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    Promise.all([
      api.getMatches().then((r) => setMatches(r.matches)).catch(() => {}),
      api.listGroups().then((r) => setGroups(r.groups)).catch(() => {}),
      api.listFriends().then((r) => setFriends(r.friends)).catch(() => {}),
      api.friendRequests().then((r) => setRequests(r.requests)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="relative min-h-screen pb-28 px-6 pt-8 max-w-md mx-auto lg:max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-black">
          Your <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">loops</span> 💕
        </h1>
        <Link
          href="/chats/new"
          className="btn-gradient-pink w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
          aria-label="new group"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="flex gap-1 mb-4 glass rounded-full p-1">
        <TabBtn active={tab === "dm"} onClick={() => setTab("dm")} label="DMs" count={matches.length} />
        <TabBtn active={tab === "groups"} onClick={() => setTab("groups")} label="Groups" count={groups.length} />
        <TabBtn active={tab === "friends"} onClick={() => setTab("friends")} label="Friends" count={friends.length} badge={requests.length} />
      </div>

      <label className="glass rounded-full px-4 py-2.5 flex items-center gap-2 mb-5">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "dm" ? "search matches" : tab === "groups" ? "search groups" : "search friends"}
          className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
        />
      </label>

      {loading ? (
        <div className="text-white/50 text-center py-10">loading…</div>
      ) : tab === "dm" ? (
        <DmList matches={matches} q={q} />
      ) : tab === "groups" ? (
        <GroupList groups={groups} q={q} />
      ) : (
        <FriendsList friends={friends} requests={requests} q={q} onAfterRespond={() => {
          api.friendRequests().then((r) => setRequests(r.requests)).catch(() => {});
          api.listFriends().then((r) => setFriends(r.friends)).catch(() => {});
        }} />
      )}

      <BottomNav />
    </div>
  );
}

function TabBtn({ active, onClick, label, count, badge }: { active: boolean; onClick: () => void; label: string; count?: number; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 py-2 rounded-full text-xs font-bold transition ${
        active ? "btn-gradient-pink text-white shadow" : "text-white/70 hover:text-white"
      }`}
    >
      {label}{count != null ? ` ${count}` : ""}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

function DmList({ matches, q }: { matches: Match[]; q: string }) {
  const filtered = matches.filter((m) =>
    (m.other_display_name ?? m.other_username).toLowerCase().includes(q.toLowerCase())
  );
  if (filtered.length === 0) {
    return (
      <EmptyCard
        icon={<Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />}
        title="No matches yet"
        sub="start swiping to find your loop"
        ctaHref="/discover"
        ctaLabel="Discover"
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {filtered.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Link href={`/chats/${m.id}`} className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition">
            <MatchAvatar name={m.other_display_name ?? m.other_username} src={m.other_avatar_url} level={m.relationship_level} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{m.other_display_name ?? m.other_username}</span>
                <LevelBadge level={m.relationship_level} />
              </div>
              <div className="text-xs text-white/50 truncate">@{m.other_username} · {m.total_games_played} games</div>
            </div>
            <div className="glass w-9 h-9 rounded-full flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-cyan-300" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function GroupList({ groups, q }: { groups: GroupChat[]; q: string }) {
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));
  if (filtered.length === 0) {
    return (
      <EmptyCard
        icon={<Users className="w-10 h-10 text-purple-300 mx-auto mb-3" />}
        title="No group chats yet"
        sub="create one to chat with your friends"
        ctaHref="/chats/new"
        ctaLabel="+ New group"
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {filtered.map((g, i) => (
        <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Link href={`/chats/g/${g.id}`} className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition">
            <GroupAvatar name={g.name} src={g.avatar_url} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{g.name}</div>
              <div className="text-xs text-white/50 truncate">
                {g.member_count} members{g.last_message ? ` · ${g.last_message.content || `[${g.last_message.media_type ?? 'media'}]`}` : ""}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function FriendsList({ friends, requests, q, onAfterRespond }: { friends: Friend[]; requests: FriendRequest[]; q: string; onAfterRespond: () => void }) {
  const filtered = friends.filter((f) =>
    (f.display_name ?? f.username).toLowerCase().includes(q.toLowerCase())
  );
  async function respond(userId: string, action: "accept" | "decline") {
    await api.respondFriendRequest(userId, action).catch(() => {});
    onAfterRespond();
  }
  return (
    <div className="flex flex-col gap-4">
      {requests.length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 px-1">
            Requests ({requests.length})
          </div>
          <div className="glass rounded-2xl divide-y divide-white/5">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <Link href={`/u/${r.id}`}>
                  <SmallAvatar name={r.display_name ?? r.username} src={r.avatar_url} />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{r.display_name ?? r.username}</div>
                  <div className="text-[11px] text-white/50">@{r.username}</div>
                </div>
                <button onClick={() => respond(r.id, "decline")} className="glass px-3 py-1.5 rounded-full text-xs font-bold hover:bg-white/10">Decline</button>
                <button onClick={() => respond(r.id, "accept")} className="btn-gradient-pink px-3 py-1.5 rounded-full text-xs font-bold">Accept</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && q === "" ? (
        <EmptyCard
          icon={<UserPlus className="w-10 h-10 text-cyan-300 mx-auto mb-3" />}
          title="Find your friends"
          sub="search by username to send a friend request"
          ctaHref="/discover"
          ctaLabel="Discover people"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link href={`/u/${f.id}`} className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition">
                <SmallAvatar name={f.display_name ?? f.username} src={f.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{f.display_name ?? f.username}</span>
                    {f.source === "match" && <span className="text-[9px] uppercase tracking-widest bg-pink-500/30 rounded-full px-1.5 py-0.5 font-bold">match</span>}
                  </div>
                  <div className="text-[11px] text-white/50 truncate">@{f.username} · Lv {f.level}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ icon, title, sub, ctaHref, ctaLabel }: { icon: React.ReactNode; title: string; sub: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      {icon}
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-white/60 mb-4">{sub}</p>
      <Link href={ctaHref} className="btn-gradient-pink inline-block px-6 py-2.5 rounded-full text-sm font-bold">
        {ctaLabel}
      </Link>
    </div>
  );
}

function MatchAvatar({ name, src, level }: { name: string; src: string | null; level: number }) {
  const ringColor = level >= 4 ? "ring-yellow-400" : level >= 3 ? "ring-pink-400" : level >= 2 ? "ring-purple-400" : level >= 1 ? "ring-cyan-400" : "ring-white/30";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className={`w-12 h-12 rounded-full object-cover ring-2 ${ringColor}`} />;
  }
  return <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 ring-2 ${ringColor} flex items-center justify-center text-white font-bold`}>{name.slice(0, 1).toUpperCase()}</div>;
}

function GroupAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-12 h-12 rounded-2xl object-cover" />;
  }
  return <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center font-black text-white"><Users className="w-5 h-5" /></div>;
}

function SmallAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(src)} alt={name} className="w-10 h-10 rounded-full object-cover" />;
  }
  return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center font-bold text-sm">{name.slice(0, 1).toUpperCase()}</div>;
}

function LevelBadge({ level }: { level: number }) {
  const labels = ["✨ new", "💕 lv1", "🌹 lv2", "🌟 lv3", "👑 lv4"];
  const colors = ["bg-white/10", "bg-cyan-500/30", "bg-purple-500/30", "bg-pink-500/30", "bg-yellow-500/30"];
  const i = Math.max(0, Math.min(4, level));
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[i]}`}>{labels[i]}</span>;
}
