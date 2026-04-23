"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { api, hasToken, type User as UserT } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserT | null>(null);
  const [interestsList, setInterestsList] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    Promise.all([
      api.me().then((r) => {
        setUser(r.user);
        setDisplayName(r.user.display_name ?? "");
        setBio(r.user.bio ?? "");
        setAge(r.user.age ? String(r.user.age) : "");
        setGender(r.user.gender ?? "");
        if (r.user.interests) setPicked(r.user.interests);
      }),
      api.getInterests().then((r) => setInterestsList(r.interests)),
    ]).catch(() => router.replace("/"));
  }, [router]);

  function togglePick(tag: string) {
    setPicked((p) => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag]);
  }

  async function save() {
    setSaving(true); setErr(null); setSaved(false);
    try {
      await api.updateProfile({
        display_name: displayName || undefined,
        bio: bio || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        interests: picked,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center text-white/50">loading…</div>;

  return (
    <div className="relative min-h-screen pb-20 max-w-md mx-auto px-6 pt-10">
      <header className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="glass w-10 h-10 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black">Edit profile</h1>
      </header>

      <div className="flex flex-col gap-4">
        <Field label="Display name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="how friends know you"
            className="bg-transparent outline-none w-full text-white placeholder:text-white/30" />
        </Field>

        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300}
            placeholder="your vibe in a few words ✨"
            className="bg-transparent outline-none w-full text-white placeholder:text-white/30 resize-none" />
          <div className="text-[10px] text-white/30 text-right">{bio.length}/300</div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" min="18" max="99" value={age} onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
              className="bg-transparent outline-none w-full text-white placeholder:text-white/30" />
          </Field>
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value)}
              className="bg-transparent outline-none w-full text-white appearance-none">
              <option value="" className="bg-[#1a0e2e]">—</option>
              <option value="female" className="bg-[#1a0e2e]">Female</option>
              <option value="male" className="bg-[#1a0e2e]">Male</option>
              <option value="non_binary" className="bg-[#1a0e2e]">Non-binary</option>
              <option value="other" className="bg-[#1a0e2e]">Other</option>
            </select>
          </Field>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 px-1">Interests (pick up to 10)</div>
          <div className="flex flex-wrap gap-2">
            {interestsList.map((tag) => {
              const on = picked.includes(tag);
              return (
                <button key={tag} onClick={() => togglePick(tag)}
                  className={`text-sm px-3 py-1.5 rounded-full font-semibold border transition ${
                    on ? "bg-pink-500/30 border-pink-300/60 text-white"
                       : "glass border-white/10 text-white/70 hover:bg-white/10"
                  }`}>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {err && <p className="text-rose-400 text-sm text-center">{err}</p>}

        <button onClick={save} disabled={saving}
          className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-4">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="glass rounded-2xl px-5 py-3 block focus-within:ring-2 focus-within:ring-pink-400/60 transition">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
      {children}
    </label>
  );
}
