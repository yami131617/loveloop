"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getSocket } from "@/lib/socket";
import { VideoCall, IncomingCallModal } from "./VideoCall";

type Incoming = { fromUserId: string; fromName: string | null; matchId: string | null };
type Active = { role: "caller" | "callee"; peerId: string; peerName: string; peerAvatar?: string | null };

type Ctx = {
  startCall: (peerId: string, peerName: string, peerAvatar?: string | null, matchId?: string) => void;
};

const CallContext = createContext<Ctx | null>(null);

export function useCall() {
  const c = useContext(CallContext);
  if (!c) throw new Error("useCall must be used inside <CallProvider>");
  return c;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    const onIncoming = (p: Incoming) => {
      if (active) {
        // Already on a call → auto-decline
        sock.emit("call:decline", { toUserId: p.fromUserId });
        return;
      }
      setIncoming(p);
    };
    const onDeclined = () => {
      // Caller side: peer declined → dismiss active
      setActive(null);
    };
    sock.on("call:incoming", onIncoming);
    sock.on("call:declined", onDeclined);
    return () => {
      sock.off("call:incoming", onIncoming);
      sock.off("call:declined", onDeclined);
    };
  }, [active]);

  const startCall = useCallback((peerId: string, peerName: string, peerAvatar?: string | null, matchId?: string) => {
    const sock = getSocket();
    if (!sock) return;
    sock.emit("call:invite", { toUserId: peerId, fromName: "LoveLoop user", matchId: matchId || null });
    setActive({ role: "caller", peerId, peerName, peerAvatar });
  }, []);

  function acceptIncoming() {
    if (!incoming) return;
    const sock = getSocket();
    if (sock) sock.emit("call:accept", { toUserId: incoming.fromUserId });
    setActive({
      role: "callee",
      peerId: incoming.fromUserId,
      peerName: incoming.fromName || "Someone",
    });
    setIncoming(null);
  }

  function declineIncoming() {
    if (!incoming) return;
    const sock = getSocket();
    if (sock) sock.emit("call:decline", { toUserId: incoming.fromUserId });
    setIncoming(null);
  }

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      {incoming && !active && (
        <IncomingCallModal
          fromName={incoming.fromName || "Someone"}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}
      {active && (
        <VideoCall
          role={active.role}
          peerId={active.peerId}
          peerName={active.peerName}
          peerAvatar={active.peerAvatar}
          onEnd={() => setActive(null)}
        />
      )}
    </CallContext.Provider>
  );
}
