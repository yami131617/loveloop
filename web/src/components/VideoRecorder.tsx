"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Circle, Square, RefreshCw, Check, X } from "lucide-react";

type Props = {
  onRecorded: (file: File) => void;
  onCancel: () => void;
  maxSeconds?: number;
};

export function VideoRecorder({ onRecorded, onCancel, maxSeconds = 30 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopAllTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  async function startCamera() {
    try {
      setError(null);
      stopAllTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "camera access denied");
    }
  }

  function stopAllTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRec() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };
    rec.start(100);
    setRecording(true);
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= maxSeconds) stopRec();
        return next;
      });
    }, 1000);
  }

  function stopRec() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }

  function useThis() {
    if (!recordedBlob) return;
    const f = new File([recordedBlob], `clip-${Date.now()}.webm`, { type: recordedBlob.type });
    stopAllTracks();
    onRecorded(f);
  }

  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        {recordedUrl ? (
          <video
            ref={previewRef}
            src={recordedUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
            autoPlay
            loop
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={() => { stopAllTracks(); onCancel(); }} className="glass w-10 h-10 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          {!recordedUrl && (
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="glass w-10 h-10 rounded-full flex items-center justify-center"
              aria-label="flip camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Recording timer */}
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-rose-500/80 px-3 py-1 rounded-full text-sm font-bold backdrop-blur"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            REC · {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </motion.div>
        )}

        {/* Progress bar */}
        {recording && (
          <div className="absolute bottom-32 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-400 to-fuchsia-500"
              style={{ width: `${(elapsed / maxSeconds) * 100}%` }}
            />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="glass rounded-2xl p-6 text-center max-w-xs">
              <p className="text-rose-300 mb-4">{error}</p>
              <button onClick={startCamera} className="btn-gradient-pink px-5 py-2 rounded-full text-sm font-bold">
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="py-6 px-6 flex items-center justify-center gap-8 bg-black">
        {recordedUrl ? (
          <>
            <button onClick={retake} className="flex flex-col items-center gap-1 text-white/80">
              <div className="w-14 h-14 glass rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs">Retake</span>
            </button>
            <button onClick={useThis} className="flex flex-col items-center gap-1 text-white">
              <div className="w-16 h-16 btn-gradient-pink rounded-full flex items-center justify-center shadow-xl">
                <Check className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold">Use this</span>
            </button>
          </>
        ) : (
          <button
            onClick={recording ? stopRec : startRec}
            disabled={!!error}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
          >
            {recording ? (
              <Square className="w-8 h-8 text-rose-500 fill-rose-500" />
            ) : (
              <Circle className="w-16 h-16 text-rose-500 fill-rose-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
