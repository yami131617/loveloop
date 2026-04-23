"use client";
import { useState } from "react";
import { ChevronDown, MessageCircleQuestion, Send } from "lucide-react";
import { SettingsChrome, SectionCard } from "@/components/SettingsChrome";

const FAQ = [
  {
    q: "How do I match with someone?",
    a: "Head to Discover, swipe right on profiles you like. If they swipe right on you too, you match and can chat."
  },
  {
    q: "What are mini-games for?",
    a: "Games level up your bond with a match. Win together → more coins + unlock higher relationship levels."
  },
  {
    q: "Can I delete my posts?",
    a: "Yes — tap your post on /me, open it, tap the ⋯ menu. Only you can delete your own posts."
  },
  {
    q: "Someone is bothering me, what do I do?",
    a: "You can block them from their profile. They won't see you in Discover anymore. Report serious issues at safety@loveloop.app."
  },
  {
    q: "Do I need the app to use LoveLoop?",
    a: "No — the web works on any phone browser. Add to Home Screen (PWA) for an app-like experience with zero install."
  },
  {
    q: "Are my photos saved forever?",
    a: "Photos live in our CDN while your account is active. Deleting a post removes it within 24h. Deleting your account removes everything."
  },
  {
    q: "Is LoveLoop free?",
    a: "Yes, matching, chat, posts, games — all free. Cosmetics + premium perks are optional."
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SettingsChrome title="Help & feedback">
      <SectionCard title="FAQ">
        {FAQ.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between text-left gap-3"
            >
              <span className="font-semibold text-sm flex-1">{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-white/50 transition ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <p className="text-sm text-white/70 mt-2 leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Get in touch">
        <a href="mailto:hi@loveloop.app?subject=LoveLoop%20feedback" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 flex items-center justify-center">
            <Send className="w-4 h-4 text-pink-300" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Send feedback</div>
            <div className="text-[11px] text-white/50">hi@loveloop.app</div>
          </div>
        </a>
        <a href="mailto:bugs@loveloop.app?subject=Bug%20report" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <MessageCircleQuestion className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Report a bug</div>
            <div className="text-[11px] text-white/50">we usually respond within 24h</div>
          </div>
        </a>
      </SectionCard>

      <p className="text-xs text-white/40 text-center mt-6 px-4">
        LoveLoop v0.3 · made with 💕 for Gen Z
      </p>
    </SettingsChrome>
  );
}
