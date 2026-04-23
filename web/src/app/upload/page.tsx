"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Video, Upload as UploadIcon, X, Sparkles, Circle, Wand2 } from "lucide-react";
import { api, hasToken } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";
import { useEffect } from "react";
import { VideoRecorder } from "@/components/VideoRecorder";
import { VideoEditor } from "@/components/VideoEditor";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasToken()) router.replace("/");
  }, [router]);

  function pickFile(f: File) {
    setErr(null);
    const isVideo = f.type.startsWith("video/");
    setKind(isVideo ? "video" : "image");
    if (f.size > 100 * 1024 * 1024) { setErr("file too big (max 100MB)"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", caption);
      fd.append("media_type", kind);
      const t = localStorage.getItem("loveloop_token");
      const r = await fetch(api.base + "/posts/upload", {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        body: fd,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      // Smart: on mobile go to own profile to see the new post; else feed
      const goTo = j.post?.id ? `/p/${j.post.id}` : "/feed";
      router.replace(goTo);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen pb-32 px-6 pt-8 max-w-md mx-auto lg:max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">
          Share a <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">vibe</span>
        </h1>
        {file && (
          <button onClick={() => { setFile(null); setPreview(null); }} className="glass w-10 h-10 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {!file ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <PickTile icon={<Camera className="w-6 h-6" />} label="Photo" sub="from library" gradient="from-pink-400 to-rose-500"
            onClick={() => { if (inputRef.current) { inputRef.current.accept = "image/*"; inputRef.current.click(); } }} />
          <PickTile icon={<Video className="w-6 h-6" />} label="Video" sub="from library" gradient="from-cyan-400 to-blue-500"
            onClick={() => { if (inputRef.current) { inputRef.current.accept = "video/*"; inputRef.current.click(); } }} />
          <button
            onClick={() => setRecording(true)}
            className="col-span-2 glass rounded-3xl p-5 flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Circle className="w-6 h-6 fill-white text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold">Record a clip</div>
              <div className="text-xs text-white/60">front or back camera · up to 30s · with audio</div>
            </div>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[4/5] rounded-3xl overflow-hidden glass mb-4"
        >
          {kind === "video" ? (
            <video src={preview!} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview!} alt="preview" className="w-full h-full object-cover" />
          )}
        </motion.div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
      />

      {file && (
        <>
          <label className="glass rounded-2xl px-5 py-4 block mb-4">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Caption</div>
            <textarea
              maxLength={500}
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="say something cute ✨"
              className="bg-transparent outline-none w-full text-white placeholder:text-white/30 resize-none"
            />
            <div className="text-[10px] text-white/30 text-right">{caption.length}/500</div>
          </label>

          {err && <p className="text-rose-400 text-sm text-center mb-3">{err}</p>}

          {kind === "video" && (
            <button
              onClick={() => setEditing(true)}
              className="glass w-full py-3 rounded-full font-bold text-white border border-pink-300/40 flex items-center justify-center gap-2 mb-3 hover:bg-pink-500/10 transition"
            >
              <Wand2 className="w-4 h-4 text-pink-300" /> Edit video (trim + music)
            </button>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="btn-gradient-pink w-full py-4 rounded-full font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <><UploadIcon className="w-4 h-4 animate-pulse" /> Uploading…</> : <><Sparkles className="w-4 h-4" /> Post it</>}
          </button>
        </>
      )}

      <BottomNav />

      {recording && (
        <VideoRecorder
          maxSeconds={30}
          onCancel={() => setRecording(false)}
          onRecorded={(f) => {
            setRecording(false);
            pickFile(f);
          }}
        />
      )}

      {editing && file && kind === "video" && (
        <VideoEditor
          file={file}
          onCancel={() => setEditing(false)}
          onDone={(edited) => {
            setEditing(false);
            pickFile(edited);
          }}
        />
      )}
    </div>
  );
}

function PickTile({ icon, label, sub, gradient, onClick }: { icon: React.ReactNode; label: string; sub?: string; gradient: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition"
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <span className="font-bold">{label}</span>
      {sub && <span className="text-[10px] text-white/50">{sub}</span>}
    </button>
  );
}
