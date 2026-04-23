"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Check, Heart, Upload as UploadIcon, ArrowRight } from "lucide-react";
import { api, hasToken } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasToken()) { router.replace("/"); return; }
    api.getInterests().then((r) => setPool(r.interests)).catch(() => {});
  }, [router]);

  function togglePick(tag: string) {
    setInterests((p) => p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag].slice(0, 10));
  }

  async function saveStep1() {
    if (interests.length < 3) return;
    setStep(2);
  }

  async function saveAll() {
    setSaving(true);
    try {
      await api.updateProfile({
        bio: bio || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        interests,
      });
      setStep(3);
      setTimeout(() => router.replace("/feed"), 1500);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 pt-12 pb-10 max-w-md mx-auto">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 rounded-full transition-all ${
            s <= step ? "bg-pink-400 w-12" : "bg-white/10 w-6"
          }`} />
        ))}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
            <span className="text-xs font-bold tracking-[0.3em] text-pink-300">STEP 1 OF 3</span>
          </div>
          <h1 className="text-3xl font-black mb-2">What&apos;s your <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">vibe?</span></h1>
          <p className="text-sm text-white/60 mb-6">Pick 3–10 interests — we&apos;ll match you with people who share them.</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {pool.map((tag) => {
              const on = interests.includes(tag);
              return (
                <button key={tag} onClick={() => togglePick(tag)}
                  className={`text-sm px-4 py-2 rounded-full font-semibold border transition ${
                    on ? "bg-pink-500/30 border-pink-300/60 text-white"
                       : "glass border-white/10 text-white/70 hover:bg-white/10"
                  }`}>
                  {tag}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-white/40 mb-4 text-center">{interests.length}/10 picked · min 3</p>

          <button
            onClick={saveStep1}
            disabled={interests.length < 3}
            className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <span className="text-xs font-bold tracking-[0.3em] text-pink-300">STEP 2 OF 3</span>
          </div>
          <h1 className="text-3xl font-black mb-2">Tell us a bit <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">about you</span></h1>
          <p className="text-sm text-white/60 mb-6">Optional — helps others get to know you.</p>

          <label className="glass rounded-2xl px-5 py-3 block mb-3">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Bio</div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="your vibe in a few words ✨"
              className="bg-transparent outline-none w-full text-white placeholder:text-white/30 resize-none"
            />
            <div className="text-[10px] text-white/30 text-right">{bio.length}/200</div>
          </label>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="glass rounded-2xl px-4 py-2.5 block">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Age</div>
              <input
                type="number" min="18" max="99" value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="18+"
                className="bg-transparent outline-none w-full text-white placeholder:text-white/30"
              />
            </label>
            <label className="glass rounded-2xl px-4 py-2.5 block">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Gender</div>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="bg-transparent outline-none w-full text-white appearance-none">
                <option value="" className="bg-[#1a0e2e]">—</option>
                <option value="female" className="bg-[#1a0e2e]">Female</option>
                <option value="male" className="bg-[#1a0e2e]">Male</option>
                <option value="non_binary" className="bg-[#1a0e2e]">Non-binary</option>
                <option value="other" className="bg-[#1a0e2e]">Other</option>
              </select>
            </label>
          </div>

          <button
            onClick={saveAll}
            disabled={saving}
            className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? "Saving…" : <><Check className="w-4 h-4" /> Finish</>}
          </button>
          <button
            onClick={() => router.replace("/feed")}
            className="mt-3 w-full text-center text-sm text-white/50 hover:text-white/80"
          >
            Skip for now
          </button>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full text-center py-16">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-24 h-24 btn-gradient-pink rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
          >
            <Heart className="w-12 h-12 text-white fill-white" />
          </motion.div>
          <h1 className="text-4xl font-black mb-2">
            You&apos;re in the <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">loop ✨</span>
          </h1>
          <p className="text-white/60">taking you to your feed…</p>
        </motion.div>
      )}

      {step === 1 && (
        <button
          onClick={() => router.replace("/feed")}
          className="mt-6 text-sm text-white/40 hover:text-white/70"
        >
          Skip & go to feed
        </button>
      )}
    </div>
  );
}
