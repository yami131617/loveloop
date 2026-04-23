"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Sparkles, Gamepad2, MessageCircleHeart, Shield, Users2, Flame } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api";

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    if (hasToken()) router.replace("/feed");
  }, [router]);

  return (
    <>
      {/* MOBILE landing — original compact hero */}
      <div className="lg:hidden min-h-screen flex flex-col items-center px-6 pt-12 pb-10 max-w-md mx-auto">
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-7 h-7 text-pink-400 fill-pink-400 animate-pulse" />
            <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 text-transparent bg-clip-text">LOVELOOP</span>
            <Heart className="w-7 h-7 text-pink-400 fill-pink-400 animate-pulse" />
          </div>
          <p className="text-sm text-purple-200/80 italic">match · chat · play · level up</p>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.6 }} className="relative my-10 w-full">
          <div className="aspect-[4/5] rounded-[2rem] glass overflow-hidden relative flex items-center justify-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-10 left-8 w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 shadow-[0_0_60px_rgba(236,72,153,0.6)]" />
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-20 right-10 w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-[0_0_70px_rgba(168,85,247,0.6)]" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-12 left-12 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_50px_rgba(96,165,250,0.6)]" />
            <div className="text-center z-10 px-6">
              <h1 className="text-4xl font-black leading-tight mb-3">
                find your<br />
                <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 text-transparent bg-clip-text">loop ✨</span>
              </h1>
              <p className="text-sm text-white/70">real connection over a swipe.<br />build a bond that levels up 💫</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="w-full grid grid-cols-3 gap-3 mb-8">
          <FeatureChip icon={<Heart className="w-4 h-4" />} label="match" color="from-pink-400 to-rose-500" />
          <FeatureChip icon={<MessageCircleHeart className="w-4 h-4" />} label="chat" color="from-fuchsia-400 to-purple-500" />
          <FeatureChip icon={<Gamepad2 className="w-4 h-4" />} label="play" color="from-cyan-400 to-blue-500" />
        </motion.div>

        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="w-full flex flex-col gap-3">
          <Link href="/register" className="btn-gradient-pink w-full py-4 rounded-full font-bold text-center text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition">
            Join the loop <Sparkles className="inline w-4 h-4 ml-1" />
          </Link>
          <Link href="/login" className="glass w-full py-4 rounded-full font-semibold text-center text-white/90 hover:bg-white/10 transition">
            I already have an account
          </Link>
        </motion.div>
      </div>

      {/* DESKTOP landing — proper marketing layout */}
      <div className="hidden lg:block min-h-screen overflow-hidden">
        {/* Top nav */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-12 py-6">
          <div className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-pink-400 fill-pink-400" />
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 text-transparent bg-clip-text">LoveLoop</span>
          </div>
          <nav className="flex items-center gap-8 text-sm font-semibold text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#games" className="hover:text-white transition">Mini-games</a>
            <a href="#safe" className="hover:text-white transition">Safe</a>
            <Link href="/login" className="hover:text-white transition">Log in</Link>
            <Link href="/register" className="btn-gradient-pink px-5 py-2 rounded-full font-bold text-white shadow-lg">
              Join free
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative px-12 pt-36 pb-20 max-w-7xl mx-auto grid grid-cols-12 gap-8 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="col-span-7">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase text-pink-200">
              <Sparkles className="w-3 h-3" /> made for Gen Z
            </div>
            <h1 className="text-6xl xl:text-7xl font-black leading-[1.05] mb-6">
              find your<br />
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 text-transparent bg-clip-text">loop</span> —{" "}
              <span className="text-white/80">not just<br />another match.</span>
            </h1>
            <p className="text-xl text-white/70 max-w-xl mb-8 leading-relaxed">
              Dating built on vibes, not just looks. Swipe, chat, play mini-games with your match to level up
              your bond. Real connection, no cringe.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/register" className="btn-gradient-pink px-8 py-4 rounded-full font-bold text-white shadow-2xl text-lg hover:scale-[1.02] active:scale-[0.98] transition">
                Start your loop <Sparkles className="inline w-5 h-5 ml-1" />
              </Link>
              <Link href="/login" className="glass px-6 py-4 rounded-full font-semibold text-white/90 hover:bg-white/10 transition text-lg">
                Log in
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Free forever</div>
              <div>·</div>
              <div>No ads</div>
              <div>·</div>
              <div>You own your data</div>
            </div>
          </motion.div>

          {/* Phone mockup with animated elements */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="col-span-5 flex justify-center"
          >
            <div className="relative w-[360px] aspect-[9/19.5]">
              {/* Phone frame */}
              <div className="absolute inset-0 rounded-[3rem] border-8 border-[#1a0e2e] shadow-[0_40px_120px_-20px_rgba(236,72,153,0.4)] overflow-hidden bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-indigo-900">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a0e2e] rounded-b-3xl z-10" />
                {/* Content inside phone */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-16 left-8 w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 shadow-[0_0_50px_rgba(236,72,153,0.8)]" />
                  <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-32 right-8 w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-[0_0_60px_rgba(168,85,247,0.8)]" />
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-40 left-10 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_45px_rgba(96,165,250,0.8)]" />
                  <div className="relative z-10 text-center">
                    <div className="text-xs uppercase tracking-[0.3em] text-pink-200/80 font-bold mb-2">✨ Your loop</div>
                    <h3 className="text-3xl font-black leading-tight">find your<br /><span className="bg-gradient-to-r from-pink-300 to-purple-300 text-transparent bg-clip-text">someone</span></h3>
                  </div>
                </div>
              </div>
              {/* Floating heart decoration */}
              <motion.div
                animate={{ rotate: [0, 10, -5, 0], y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-2xl"
              >
                <Heart className="w-10 h-10 text-white fill-white" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, -10, 5, 0], y: [0, 8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl"
              >
                <Gamepad2 className="w-8 h-8 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features grid */}
        <section id="features" className="px-12 py-20 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-pink-300 uppercase mb-3">✨ Why LoveLoop</div>
            <h2 className="text-5xl font-black mb-4">Built different.</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Not another swipe-fest. Every feature is designed to spark real conversation and deeper bonds.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <FeatureCard icon={<Heart />} title="Smart matching" color="from-pink-400 to-rose-500" desc="Not just faces — matched by interests, vibes, and energy. Swipe less, click more." />
            <FeatureCard icon={<Gamepad2 />} title="Mini-games" color="from-cyan-400 to-blue-500" desc="5 live games with your match. Quiz, rhythm, trivia — earn coins together, unlock relationship levels." />
            <FeatureCard icon={<MessageCircleHeart />} title="Realtime chat + video call" color="from-fuchsia-400 to-purple-500" desc="Send photos, videos, voice. Jump into video call with one tap. Socket-powered, zero lag." />
            <FeatureCard icon={<Users2 />} title="Public vibe rooms" color="from-emerald-400 to-teal-500" desc="Chat with the music crew, gamer club, late-night owls. Find your people before you find your one." />
            <FeatureCard icon={<Flame />} title="TikTok-style feed" color="from-orange-400 to-rose-500" desc="Drop video posts with built-in editor — trim, add music. Likes, comments, follows. Go viral on purpose." />
            <FeatureCard icon={<Shield />} title="Safe by default" color="from-indigo-400 to-purple-500" desc="Block, report, control who sees you. Gen Z cares about safety — so do we." />
          </div>
        </section>

        {/* Games strip */}
        <section id="games" className="px-12 py-20 max-w-7xl mx-auto">
          <div className="glass rounded-3xl p-12 grid grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-cyan-300 uppercase mb-3">🎮 What makes us weird</div>
              <h2 className="text-4xl font-black mb-4">Matches aren&apos;t the endgame.<br />Bonds are.</h2>
              <p className="text-white/70 mb-6 leading-relaxed">
                Every match unlocks 5 mini-games. The more you play together, the higher your relationship
                level — from new (✨) to soulmates (👑). Each level unlocks new rewards, stickers, and cosmetics.
              </p>
              <Link href="/register" className="btn-gradient-pink inline-block px-6 py-3 rounded-full font-bold text-white shadow-lg">
                Try the vibe quiz →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["✨ new", "💕 lv1", "🌹 lv2", "🌟 lv3", "👑 lv4", "🎮 play"].map((l) => (
                <div key={l} className="glass rounded-2xl p-4 text-center font-bold">{l}</div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA bottom */}
        <section id="safe" className="px-12 py-24 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-4">
            Stop settling for <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">meh.</span>
          </h2>
          <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
            Loveloop is free, ad-free, Gen Z first. Join the early loop.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="btn-gradient-pink px-10 py-5 rounded-full font-black text-white shadow-2xl text-xl hover:scale-[1.02] active:scale-[0.98] transition">
              Join free <Sparkles className="inline w-5 h-5 ml-1" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/5 px-12 py-8 text-sm text-white/40 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            <span>LoveLoop · made with 💕 for Gen Z</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="mailto:hi@loveloop.app" className="hover:text-white">Contact</a>
            <a href="/settings/safety" className="hover:text-white">Safety</a>
            <a href="/settings/help" className="hover:text-white">Help</a>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureChip({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white`}>{icon}</div>
      <span className="text-xs font-semibold text-white/80">{label}</span>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-3xl p-7 hover:bg-white/10 transition"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white`}>
        {icon}
      </div>
      <h3 className="text-xl font-black mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
