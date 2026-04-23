"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Lock, Mail } from "lucide-react";
import { api, saveAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.login(email, password);
      saveAuth(r.token);
      router.replace("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-10 max-w-md mx-auto">
      <Link href="/" className="glass w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 transition">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
          <span className="text-xs font-bold tracking-[0.3em] text-pink-300">WELCOME BACK</span>
        </div>
        <h1 className="text-4xl font-black leading-tight">
          hey, you&apos;re<br />
          <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">back ✨</span>
        </h1>
        <p className="text-sm text-white/60 mt-2">sign in and find your loop</p>
      </motion.div>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-4">
        <FormField icon={<Mail className="w-5 h-5" />} label="email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@loveloop.app"
            className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
          />
        </FormField>
        <FormField icon={<Lock className="w-5 h-5" />} label="password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 8 chars"
            className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
          />
        </FormField>

        {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "Logging in…" : "Log in 💕"}
        </button>

        <p className="text-center text-sm text-white/50 mt-4">
          No account yet?{" "}
          <Link href="/register" className="text-pink-300 font-semibold hover:underline">
            join the loop
          </Link>
        </p>
      </form>
    </div>
  );
}

function FormField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="glass rounded-2xl px-5 py-3 flex items-center gap-3 focus-within:ring-2 focus-within:ring-pink-400/60 transition">
      <span className="text-pink-300">{icon}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
        {children}
      </div>
    </label>
  );
}
