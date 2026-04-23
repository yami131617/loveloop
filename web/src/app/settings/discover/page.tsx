"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, hasToken, type Prefs } from "@/lib/api";
import { SettingsChrome, SectionCard, Saved } from "@/components/SettingsChrome";

export default function DiscoverSettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs["discover"] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getPrefs().then((p) => setPrefs(p.discover)).catch(() => {});
  }, [router]);

  async function commit(next: Prefs["discover"]) {
    setPrefs(next);
    try {
      await api.updatePrefs("discover", next);
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch {}
  }

  if (!prefs) return (
    <SettingsChrome title="Discover preferences">
      <div className="text-white/50 text-center py-8">loading…</div>
    </SettingsChrome>
  );

  return (
    <SettingsChrome title="Discover preferences">
      <Saved show={saved} />

      <SectionCard title="Age range">
        <div className="p-5">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs text-white/50 font-bold">age</span>
            <span className="text-lg font-black">{prefs.age_min} – {prefs.age_max}</span>
          </div>
          <div className="flex gap-3">
            <input
              type="number" min={18} max={prefs.age_max} value={prefs.age_min}
              onChange={(e) => setPrefs({ ...prefs, age_min: Math.max(18, Math.min(parseInt(e.target.value) || 18, prefs.age_max)) })}
              onBlur={() => commit(prefs)}
              className="glass rounded-xl px-3 py-2 w-full text-center outline-none"
            />
            <input
              type="number" min={prefs.age_min} max={99} value={prefs.age_max}
              onChange={(e) => setPrefs({ ...prefs, age_max: Math.max(prefs.age_min, Math.min(parseInt(e.target.value) || 99, 99)) })}
              onBlur={() => commit(prefs)}
              className="glass rounded-xl px-3 py-2 w-full text-center outline-none"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Interested in">
        <div className="p-3 flex gap-2 flex-wrap">
          {(["any", "female", "male", "non_binary"] as const).map((g) => (
            <button
              key={g}
              onClick={() => commit({ ...prefs, gender: g })}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                prefs.gender === g
                  ? "bg-pink-500/30 border-pink-300/60 text-white"
                  : "glass border-white/10 text-white/70"
              }`}
            >
              {g === "any" ? "Everyone" : g === "non_binary" ? "Non-binary" : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Distance">
        <div className="p-5">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs text-white/50 font-bold">max distance</span>
            <span className="text-lg font-black">{prefs.max_distance_km} km</span>
          </div>
          <input
            type="range"
            min={1} max={500} step={1} value={prefs.max_distance_km}
            onChange={(e) => setPrefs({ ...prefs, max_distance_km: parseInt(e.target.value) })}
            onMouseUp={() => commit(prefs)}
            onTouchEnd={() => commit(prefs)}
            className="w-full accent-pink-400"
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-1">
            <span>1 km</span><span>500 km</span>
          </div>
        </div>
      </SectionCard>

      <p className="text-xs text-white/40 text-center mt-4 px-4">
        These filters apply to who shows up in Discover. You can change them any time.
      </p>
    </SettingsChrome>
  );
}
