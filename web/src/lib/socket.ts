import { io, Socket } from "socket.io-client";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://backend-production-61ee6.up.railway.app";

let cached: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (cached && cached.connected) return cached;
  const token = localStorage.getItem("loveloop_token");
  if (!token) return null;
  if (cached) { try { cached.disconnect(); } catch {} }
  cached = io(BASE, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return cached;
}

export function disconnectSocket() {
  if (cached) { try { cached.disconnect(); } catch {} cached = null; }
}
