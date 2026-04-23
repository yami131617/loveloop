import type { NextConfig } from "next";

// COOP/COEP headers are required to unlock SharedArrayBuffer for ffmpeg.wasm on the /upload page.
// COEP: credentialless lets cross-origin <img>/<video> still load (vs require-corp which would
// need every resource to send a CORP header).
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/upload",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
