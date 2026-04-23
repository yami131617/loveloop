"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, RefreshCw } from "lucide-react";
import { getSocket } from "@/lib/socket";

type CallRole = "caller" | "callee";
type CallState = "ringing" | "connecting" | "connected" | "ended";

type Props = {
  role: CallRole;
  peerId: string;        // user id of the other party
  peerName: string;
  peerAvatar?: string | null;
  onEnd: () => void;
};

// ICE servers: STUN for direct P2P, TURN relay for strict NATs (~15% of networks need this).
// Defaults: Google STUN (free, global) + Metered.ca free TURN (limited bandwidth but works for demos).
// For production, set NEXT_PUBLIC_TURN_URL/USERNAME/CREDENTIAL to your own Twilio/Xirsys/coturn.
const TURN_URL = process.env.NEXT_PUBLIC_TURN_URL || "turn:global.relay.metered.ca:80";
const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "ef82f36dfef55f9df4c3d69e";
const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "VqPvYfZoFpWIhgGh";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
  { urls: TURN_URL.replace(":80", ":443"), username: TURN_USERNAME, credential: TURN_CREDENTIAL },
  { urls: TURN_URL.replace("turn:", "turns:").replace(":80", ":443"), username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];

export function VideoCall({ role, peerId, peerName, peerAvatar, onEnd }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  const [state, setState] = useState<CallState>(role === "caller" ? "ringing" : "connecting");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const sock = getSocket();
    if (!sock) { onEnd(); return; }
    const s = sock; // narrow for inner closures

    let stopped = false;
    let tickId: number | null = null;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true,
        });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
            remoteVideoRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            s.emit("call:ice", { toUserId: peerId, candidate: e.candidate.toJSON() });
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return;
          if (pc.connectionState === "connected") {
            setState("connected");
            if (tickId === null) {
              tickId = window.setInterval(() => setElapsed((s) => s + 1), 1000);
            }
          } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
            end(false);
          }
        };

        if (role === "caller") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit("call:offer", { toUserId: peerId, sdp: offer });
        }
      } catch (e) {
        console.error("[call] init failed", e);
        end(false);
      }
    }

    init();

    // Remote SDP (answer if caller, offer if callee)
    const onOffer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (fromUserId !== peerId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(sdp);
        remoteDescSetRef.current = true;
        // Flush queued ICE
        for (const c of pendingIceRef.current) {
          try { await pcRef.current.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current = [];
        if (role === "callee") {
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          s.emit("call:answer", { toUserId: peerId, sdp: ans });
        }
      } catch (e) { console.error("[call] onOffer", e); }
    };

    const onAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (fromUserId !== peerId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(sdp);
        remoteDescSetRef.current = true;
        for (const c of pendingIceRef.current) {
          try { await pcRef.current.addIceCandidate(c); } catch {}
        }
        pendingIceRef.current = [];
        setState("connecting");
      } catch (e) { console.error("[call] onAnswer", e); }
    };

    const onIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      if (fromUserId !== peerId || !pcRef.current) return;
      try {
        if (!remoteDescSetRef.current) {
          pendingIceRef.current.push(candidate);
        } else {
          await pcRef.current.addIceCandidate(candidate);
        }
      } catch (e) { console.error("[call] onIce", e); }
    };

    const onEnded = ({ fromUserId }: { fromUserId: string }) => {
      if (fromUserId !== peerId) return;
      end(false);
    };

    sock.on("call:offer", onOffer);
    sock.on("call:answer", onAnswer);
    sock.on("call:ice", onIce);
    sock.on("call:ended", onEnded);

    return () => {
      stopped = true;
      sock.off("call:offer", onOffer);
      sock.off("call:answer", onAnswer);
      sock.off("call:ice", onIce);
      sock.off("call:ended", onEnded);
      if (tickId !== null) window.clearInterval(tickId);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, peerId, facing]);

  function cleanup() {
    if (pcRef.current) { try { pcRef.current.close(); } catch {}; pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }

  function end(notify = true) {
    if (notify) {
      const sock = getSocket();
      if (sock) sock.emit("call:end", { toUserId: peerId });
    }
    setState("ended");
    cleanup();
    onEnd();
  }

  function toggleMute() {
    const on = !muted;
    setMuted(on);
    localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !on);
  }

  function toggleCam() {
    const off = !camOff;
    setCamOff(off);
    localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !off);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex flex-col"
    >
      {/* Remote video fills screen */}
      <div className="absolute inset-0">
        <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline autoPlay />
        {state !== "connected" && (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-black flex items-center justify-center">
            <div className="text-center">
              {peerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={peerAvatar} alt={peerName} className="w-28 h-28 rounded-full object-cover mx-auto mb-5 ring-4 ring-white/20" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-5xl font-black mx-auto mb-5 ring-4 ring-white/20">
                  {peerName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <h2 className="text-2xl font-black mb-2">{peerName}</h2>
              <p className="text-white/70 text-sm">
                {state === "ringing" ? "ringing…" : state === "connecting" ? "connecting…" : "call ended"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local PiP (mirror for front cam) */}
      <div className="absolute top-6 right-4 w-24 h-36 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 z-10">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          playsInline
          muted
          autoPlay
        />
        {camOff && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-white/70" />
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="relative px-6 pt-8 flex items-center justify-between z-10">
        <div className="glass rounded-full px-3 py-1 text-xs font-bold">
          {state === "connected" ? fmtTime(elapsed) : state}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Controls */}
      <div className="relative z-10 pb-10 px-8 flex items-center justify-center gap-5">
        <CtrlBtn onClick={toggleMute} label="mute" active={muted} activeBg="bg-white text-black">
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </CtrlBtn>
        <CtrlBtn onClick={toggleCam} label="camera" active={camOff} activeBg="bg-white text-black">
          {camOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
        </CtrlBtn>
        <CtrlBtn onClick={() => setFacing(f => f === "user" ? "environment" : "user")} label="flip">
          <RefreshCw className="w-6 h-6" />
        </CtrlBtn>
        <button
          onClick={() => end(true)}
          className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-xl"
          aria-label="end call"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

function CtrlBtn({ onClick, children, active, activeBg = "bg-white text-black" }: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  active?: boolean;
  activeBg?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-14 h-14 rounded-full glass flex items-center justify-center transition ${
        active ? activeBg : "hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Incoming call modal (separate component mounted app-wide if we want global). Exported here for reuse.
export function IncomingCallModal({
  fromName, fromAvatar, onAccept, onDecline,
}: {
  fromName: string;
  fromAvatar?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] glass rounded-3xl p-4 shadow-2xl flex items-center gap-3 max-w-sm w-[90%]"
      >
        {fromAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fromAvatar} alt={fromName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center font-bold">
            {fromName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="font-bold text-sm">{fromName}</div>
          <div className="text-xs text-white/60">incoming video call…</div>
        </div>
        <button onClick={onDecline} className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center" aria-label="decline">
          <PhoneOff className="w-4 h-4" />
        </button>
        <button onClick={onAccept} className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center" aria-label="accept">
          <Phone className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
