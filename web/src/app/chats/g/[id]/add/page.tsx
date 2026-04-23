"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Check, UserPlus } from "lucide-react";
import { api, hasToken, mediaUrl, type Friend, type GroupMember } from "@/lib/api";

export default function AddGroupMembersPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [picked, setPicked] = useState<Record<string, Friend>>({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    Promise.all([
      api.listFriends().then((r) => setFriends(r.friends)).catch(() => {}),
      api.getGroup(groupId).then((r) => setExistingIds(new Set(r.members.map((m: GroupMember) => m.id)))).catch(() => {}),
    ]);
  }, [groupId, router]);

  useEffect(() => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const h = setTimeout(() => {
      api.searchFriends(q).then((r) => setSearchResults(r.users)).catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  function toggle(u: Friend) {
    if (existingIds.has(u.id)) return;
    setPicked((prev) => {
      const next = { ...prev };
      if (next[u.id]) delete next[u.id];
      else next[u.id] = u;
      return next;
    });
  }

  async function add() {
    const ids = Object.keys(picked);
    if (ids.length === 0) return;
    setAdding(true);
    try {
      await api.addGroupMembers(groupId, ids);
      router.replace(`/chats/g/${groupId}`);
    } catch (e) {
      console.error(e);
      setAdding(false);
    }
  }

  const pool = q.trim().length >= 2 ? searchResults : friends;
  const pickedArr = Object.values(picked);

  return (
    <div className="relative min-h-screen pb-20 px-6 pt-8 max-w-md mx-auto">
      <header className="flex items-center gap-3 mb-5">
        <Link href={`/chats/g/${groupId}`} className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">Add members</h1>
      </header>

      <label className="glass rounded-full px-4 py-2.5 flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search anyone by username…"
          className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
        />
      </label>

      <div className="flex flex-col gap-1 mb-6">
        {pool.length === 0 ? (
          <div className="text-white/50 text-sm text-center py-6">
            {q.trim().length < 2 ? "no friends yet — search a username above" : "no users found"}
          </div>
        ) : (
          pool.map((u) => {
            const inGroup = existingIds.has(u.id);
            const on = !!picked[u.id];
            return (
              <motion.button
                key={u.id}
                layout
                onClick={() => toggle(u)}
                disabled={inGroup}
                className={`glass rounded-2xl p-3 flex items-center gap-3 transition ${
                  inGroup ? "opacity-50 cursor-not-allowed"
                  : on ? "ring-2 ring-pink-400/60"
                  : "hover:bg-white/10"
                }`}
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
                  <div className="font-semibold truncate">{u.display_name ?? u.username}</div>
                  <div className="text-[11px] text-white/50 truncate">@{u.username}{inGroup ? " · already in group" : ""}</div>
                </div>
                {!inGroup && (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    on ? "bg-pink-500 border-pink-500" : "border-white/30"
                  }`}>
                    {on && <Check className="w-4 h-4" />}
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      <button
        onClick={add}
        disabled={adding || pickedArr.length === 0}
        className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        {adding ? "Adding…" : `Add ${pickedArr.length || ""}`}
      </button>
    </div>
  );
}
