"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Register the service worker + show an "install" prompt when the browser is ready.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PWARegister() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only register the service worker on production deployments.
    // In dev (localhost) a stale SW can cache broken Next.js hot-update payloads
    // and interfere with HMR + API fetches.
    const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if ("serviceWorker" in navigator) {
      if (isDev) {
        // Unregister any SW that was left over from a previous session.
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        }).catch(() => {});
      } else {
        navigator.serviceWorker.register("/sw.js").then((reg) => {
          // Auto-reload the page the first time a brand-new SW takes over, so
          // users get the new deployment on plain F5 instead of having to Ctrl+F5.
          let refreshing = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            location.reload();
          });
          // Poll for updates every 60 seconds while the tab is open
          setInterval(() => reg.update().catch(() => {}), 60_000);
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                // New version waiting — activate it now
                nw.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        }).catch((e) => {
          console.warn("[pwa] sw register failed", e);
        });
      }
    }
    // Capture install prompt
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("loveloop_install_dismissed") === "1") setDismissed(true);
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[90vw] w-[360px]">
      <div className="w-10 h-10 rounded-xl btn-gradient-pink flex items-center justify-center">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">Install LoveLoop</div>
        <div className="text-[11px] text-white/60">add to home screen · works offline</div>
      </div>
      <button
        onClick={async () => {
          try {
            await installEvent.prompt();
            await installEvent.userChoice;
          } catch {}
          setInstallEvent(null);
        }}
        className="btn-gradient-pink text-xs font-bold px-3 py-1.5 rounded-full"
      >
        Install
      </button>
      <button
        onClick={() => { localStorage.setItem("loveloop_install_dismissed", "1"); setDismissed(true); }}
        className="text-white/50 hover:text-white"
        aria-label="dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
