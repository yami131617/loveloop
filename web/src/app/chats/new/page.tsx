"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Check, Users } from "lucide-react";
import { api, hasToken, mediaUrl, type Friend } from "@/lib/api";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [picked, setPicked] = useState<Record<string, Friend>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.listFriends().then((r) => setFriends(r.friends)).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const h = setTimeout(() => {
      api.searchFriends(q).then((r) => setSearchResults(r.users)).catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  function toggle(u: Friend) {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[u.id]) delete next[u.id];
      else next[u.id] = u;
      return next;
    });
  }

  async function create() {
    const ids = Object.keys(picked);
    if (!name.trim() || ids.length === 0) return;
    setCreating(true);
    try {
      const r = await api.createGroup(name.trim(), ids);
      router.replace(`/chats/g/${r.group.id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  }

  const pool = q.trim().length >= 2 ? searchResults : friends;
  const pickedArr = Object.values(picked);

  return (
    <div className="relative min-h-screen pb-28 px-6 pt-8 max-w-md mx-auto">
      <header className="flex items-center gap-3 mb-5">
        <Link href="/chats" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">New group</h1>
      </header>

      <label className="glass rounded-2xl px-5 py-3 block focus-within:ring-2 focus-within:ring-pink-400/60 transition mb-4">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Group name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="late night crew ✨"
          maxLength={80}
          className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
        />
      </label>

      {pickedArr.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 px-1">
            Members ({pickedArr.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {pickedArr.map((u) => (
              <button
                key={u.id}
                onClick={() => toggle(u)}
                className="btn-gradient-pink text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              >
                {u.display_name ?? u.username}
                <span className="text-white/80">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="glass rounded-full px-4 py-2.5 flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search anyone by username…"
          className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
        />
      </label>

      {q.trim().length < 2 && (
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 px-1">
          Friends & matches ({friends.length})
        </div>
      )}

      <div className="flex flex-col gap-1 mb-6">
        {pool.length === 0 ? (
          <div className="text-white/50 text-sm text-center py-6">
            {q.trim().length < 2 ? "no friends yet — search a username above" : "no users found"}
          </div>
        ) : (
          pool.map((u) => {
            const on = !!picked[u.id];
            return (
              <motion.button
                key={u.id}
                layout
                onClick={() => toggle(u)}
                className={`glass rounded-2xl p-3 flex items-center gap-3 transition ${on ? "ring-2 ring-pink-400/60" : "hover:bg-white/10"}`}
              >
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(u.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center font-bold text-sm">
                    {(u.display_name ?? u.username).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">{u.display_name ?? u.username}</span>
                    {u.source === "match" && <span className="text-[9px] uppercase tracking-widest bg-pink-500/30 rounded-full px-1.5 py-0.5 font-bold">match</span>}
                  </div>
                  <div className="text-[11px] text-white/50 truncate">@{u.username}</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                  on ? "bg-pink-500 border-pink-500" : "border-white/30"
                }`}>
                  {on && <Check className="w-4 h-4" />}
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <button
        onClick={create}
        disabled={creating || !name.trim() || pickedArr.length === 0}
        className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" />
        {creating ? "Creating…" : `Create group${pickedArr.length ? ` (${pickedArr.length + 1})` : ""}`}
      </button>
    </div>
  );
}
