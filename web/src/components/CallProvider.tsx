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

const RING_TIMEOUT_MS = 30_000;

export function CallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [callStatus, setCallStatus] = useState<"ringing" | "answered" | null>(null);

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
    const onDeclined = () => setActive(null);
    const onAccepted = () => setCallStatus("answered");  // peer picked up
    const onEnded = () => setActive(null);
    sock.on("call:incoming", onIncoming);
    sock.on("call:declined", onDeclined);
    sock.on("call:accepted", onAccepted);
    sock.on("call:ended", onEnded);
    return () => {
      sock.off("call:incoming", onIncoming);
      sock.off("call:declined", onDeclined);
      sock.off("call:accepted", onAccepted);
      sock.off("call:ended", onEnded);
    };
  }, [active]);

  // Caller-side: auto-hangup if peer hasn't answered within RING_TIMEOUT_MS
  useEffect(() => {
    if (!active || active.role !== "caller" || callStatus === "answered") return;
    const t = window.setTimeout(() => {
      const sock = getSocket();
      if (sock) sock.emit("call:end", { toUserId: active.peerId });
      setActive(null);
    }, RING_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [active, callStatus]);

  // Callee-side: if user doesn't accept within RING_TIMEOUT_MS, auto-dismiss the prompt
  useEffect(() => {
    if (!incoming) return;
    const t = window.setTimeout(() => {
      const sock = getSocket();
      if (sock) sock.emit("call:decline", { toUserId: incoming.fromUserId });
      setIncoming(null);
    }, RING_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [incoming]);

  const startCall = useCallback((peerId: string, peerName: string, peerAvatar?: string | null, matchId?: string) => {
    const sock = getSocket();
    if (!sock) return;
    sock.emit("call:invite", { toUserId: peerId, fromName: "LoveLoop user", matchId: matchId || null });
    setActive({ role: "caller", peerId, peerName, peerAvatar });
    setCallStatus("ringing");
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
    setCallStatus("answered");
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
          onEnd={() => { setActive(null); setCallStatus(null); }}
        />
      )}
    </CallContext.Provider>
  );
}
