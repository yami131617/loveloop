"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, hasToken, type Prefs } from "@/lib/api";
import { SettingsChrome, SectionCard, Toggle, Saved } from "@/components/SettingsChrome";

export default function NotificationsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs["notifications"] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getPrefs().then((p) => setPrefs(p.notifications)).catch(() => {});
  }, [router]);

  async function toggle<K extends keyof Prefs["notifications"]>(key: K) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await api.updatePrefs("notifications", { [key]: next[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setPrefs(prefs);
    }
  }

  return (
    <SettingsChrome title="Notifications">
      <Saved show={saved} />
      {!prefs ? (
        <div className="text-white/50 text-center py-8">loading…</div>
      ) : (
        <>
          <SectionCard title="What pings you">
            <Toggle label="New matches" sub="when someone matches back" on={prefs.match} onChange={() => toggle("match")} />
            <Toggle label="New messages" sub="from your matches" on={prefs.message} onChange={() => toggle("message")} />
            <Toggle label="Comments on your posts" on={prefs.comment} onChange={() => toggle("comment")} />
            <Toggle label="Likes on your posts" on={prefs.like} onChange={() => toggle("like")} />
            <Toggle label="New followers" on={prefs.follow} onChange={() => toggle("follow")} />
          </SectionCard>
          <SectionCard title="Delivery">
            <Toggle label="Push notifications" sub="on this device" on={prefs.push} onChange={() => toggle("push")} />
            <Toggle label="Email digest" sub="weekly summary" on={prefs.email} onChange={() => toggle("email")} />
          </SectionCard>
          <p className="text-xs text-white/40 text-center mt-6 px-4">
            Push notifications require you to allow them when your browser prompts. Enable this toggle first, then look for the prompt.
          </p>
        </>
      )}
    </SettingsChrome>
  );
}
