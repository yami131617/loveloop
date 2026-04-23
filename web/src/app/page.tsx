"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Sparkles, Gamepad2, MessageCircleHeart } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api";

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    if (hasToken()) router.replace("/feed");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 pt-12 pb-10 max-w-md mx-auto">
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-7 h-7 text-pink-400 fill-pink-400 animate-pulse" />
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 text-transparent bg-clip-text">
            LOVELOOP
          </span>
          <Heart className="w-7 h-7 text-pink-400 fill-pink-400 animate-pulse" />
        </div>
        <p className="text-sm text-purple-200/80 italic">match · chat · play · level up</p>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="relative my-10 w-full"
      >
        <div className="aspect-[4/5] rounded-[2rem] glass overflow-hidden relative flex items-center justify-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-8 w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 shadow-[0_0_60px_rgba(236,72,153,0.6)]"
          />
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-10 w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-[0_0_70px_rgba(168,85,247,0.6)]"
          />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-12 left-12 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_50px_rgba(96,165,250,0.6)]"
          />
          <div className="text-center z-10 px-6">
            <h1 className="text-4xl font-black leading-tight mb-3">
              find your<br />
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 text-transparent bg-clip-text">
                loop ✨
              </span>
            </h1>
            <p className="text-sm text-white/70">
              real connection over a swipe.<br />build a bond that levels up 💫
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full grid grid-cols-3 gap-3 mb-8"
      >
        <FeatureChip icon={<Heart className="w-4 h-4" />} label="match" color="from-pink-400 to-rose-500" />
        <FeatureChip icon={<MessageCircleHeart className="w-4 h-4" />} label="chat" color="from-fuchsia-400 to-purple-500" />
        <FeatureChip icon={<Gamepad2 className="w-4 h-4" />} label="play" color="from-cyan-400 to-blue-500" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full flex flex-col gap-3"
      >
        <Link
          href="/register"
          className="btn-gradient-pink w-full py-4 rounded-full font-bold text-center text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition"
        >
          Join the loop <Sparkles className="inline w-4 h-4 ml-1" />
        </Link>
        <Link
          href="/login"
          className="glass w-full py-4 rounded-full font-semibold text-center text-white/90 hover:bg-white/10 transition"
        >
          I already have an account
        </Link>
      </motion.div>
    </div>
  );
}

function FeatureChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <span className="text-xs font-semibold text-white/80">{label}</span>
    </div>
  );
}
