"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Scissors, Check, Loader2, Sparkles, Play } from "lucide-react";
import { MusicPicker } from "./MusicPicker";
import type { MusicTrack } from "@/lib/api";

// Legacy Track type preserved for ffmpeg.wasm code; maps cleanly from MusicTrack.
type Track = { id: string; name: string; url: string; color: string };

type Props = {
  file: File;
  onDone: (edited: File) => void;
  onCancel: () => void;
};

type FFmpegMod = {
  FFmpeg: new () => {
    loaded: boolean;
    load: (opts?: { coreURL?: string; wasmURL?: string }) => Promise<void>;
    writeFile: (name: string, data: Uint8Array) => Promise<void>;
    readFile: (name: string) => Promise<Uint8Array>;
    exec: (args: string[]) => Promise<number>;
    on: (event: "progress", cb: (e: { progress: number; time: number }) => void) => void;
  };
};

let ffmpegInstance: InstanceType<FFmpegMod["FFmpeg"]> | null = null;

async function getFFmpeg() {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
  const { FFmpeg } = (await import("@ffmpeg/ffmpeg")) as unknown as FFmpegMod;
  ffmpegInstance = new FFmpeg();
  const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpegInstance.load({
    coreURL: `${base}/ffmpeg-core.js`,
    wasmURL: `${base}/ffmpeg-core.wasm`,
  });
  return ffmpegInstance;
}

