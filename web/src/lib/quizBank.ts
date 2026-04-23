// "Vibe Check" quiz questions — getting-to-know each other, Gen Z vibes
export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIdx: number;
  category: "red_flag" | "taste" | "personality" | "fun";
};

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "Biggest ick on a first date?",
    options: ["On their phone", "Talks about ex", "Doesn't tip", "All of the above"],
    correctIdx: 3,
    category: "red_flag",
  },
  {
    id: "q2",
    prompt: "Perfect Saturday night?",
    options: ["House party", "Cozy movie in", "Concert/club", "Late-night snack run"],
    correctIdx: 1,
    category: "personality",
  },
  {
    id: "q3",
    prompt: "Top vibe playlist?",
    options: ["Lofi chill", "Pop hits", "Underground hip-hop", "K-pop"],
    correctIdx: 0,
    category: "taste",
  },
  {
    id: "q4",
    prompt: "Go-to emoji to flirt?",
    options: ["😏", "💕", "✨", "👀"],
    correctIdx: 2,
    category: "fun",
  },
  {
    id: "q5",
    prompt: "Texting pet peeve?",
    options: ["One-word replies", "Leaving you on read", "Double texting", "Dry responses"],
    correctIdx: 1,
    category: "red_flag",
  },
  {
    id: "q6",
    prompt: "Morning person or...?",
    options: ["Up at 6am", "Coffee then fine", "Noon is fine", "Nocturnal forever"],
    correctIdx: 2,
    category: "personality",
  },
  {
    id: "q7",
    prompt: "Favorite genre of content?",
    options: ["TikTok chaos", "YouTube essays", "Podcast girlies", "Reality TV drama"],
    correctIdx: 0,
    category: "taste",
  },
  {
    id: "q8",
    prompt: "Dream first-date vibe?",
    options: ["Sunset walk", "Arcade + tacos", "Cafe + bookstore", "Rooftop drinks"],
    correctIdx: 1,
    category: "fun",
  },
  {
    id: "q9",
    prompt: "Love language that hits hardest?",
    options: ["Words", "Acts of service", "Quality time", "Physical touch"],
    correctIdx: 2,
    category: "personality",
  },
  {
    id: "q10",
    prompt: "Biggest green flag?",
    options: ["Their pet loves them", "Respectful to waiters", "Remembers small things", "All of them"],
    correctIdx: 3,
    category: "personality",
  },
];
