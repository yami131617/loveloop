"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, PlusSquare, MessageCircle, User } from "lucide-react";

const items = [
  { href: "/feed", icon: Flame, label: "Feed" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/upload", icon: PlusSquare, label: "Post", highlight: true },
  { href: "/chats", icon: MessageCircle, label: "Chat" },
  { href: "/me", icon: User, label: "Me" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-4 pb-3 pt-2">
        <div className="glass rounded-3xl flex justify-around items-center py-2 px-2 shadow-2xl">
          {items.map(({ href, icon: Icon, label, highlight }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            if (highlight) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative -mt-6 btn-gradient-pink w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition rotate-[0deg]"
                  aria-label={label}
                >
                  <Icon className="w-6 h-6 text-white" />
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition ${
                  active ? "text-pink-300" : "text-white/60 hover:text-white/90"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "fill-pink-300/20" : ""}`} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
