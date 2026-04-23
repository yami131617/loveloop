import { io, Socket } from "socket.io-client";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://backend-production-61ee6.up.railway.app";

let cached: Socket | null = null;
let cachedForToken: string | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("loveloop_token");
  if (!token) return null;

  // Reuse the same socket as long as the user (token) hasn't changed.
  // socket.io-client handles its own connect/reconnect internally, so we don't
  // want to tear it down just because `connected` is momentarily false.
  if (cached && cachedForToken === token) return cached;

  if (cached) { try { cached.disconnect(); } catch {} }
  cachedForToken = token;
  cached = io(BASE, {
    auth: { token },
    // Polling-first so CORS + dev servers don't drop the initial handshake;
    // socket.io auto-upgrades to websocket when available.
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionDelay: 500,
  });
  return cached;
}

export function disconnectSocket() {
  if (cached) { try { cached.disconnect(); } catch {} cached = null; cachedForToken = null; }
}
