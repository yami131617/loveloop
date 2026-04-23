"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, Plus, MessageCircle, User, Users2, Heart, Settings, Gamepad2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api, hasToken, clearAuth, mediaUrl, type User as UserT } from "@/lib/api";
import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  icon: typeof Flame;
  label: string;
  accent?: boolean;
  match?: string[];
};

const primary: NavItem[] = [
  { href: "/feed", icon: Flame, label: "Feed" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/rooms", icon: Users2, label: "Rooms" },
  { href: "/chats", icon: MessageCircle, label: "Chats" },
  { href: "/play", icon: Gamepad2, label: "Play" },
];

const secondary: NavItem[] = [
  { href: "/me", icon: User, label: "Profile", match: ["/me"] },
  { href: "/settings", icon: Settings, label: "Settings", match: ["/settings"] },
];

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserT | null>(null);

  useEffect(() => {
    if (!hasToken()) return;
    api.me().then((r) => setUser(r.user)).catch(() => {});
  }, [pathname]);

  const isActive = (it: NavItem) =>
    (it.match && it.match.some((m) => pathname === m || pathname.startsWith(m + "/"))) ||
    pathname === it.href ||
    pathname.startsWith(it.href + "/");

  function logout() {
    clearAuth();
    router.replace("/");
  }

  return (
    <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-64 xl:w-72 border-r border-white/5 backdrop-blur-xl bg-black/30 z-30 flex-col">
      <Link href="/feed" className="flex items-center gap-2 px-6 pt-7 pb-6">
        <Heart className="w-7 h-7 text-pink-400 fill-pink-400" />
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 text-transparent bg-clip-text">
          LoveLoop
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto px-3">
        <Link
          href="/upload"
          className="btn-gradient-pink w-full py-3 rounded-2xl font-bold text-center text-white shadow-lg flex items-center justify-center gap-2 mb-4 hover:scale-[1.02] active:scale-[0.98] transition"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Create post
        </Link>

        <nav className="flex flex-col gap-1">
          {primary.map((it) => (
            <NavLink key={it.href} item={it} active={isActive(it)} />
          ))}
        </nav>

        <div className="my-4 h-px bg-white/5" />

        <nav className="flex flex-col gap-1">
          {secondary.map((it) => (
            <NavLink key={it.href} item={it} active={isActive(it)} />
          ))}
        </nav>
      </div>

      {user ? (
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/5 transition">
            <Link href="/me" className="flex items-center gap-3 flex-1 min-w-0">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(user.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-300/40" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center font-bold text-sm ring-2 ring-pink-300/40">
                  {(user.display_name ?? user.username).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{user.display_name ?? user.username}</div>
                <div className="text-[11px] text-white/50 truncate">@{user.username} · Lv {user.level ?? 1}</div>
              </div>
            </Link>
            <button
              onClick={logout}
              className="text-white/40 hover:text-rose-300 transition p-1.5 rounded-lg hover:bg-rose-500/10"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/5 p-3">
          <Link href="/login" className="btn-gradient-pink w-full py-2.5 rounded-full font-bold text-center text-white shadow-lg block">
            Log in
          </Link>
        </div>
      )}
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold text-sm transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-pink-300 fill-pink-300/20" : ""}`} />
      {item.label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />}
    </Link>
  );
}
