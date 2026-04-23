"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, UserX } from "lucide-react";
import { api, hasToken, mediaUrl, type BlockedUser } from "@/lib/api";
import { SettingsChrome, SectionCard } from "@/components/SettingsChrome";

export default function SafetyPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getBlocked().then((r) => setBlocked(r.blocked)).finally(() => setLoading(false));
  }, [router]);

  async function unblock(id: string) {
    await api.unblock(id).catch(() => {});
    setBlocked((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <SettingsChrome title="Safety center">
      <SectionCard title="Community">
        <div className="p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-300 mt-0.5" />
          <div className="text-sm text-white/80">
            LoveLoop is for real, kind connections. Harassment, hate speech, sexual content without consent,
            spam, and scams are not welcome. Report anyone who crosses the line — we review every flag.
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Blocked users${blocked.length ? ` (${blocked.length})` : ""}`}>
        {loading ? (
          <div className="px-4 py-6 text-white/50 text-sm">loading…</div>
        ) : blocked.length === 0 ? (
          <div className="px-4 py-6 text-white/50 text-sm text-center">No blocked users</div>
        ) : (
          blocked.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/u/${b.id}`}>
                {b.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(b.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center font-bold text-sm">
                    {(b.display_name ?? b.username).slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{b.display_name ?? b.username}</div>
                <div className="text-[11px] text-white/50">@{b.username}</div>
              </div>
              <button
                onClick={() => unblock(b.id)}
                className="glass rounded-full px-3 py-1.5 text-xs font-bold hover:bg-white/10 transition flex items-center gap-1"
              >
                <UserX className="w-3 h-3" /> Unblock
              </button>
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard title="Resources">
        <a href="mailto:safety@loveloop.app" className="block px-4 py-3.5 hover:bg-white/5 transition text-sm font-semibold">
          Contact the safety team →
        </a>
      </SectionCard>

      <p className="text-xs text-white/40 text-center mt-6 px-4">
        If you&apos;re in immediate danger, please contact local emergency services first.
      </p>
    </SettingsChrome>
  );
}
