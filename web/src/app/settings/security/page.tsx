"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { api, hasToken, clearAuth } from "@/lib/api";
import { SettingsChrome, SectionCard } from "@/components/SettingsChrome";

export default function SecurityPage() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [neu, setNeu] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!hasToken()) router.replace("/");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (neu.length < 8) { setMsg({ ok: false, text: "password must be at least 8 chars" }); return; }
    if (neu !== confirm) { setMsg({ ok: false, text: "new passwords don't match" }); return; }
    setBusy(true);
    try {
      await api.changePassword(cur, neu);
      setMsg({ ok: true, text: "password changed ✨" });
      setCur(""); setNeu(""); setConfirm("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "failed" });
    } finally {
      setBusy(false);
    }
  }

  function logoutEverywhere() {
    if (!confirm) { /* no-op */ }
    // For now, just clear local token; in future, backend can invalidate all sessions
    clearAuth();
    router.replace("/");
  }

  return (
    <SettingsChrome title="Password & security">
      <SectionCard title="Change password">
        <form onSubmit={submit} className="p-4 flex flex-col gap-3">
          <Field label="Current password" type="password" value={cur} onChange={setCur} />
          <Field label="New password" type="password" value={neu} onChange={setNeu} />
          <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
          {msg && (
            <p className={`text-sm text-center ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
              {msg.ok && <Check className="w-4 h-4 inline mr-1" />}
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !cur || !neu}
            className="btn-gradient-pink w-full py-3 rounded-full font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Sessions">
        <button
          onClick={logoutEverywhere}
          className="w-full px-4 py-3.5 text-left text-rose-300 hover:bg-rose-500/10 transition font-semibold text-sm"
        >
          Log out from this device
        </button>
      </SectionCard>

      <p className="text-xs text-white/40 text-center mt-6 px-4">
        We hash passwords with bcrypt. We never store plaintext.
      </p>
    </SettingsChrome>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="glass rounded-2xl px-4 py-2.5 block focus-within:ring-2 focus-within:ring-pink-400/60 transition">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none w-full text-white"
      />
    </label>
  );
}
