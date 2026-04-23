// Word Spark — speed word-association game
// Show a prompt word, player types an associated word within 5 seconds.
// Points: length of answer * speed bonus. Repeating the same word = 0.

export const WORD_PROMPTS: string[] = [
  "love", "summer", "rain", "beach", "music", "dance", "coffee",
  "night", "dream", "star", "fire", "flower", "ocean", "cloud",
  "cat", "dog", "pizza", "matcha", "sunset", "sparkle", "neon",
  "cozy", "wild", "chill", "hype", "glow", "moon", "sky",
  "vibe", "friend", "kiss", "road", "paper", "bubble", "pink",
  "blue", "gold", "rose", "honey", "lofi", "speed", "beat",
];

export function pickRandomPrompts(n: number): string[] {
  const shuffled = [...WORD_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Very simple "associated enough" check — compares by letter overlap + common synonyms.
// For MVP we accept anything non-empty, non-duplicate, min 2 chars. Scoring rewards speed.
export function scoreAnswer(prompt: string, answer: string, secondsLeft: number, maxSeconds: number): number {
  const clean = answer.trim().toLowerCase();
  if (clean.length < 2) return 0;
  if (clean === prompt.toLowerCase()) return 0;  // echoing the prompt = 0
  const speedBonus = Math.round((secondsLeft / maxSeconds) * 10);
  const lengthBonus = Math.min(10, clean.length);
  return 5 + speedBonus + lengthBonus;  // base 5 + up to 20 more
}
