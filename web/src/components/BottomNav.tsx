"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Plus, MessageCircle, User, Users2 } from "lucide-react";

// 5 equal tabs, mobile-first. The `+` tab has a subtle gradient tint to stand out
// without breaking the grid rhythm. Swipe lives on the Feed header, Settings under Me.
type Tab = {
  href: string;
  icon: typeof Flame;
  label: string;
  accent?: boolean;
  match?: string[];
};

const tabs: Tab[] = [
  { href: "/feed",   icon: Flame,         label: "Feed"   },
  { href: "/rooms",  icon: Users2,        label: "Rooms"  },
  { href: "/upload", icon: Plus,          label: "Post", accent: true },
  { href: "/chats",  icon: MessageCircle, label: "Chat"   },
  { href: "/me",     icon: User,          label: "Me",   match: ["/me", "/settings"] },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav data-mobile-nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-3 pb-3 pt-2">
        <div className="glass rounded-3xl shadow-2xl grid grid-cols-5 items-stretch p-1.5 gap-1">
          {tabs.map((t) => {
            const match = t.match ?? [t.href];
            const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
            if (t.accent) {
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-label={t.label}
                  className="flex items-center justify-center"
                >
                  <span
                    className={`btn-gradient-pink w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition ${
                      active ? "scale-105" : "hover:scale-105 active:scale-95"
                    }`}
                  >
                    <t.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition ${
                  active ? "text-pink-300" : "text-white/60 hover:text-white/90"
                }`}
              >
                <t.icon className={`w-5 h-5 ${active ? "fill-pink-300/20" : ""}`} />
                <span className="text-[10px] font-semibold">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
