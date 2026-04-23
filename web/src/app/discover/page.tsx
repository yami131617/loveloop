"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, X, Sparkles, Flame, Gamepad2 } from "lucide-react";
import { api, type Card, hasToken } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";

export default function DiscoverPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getCards(15).then((r) => setCards(r.cards)).catch(() => setCards([]));
  }, [router]);

  const current = cards[idx];

  async function swipe(action: "like" | "dislike" | "super_like") {
    if (!current) return;
    const target = current;
    setIdx((i) => i + 1);
    try {
      const r = await api.swipe(target.id, action);
      if (r.matched) {
        setMatchBanner(target.display_name ?? target.username);
        setTimeout(() => setMatchBanner(null), 3000);
      }
    } catch {}
  }

  return (
    <div className="relative min-h-screen pb-28 flex flex-col">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between max-w-md mx-auto lg:max-w-lg w-full">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-pink-300 font-bold">Discover</div>
          <h1 className="text-3xl font-black">People near you</h1>
        </div>
        <div className="glass w-12 h-12 rounded-full flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          <AnimatePresence>
            {current ? (
              <SwipeCard key={current.id} card={current} onSwipe={swipe} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 glass rounded-3xl flex flex-col items-center justify-center text-center p-8"
              >
                <Sparkles className="w-12 h-12 text-pink-300 mb-4" />
                <h2 className="text-xl font-bold mb-1">That&apos;s everyone for now</h2>
                <p className="text-sm text-white/60">Come back later — new vibes drop daily</p>
                <button
                  onClick={() => api.getCards(15).then((r) => { setCards(r.cards); setIdx(0); }).catch(() => {})}
                  className="btn-gradient-pink mt-6 px-6 py-3 rounded-full font-bold text-sm"
                >
                  refresh
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {current && (
        <div className="max-w-md mx-auto lg:max-w-lg w-full px-6 pb-4 flex items-center justify-center gap-4">
          <ActionBtn onClick={() => swipe("dislike")} color="from-zinc-700 to-zinc-900" size={14}>
            <X className="w-7 h-7" />
          </ActionBtn>
          <ActionBtn onClick={() => swipe("super_like")} color="from-cyan-400 to-blue-500" size={12}>
            <Sparkles className="w-5 h-5" />
          </ActionBtn>
          <ActionBtn onClick={() => swipe("like")} color="from-pink-400 to-rose-500" size={14}>
            <Heart className="w-7 h-7 fill-white" />
          </ActionBtn>
        </div>
      )}

      <AnimatePresence>
        {matchBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="glass rounded-3xl px-8 py-10 text-center max-w-xs">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="mx-auto w-20 h-20 rounded-full btn-gradient-pink flex items-center justify-center mb-4"
              >
                <Heart className="w-10 h-10 text-white fill-white" />
              </motion.div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-pink-300 to-purple-300 text-transparent bg-clip-text mb-2">
                It&apos;s a match!
              </h2>
              <p className="text-white/70">you and {matchBanner} locked in 💫</p>
              <button className="mt-6 btn-gradient-pink w-full py-3 rounded-full font-bold flex items-center justify-center gap-2">
                <Gamepad2 className="w-5 h-5" /> Play a mini-game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function SwipeCard({ card, onSwipe }: { card: Card; onSwipe: (a: "like" | "dislike") => void }) {
  function onDragEnd(_: MouseEvent, info: PanInfo) {
    if (info.offset.x > 120) onSwipe("like");
    else if (info.offset.x < -120) onSwipe("dislike");
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd as (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: 400, opacity: 0, rotate: 20 }}
      whileDrag={{ scale: 1.02 }}
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl"
      style={{ background: "linear-gradient(135deg, #ff8ac3 0%, #a86bde 50%, #50388f 100%)" }}
    >
      {card.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.avatar_url} alt={card.username} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-8xl font-black text-white/30">
            {(card.display_name ?? card.username).slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h2 className="text-3xl font-black leading-tight">
          {card.display_name ?? card.username}
          {card.age != null && <span className="text-white/70 font-medium">, {card.age}</span>}
        </h2>
        {card.bio && <p className="text-sm text-white/80 mt-1 line-clamp-2">{card.bio}</p>}
        {card.interests?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {card.interests.slice(0, 4).map((i) => (
              <span key={i} className="text-xs bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full font-medium">
                {i}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({ children, onClick, color, size }: { children: React.ReactNode; onClick: () => void; color: string; size: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${color} shadow-lg hover:scale-110 active:scale-95 transition flex items-center justify-center text-white`}
      style={{ width: size * 4, height: size * 4 }}
    >
      {children}
    </button>
  );
}
