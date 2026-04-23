"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

export function SettingsChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen pb-20 max-w-md mx-auto px-6 pt-10">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-white/5 transition"
    >
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        {sub && <div className="text-xs text-white/50 mt-0.5">{sub}</div>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition ${on ? "bg-gradient-to-r from-pink-400 to-fuchsia-500" : "bg-white/15"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </div>
    </button>
  );
}

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      {title && (
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-2 px-1">{title}</div>
      )}
      <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">{children}</div>
    </section>
  );
}

export function Saved({ show }: { show: boolean }) {
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 btn-gradient-pink text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl transition-all ${
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      ✓ Saved
    </div>
  );
}
