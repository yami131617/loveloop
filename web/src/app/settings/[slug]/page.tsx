"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

const LABELS: Record<string, { title: string; blurb: string }> = {
  notifications: { title: "Notifications", blurb: "control what pings you" },
  privacy: { title: "Privacy", blurb: "who sees your stuff" },
  security: { title: "Password & security", blurb: "lock down your account" },
  discover: { title: "Discover preferences", blurb: "who shows up in your deck" },
  safety: { title: "Safety center", blurb: "report · block · help" },
  help: { title: "Help & feedback", blurb: "we'd love to hear from you" },
};

export default function SettingsPlaceholderPage() {
  const params = useParams<{ slug: string }>();
  const meta = LABELS[params.slug] ?? { title: "Settings", blurb: "coming soon" };

  return (
    <div className="relative min-h-screen flex flex-col items-center max-w-md mx-auto px-6 pt-10">
      <header className="w-full flex items-center gap-3 mb-8">
        <Link href="/settings" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">{meta.title}</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-16">
        <div className="w-20 h-20 btn-gradient-pink rounded-3xl flex items-center justify-center shadow-xl">
          <Sparkles className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black mb-1">Coming soon</h2>
          <p className="text-sm text-white/60">{meta.blurb}</p>
        </div>
        <Link href="/settings" className="glass px-5 py-2.5 rounded-full text-sm font-semibold">
          ← Back to settings
        </Link>
      </div>
    </div>
  );
}
