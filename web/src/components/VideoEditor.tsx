"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Music2, Scissors, Check, Loader2, Sparkles } from "lucide-react";
import { TRACKS, type Track } from "@/lib/tracks";

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
  const [track, setTrack] = useState<Track>(TRACKS[0]);
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
    if (track.url && audioRef.current) {
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

      if (track.url) {
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

      <div className="relative flex-1 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          className="max-h-full max-w-full"
          playsInline
          autoPlay
          loop
          muted={!!track.url}  // mute original when overlay present (audio plays via <audio>)
          onTimeUpdate={onTimeUpdate}
          onPlay={() => { if (track.url && audioRef.current) audioRef.current.play().catch(() => {}); }}
          onPause={() => { if (audioRef.current) audioRef.current.pause(); }}
        />
        <audio ref={audioRef} loop />
      </div>

      {/* Trim */}
      <div className="px-6 py-3 bg-black">
        <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
          <Scissors className="w-3 h-3" /> trim
          <span className="ml-auto font-semibold text-white/80">
            {fmt(trimStart)} → {fmt(trimEnd)} ({fmt(trimEnd - trimStart)})
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
      </div>

      {/* Music picker */}
      <div className="px-6 pb-6 pt-2 bg-black">
        <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
          <Music2 className="w-3 h-3" /> soundtrack
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
          {TRACKS.map((t) => {
            const active = track.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTrack(t)}
                className={`shrink-0 rounded-2xl px-3 py-2 border text-left transition ${
                  active ? "bg-white/10 border-pink-300/60" : "glass border-white/10 hover:bg-white/5"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-1`}>
                  {active ? <Check className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
                </div>
                <div className="text-xs font-bold">{t.name}</div>
                <div className="text-[10px] text-white/50">{t.mood}</div>
              </button>
            );
          })}
        </div>
        {track.url && (
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">
              music vs original
              <span className="ml-auto">{Math.round(volume * 100)}%</span>
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
        {err && <p className="text-rose-400 text-xs text-center mt-3">{err}</p>}
      </div>
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
