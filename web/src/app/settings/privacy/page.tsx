"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, hasToken, type Prefs } from "@/lib/api";
import { SettingsChrome, SectionCard, Toggle, Saved } from "@/components/SettingsChrome";

export default function PrivacyPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs["privacy"] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getPrefs().then((p) => setPrefs(p.privacy)).catch(() => {});
  }, [router]);

  async function toggle<K extends keyof Prefs["privacy"]>(key: K) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await api.updatePrefs("privacy", { [key]: next[key] });
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch {
      setPrefs(prefs);
    }
  }

  return (
    <SettingsChrome title="Privacy">
      <Saved show={saved} />
      {!prefs ? (
        <div className="text-white/50 text-center py-8">loading…</div>
      ) : (
        <>
          <SectionCard title="Discoverability">
            <Toggle label="Discoverable in swipe" sub="others can see your card in Discover" on={prefs.discoverable} onChange={() => toggle("discoverable")} />
          </SectionCard>
          <SectionCard title="What others see">
            <Toggle label="Show my age" on={prefs.show_age} onChange={() => toggle("show_age")} />
            <Toggle label="Show distance" on={prefs.show_distance} onChange={() => toggle("show_distance")} />
            <Toggle label="Show online status" on={prefs.show_online} onChange={() => toggle("show_online")} />
          </SectionCard>
          <SectionCard title="Messaging">
            <Toggle label="Read receipts" sub="let matches know you've read their message" on={prefs.read_receipts} onChange={() => toggle("read_receipts")} />
          </SectionCard>
        </>
      )}
    </SettingsChrome>
  );
}
