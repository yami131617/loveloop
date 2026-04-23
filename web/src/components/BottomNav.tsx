"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, PlusSquare, MessageCircle, User, Users2 } from "lucide-react";

const items = [
  { href: "/feed", icon: Flame, label: "Feed" },
  { href: "/rooms", icon: Users2, label: "Rooms" },
  { href: "/upload", icon: PlusSquare, label: "Post", highlight: true },
  { href: "/discover", icon: Compass, label: "Swipe" },
  { href: "/chats", icon: MessageCircle, label: "Chat" },
];

const meTab = { href: "/me", icon: User, label: "Me" };

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-3 pb-3 pt-2">
        <div className="glass rounded-3xl flex justify-around items-center py-2 px-2 shadow-2xl">
          {items.map(({ href, icon: Icon, label, highlight }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            if (highlight) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative -mt-6 btn-gradient-pink w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
                  aria-label={label}
                >
                  <Icon className="w-6 h-6 text-white" />
                </Link>
              );
            }
            return <NavItem key={href} href={href} Icon={Icon} label={label} active={active} />;
          })}
          <NavItem
            href={meTab.href}
            Icon={meTab.icon}
            label={meTab.label}
            active={pathname === meTab.href || pathname.startsWith(meTab.href + "/") || pathname.startsWith("/settings")}
          />
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, Icon, label, active }: { href: string; Icon: typeof Flame; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition ${
        active ? "text-pink-300" : "text-white/60 hover:text-white/90"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "fill-pink-300/20" : ""}`} />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
