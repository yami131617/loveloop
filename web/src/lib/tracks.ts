// Preset royalty-free background tracks for the video editor.
// Using small-size placeholder URLs — in production swap with your own licensed tracks or Cloudinary hosted.
// These are all < 15 sec loops.

export type Track = {
  id: string;
  name: string;
  mood: string;
  color: string;
  url: string;       // direct audio URL (streaming mp3/ogg)
};

// Using Free Music Archive / Pixabay-style free loops. For demo we reference small royalty-free tracks from Cloudinary demo account + a few public-domain fallbacks.
// If these 404 in production, replace with your own uploaded tracks.
export const TRACKS: Track[] = [
  {
    id: "lofi",
    name: "Lofi Drift",
    mood: "chill",
    color: "from-indigo-400 to-purple-500",
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "pop",
    name: "Sunset Pop",
    mood: "upbeat",
    color: "from-pink-400 to-rose-500",
    url: "https://cdn.pixabay.com/audio/2022/10/25/audio_3fb77ffba8.mp3",
  },
  {
    id: "house",
    name: "Neon Pulse",
    mood: "dance",
    color: "from-cyan-400 to-blue-500",
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_347ab7afcc.mp3",
  },
  {
    id: "acoustic",
    name: "Golden Hour",
    mood: "soft",
    color: "from-amber-400 to-orange-500",
    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8e3a84f6d.mp3",
  },
  {
    id: "cinematic",
    name: "Starlit",
    mood: "dreamy",
    color: "from-fuchsia-400 to-violet-600",
    url: "https://cdn.pixabay.com/audio/2022/01/18/audio_d1718ab41b.mp3",
  },
  {
    id: "none",
    name: "Original audio",
    mood: "no overlay",
    color: "from-zinc-500 to-zinc-700",
    url: "",
  },
];
