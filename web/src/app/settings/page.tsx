"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, User, Bell, Lock, Eye, LogOut, Shield, HelpCircle, Heart, ChevronRight } from "lucide-react";
import { api, hasToken, clearAuth, type User as UserT } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserT | null>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.me().then((r) => setUser(r.user)).catch(() => router.replace("/"));
  }, [router]);

  function logout() {
    clearAuth();
    router.replace("/");
  }

  return (
    <div className="relative min-h-screen pb-20 max-w-md mx-auto px-6 pt-10">
      <header className="flex items-center gap-3 mb-8">
        <Link href="/me" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">Settings</h1>
      </header>

      {user && (
        <Link href="/settings/profile" className="glass rounded-3xl p-4 flex items-center gap-4 mb-6 hover:bg-white/10 transition">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xl font-black">
            {(user.display_name ?? user.username).slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-bold">{user.display_name ?? user.username}</div>
            <div className="text-xs text-white/60">@{user.username} · Lv {user.level ?? 1}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </Link>
      )}

      <Section title="Account">
        <Row href="/settings/profile" icon={<User />} label="Edit profile" />
        <Row href="/settings/notifications" icon={<Bell />} label="Notifications" />
        <Row href="/settings/privacy" icon={<Eye />} label="Privacy" />
        <Row href="/settings/security" icon={<Lock />} label="Password & security" />
      </Section>

      <Section title="Dating">
        <Row href="/settings/discover" icon={<Heart />} label="Discover preferences" />
        <Row href="/settings/safety" icon={<Shield />} label="Safety center" />
      </Section>

      <Section title="Support">
        <Row href="/settings/help" icon={<HelpCircle />} label="Help & feedback" />
      </Section>

      <button
        onClick={logout}
        className="mt-6 w-full glass rounded-full py-3 text-rose-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-500/10 transition"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>

      <p className="text-center text-xs text-white/30 mt-8">LoveLoop v0.2 · made for Gen Z</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={false} animate={{ opacity: 1 }} className="mb-6">
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-2 px-1">{title}</div>
      <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">{children}</div>
    </motion.section>
  );
}

function Row({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 transition">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-pink-300 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <span className="flex-1 font-semibold text-sm">{label}</span>
      <ChevronRight className="w-5 h-5 text-white/30" />
    </Link>
  );
}
