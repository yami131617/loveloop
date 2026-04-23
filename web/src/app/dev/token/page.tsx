"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const t = sp.get("t");
    const next = sp.get("next") || "/feed";
    if (t) localStorage.setItem("loveloop_token", t);
    router.replace(next);
  }, [router, sp]);
  return <div className="p-8 text-white/60">setting token…</div>;
}

export default function DevTokenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/60">loading…</div>}>
      <Inner />
    </Suspense>
  );
}