export function VideoEditor({ file, onDone, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  // track === null means "original audio only, no music overlay"
  const [track, setTrack] = useState<Track | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [volume, setVolume] = useState(0.6); // music vs original audio mix
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const onMeta = () => {
      const d = Math.max(1, Math.min(60, v.duration || 10));
      setDuration(d);
      setTrimEnd(d);
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [previewUrl]);

  // Live preview: overlay audio in sync
  useEffect(() => {
    if (track?.url && audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.volume = volume;
      audioRef.current.load();
    }
  }, [track, volume]);

  function onTimeUpdate() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    // loop preview within trim range
    if (v.currentTime < trimStart) v.currentTime = trimStart;
    if (v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
      v.play().catch(() => {});
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
    }
  }

  async function process() {
    setProcessing(true);
    setErr(null);
    setProgress(0);
    try {
      const ff = await getFFmpeg();
      ff.on("progress", (e) => setProgress(Math.min(0.99, e.progress || 0)));

      // Write input video
      const buf = new Uint8Array(await file.arrayBuffer());
      await ff.writeFile("in.mp4", buf);

      const start = trimStart.toFixed(3);
      const dur = (trimEnd - trimStart).toFixed(3);

      if (track?.url) {
        // Fetch music (streaming mp3)
        const r = await fetch(track.url);
        if (!r.ok) throw new Error("music fetch failed");
        const musicBuf = new Uint8Array(await r.arrayBuffer());
        await ff.writeFile("music.mp3", musicBuf);

        // Trim video + mix original audio with music (ducked)
        // amix with weights: original at (1 - volume), music at volume
        const origW = (1 - volume).toFixed(2);
        const musW = volume.toFixed(2);
        await ff.exec([
          "-ss", start,
          "-i", "in.mp4",
          "-i", "music.mp3",
          "-t", dur,
          "-filter_complex",
          `[0:a]volume=${origW}[a0];[1:a]volume=${musW},aloop=loop=-1:size=2e+09[a1];[a0][a1]amix=inputs=2:duration=shortest:dropout_transition=0[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
          "-c:v", "copy",
          "-c:a", "aac",
          "-shortest",
          "-y", "out.mp4",
        ]);
      } else {
        // Trim only
        await ff.exec([
          "-ss", start,
          "-i", "in.mp4",
          "-t", dur,
          "-c", "copy",
          "-y", "out.mp4",
        ]);
      }

      const data = await ff.readFile("out.mp4");
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: "video/mp4" });
      const editedFile = new File([blob], `edited-${Date.now()}.mp4`, { type: "video/mp4" });
      setProgress(1);
      onDone(editedFile);
    } catch (e) {
      console.error(e);
      setErr(e instanceof Error ? e.message : "processing failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} className="glass w-10 h-10 rounded-full flex items-center justify-center" disabled={processing}>
          <X className="w-5 h-5" />
        </button>
        <div className="text-sm font-bold">Studio</div>
        <button
          onClick={process}
          disabled={processing}
          className="btn-gradient-pink px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 disabled:opacity-60"
        >
          {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {Math.floor(progress * 100)}%</> : <><Sparkles className="w-4 h-4" /> Done</>}
        </button>
      </header>

      {/* On desktop: 2-column (video left, controls right). On mobile: stacked (video top, controls bottom).
          Controls are scrollable on mobile so music picker + trim always reachable without pushing off-screen. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-black overflow-hidden">
        {/* Video preview */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black lg:border-r lg:border-white/5">
          <video
            ref={videoRef}
            src={previewUrl}
            className="max-h-full max-w-full"
            playsInline
            autoPlay
            loop
            muted={!!track?.url}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => { if (track?.url && audioRef.current) audioRef.current.play().catch(() => {}); }}
            onPause={() => { if (audioRef.current) audioRef.current.pause(); }}
          />
          <audio ref={audioRef} loop />
        </div>

        {/* Controls panel — scrollable on its own, fixed width on desktop so music picker is ALWAYS visible */}
        <div className="lg:w-96 xl:w-[28rem] shrink-0 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          {/* Trim */}
          <section>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-white/70">
              <Scissors className="w-3.5 h-3.5" /> TRIM
              <span className="ml-auto font-mono text-[11px] text-white/80">
                {fmt(trimStart)} → {fmt(trimEnd)} <span className="text-white/40">({fmt(trimEnd - trimStart)})</span>
              </span>
            </div>
            {duration > 0 && (
              <DualRange
                min={0}
                max={duration}
                start={trimStart}
                end={trimEnd}
                onChange={(s, e) => { setTrimStart(s); setTrimEnd(e); }}
              />
            )}
          </section>

          {/* Music picker trigger — opens TikTok-style full library picker */}
          <section>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-white/70">
              <Music2 className="w-3.5 h-3.5" /> SOUNDTRACK
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full glass rounded-2xl p-3 flex items-center gap-3 text-left hover:bg-white/10 transition border border-white/10"
            >
              {track ? (
                <>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.color} flex items-center justify-center shadow-lg shrink-0`}>
                    <Music2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{track.name}</div>
                    <div className="text-[11px] text-white/50">tap to change · browse 28+ tracks</div>
                  </div>
                  <span className="text-[11px] font-bold text-pink-300">Change →</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shrink-0">
                    <Play className="w-5 h-5 fill-white translate-x-[1px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">Pick a sound</div>
                    <div className="text-[11px] text-white/50">trending · categories · search</div>
                  </div>
                  <span className="text-[11px] font-bold text-pink-300">Browse →</span>
                </>
              )}
            </button>

            {track && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1.5">
                  music vs original
                  <span className="ml-auto text-pink-300">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-pink-400"
                />
              </div>
            )}
          </section>

          {err && <p className="text-rose-400 text-xs text-center">{err}</p>}
        </div>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <MusicPicker
            value={track ? ({ id: track.id } as MusicTrack) : null}
            onClose={() => setPickerOpen(false)}
            onPick={(mt) => {
              if (mt) {
                setTrack({ id: mt.id, name: mt.title, url: mt.url, color: mt.cover_gradient });
              } else {
                setTrack(null);
              }
              setPickerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DualRange({
  min, max, start, end, onChange,
}: { min: number; max: number; start: number; end: number; onChange: (s: number, e: number) => void }) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="relative h-10">
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-white/10 rounded-full" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-full"
        style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
      />
      <input
        type="range"
        min={min} max={max} step={0.1}
        value={start}
        onChange={(e) => onChange(Math.min(parseFloat(e.target.value), end - 0.5), end)}
        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto dual-range"
      />
      <input
        type="range"
        min={min} max={max} step={0.1}
        value={end}
        onChange={(e) => onChange(start, Math.max(parseFloat(e.target.value), start + 0.5))}
        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto dual-range"
      />
      <style jsx>{`
        .dual-range { z-index: 2; height: 40px; }
        .dual-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #ff4c8a, #c084fc);
          cursor: pointer; border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          pointer-events: auto;
        }
        .dual-range::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, #ff4c8a, #c084fc);
          cursor: pointer; border: 2px solid white;
          pointer-events: auto;
        }
        .dual-range::-webkit-slider-runnable-track { background: transparent; }
        .dual-range::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const cs = Math.floor((s * 10) % 10);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}.${cs}`;
}
