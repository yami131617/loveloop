"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Play, Pause, Heart, Check, Flame, X, Music2 } from "lucide-react";
import { api, type MusicTrack } from "@/lib/api";

type Props = {
  value: MusicTrack | null;
  onPick: (track: MusicTrack | null) => void;
  onClose?: () => void;
  embedded?: boolean; // when true, render inside a panel; when false, render as modal
};

const CATEGORY_LABELS: Record<string, string> = {
  lofi: "🌙 Lofi",
  pop: "🌈 Pop",
  electronic: "⚡ Electronic",
  hiphop: "🔥 Hip-Hop",
  romantic: "💕 Romantic",
  acoustic: "🌻 Acoustic",
  workout: "💪 Workout",
  viral: "✨ Viral",
  cinematic: "🎬 Cinematic",
};

export function MusicPicker({ value, onPick, onClose, embedded }: Props) {
  const [tab, setTab] = useState<"trending" | "category" | "favs" | "search">("trending");
  const [category, setCategory] = useState<string>("lofi");
  const [categories, setCategories] = useState<{ category: string; track_count: number }[]>([]);
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.musicCategories().then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Parameters<typeof api.musicList>[0] = {};
    if (tab === "trending") params.trending = true;
    else if (tab === "favs") params.favorite = true;
    else if (tab === "category") params.category = category;
    else if (tab === "search" && q.trim().length >= 2) params.q = q.trim();
    else { setTracks([]); setLoading(false); return; }
    api.musicList(params).then((r) => setTracks(r.tracks)).catch(() => setTracks([])).finally(() => setLoading(false));
  }, [tab, category, q]);

  useEffect(() => {
    // Ensure audio element exists (client-only)
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.7;
    }
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  function togglePlay(t: MusicTrack) {
    if (!audioRef.current) return;
    if (playing === t.id) {
      audioRef.current.pause();
      setPlaying(null);
      return;
    }
    audioRef.current.src = t.url;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setPlaying(t.id);
    audioRef.current.onended = () => setPlaying(null);
  }

  async function toggleFav(t: MusicTrack) {
    try {
      const r = await api.favoriteMusic(t.id);
      setTracks((prev) => prev.map((x) => x.id === t.id ? { ...x, favorited_by_me: r.favorited } : x));
    } catch {}
  }

  function pick(t: MusicTrack) {
    // Stop any preview playing and commit
    if (audioRef.current) audioRef.current.pause();
    setPlaying(null);
    api.useMusic(t.id).catch(() => {});
    onPick(t);
    onClose?.();
  }

  const content = (
    <>
      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Tab active={tab === "trending"} onClick={() => setTab("trending")} icon={<Flame className="w-3.5 h-3.5" />} label="Trending" />
        <Tab active={tab === "category"} onClick={() => setTab("category")} icon={<Music2 className="w-3.5 h-3.5" />} label="Browse" />
        <Tab active={tab === "favs"} onClick={() => setTab("favs")} icon={<Heart className="w-3.5 h-3.5" />} label="Saved" />
        <Tab active={tab === "search"} onClick={() => setTab("search")} icon={<Search className="w-3.5 h-3.5" />} label="Search" />
      </div>

      {/* Sub-controls: search bar OR category chips */}
      {tab === "search" && (
        <label className="glass rounded-full px-4 py-2 flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="search by title, artist, mood…"
            className="bg-transparent outline-none w-full text-sm placeholder:text-white/40"
          />
        </label>
      )}
      {tab === "category" && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 mb-3 pb-1">
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setCategory(c.category)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                category === c.category
                  ? "bg-pink-500/30 border-pink-300/60 text-white"
                  : "glass border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {CATEGORY_LABELS[c.category] ?? c.category} <span className="text-white/40">· {c.track_count}</span>
            </button>
          ))}
        </div>
      )}

      {/* "Original audio" option (no music) */}
      <button
        onClick={() => { onPick(null); onClose?.(); }}
        className={`w-full glass rounded-2xl p-2.5 mb-2 flex items-center gap-3 border text-left transition ${
          value === null ? "border-pink-300/60 bg-pink-500/10" : "border-white/10 hover:bg-white/5"
        }`}
      >
        <div className="w-11 h-11 rounded-xl bg-zinc-700 flex items-center justify-center">
          <Music2 className="w-5 h-5 text-white/50" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm">Original audio</div>
          <div className="text-[11px] text-white/50">no music overlay — keep the video&apos;s own sound</div>
        </div>
        {value === null && <Check className="w-5 h-5 text-pink-300" />}
      </button>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-white/40 py-6 text-sm">loading…</div>
        ) : tracks.length === 0 ? (
          <div className="text-center text-white/40 py-6 text-sm">
            {tab === "search"
              ? (q.trim().length < 2 ? "type at least 2 chars…" : "no tracks match")
              : tab === "favs" ? "no saved tracks yet — tap ♥ to save"
              : "no tracks"}
          </div>
        ) : (
          tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              selected={value?.id === t.id}
              playing={playing === t.id}
              onPlay={() => togglePlay(t)}
              onFav={() => toggleFav(t)}
              onPick={() => pick(t)}
            />
          ))
        )}
      </div>
    </>
  );

  if (embedded) return <div className="flex flex-col h-full min-h-0">{content}</div>;

  // Modal version — fullscreen bottom sheet
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[55] bg-[#120821] flex flex-col"
    >
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <button onClick={onClose} className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-black">Pick a sound</h2>
        <div className="w-10" />
      </header>
      <div className="flex-1 min-h-0 flex flex-col px-5 pt-4 pb-5">{content}</div>
    </motion.div>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
        active ? "btn-gradient-pink text-white shadow" : "glass text-white/70 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TrackRow({ track: t, selected, playing, onPlay, onFav, onPick }: {
  track: MusicTrack; selected: boolean; playing: boolean;
  onPlay: () => void; onFav: () => void; onPick: () => void;
}) {
  return (
    <div className={`glass rounded-2xl p-2.5 flex items-center gap-3 border transition ${
      selected ? "border-pink-300/60 bg-pink-500/10 ring-2 ring-pink-400/30" : "border-white/10"
    }`}>
      <button
        onClick={onPlay}
        className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${t.cover_gradient} flex items-center justify-center shadow-lg shrink-0 hover:scale-105 active:scale-95 transition`}
        aria-label={playing ? "pause" : "play preview"}
      >
        {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-[1px]" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate">{t.title}</span>
          {t.is_trending && <Flame className="w-3 h-3 text-orange-400 fill-orange-400 shrink-0" />}
        </div>
        <div className="text-[11px] text-white/50 truncate flex items-center gap-1.5">
          <span>{t.artist}</span>
          <span className="text-white/30">·</span>
          <span>{fmt(t.duration_seconds)}</span>
          <span className="text-white/30">·</span>
          <span>{t.use_count.toLocaleString()} uses</span>
        </div>
      </div>
      <button
        onClick={onFav}
        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-pink-300 transition"
        aria-label="save"
      >
        <Heart className={`w-4 h-4 ${t.favorited_by_me ? "fill-pink-400 text-pink-400" : ""}`} />
      </button>
      <button
        onClick={onPick}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
          selected ? "bg-pink-500 text-white" : "btn-gradient-pink text-white"
        }`}
      >
        {selected ? <Check className="w-3.5 h-3.5 inline" /> : "Use"}
      </button>
    </div>
  );
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
