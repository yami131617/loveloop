// Trivia Clash — general knowledge + pop culture, Gen Z flavor
// Different domain from Vibe Check (which is personality/compat)

export type TriviaQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIdx: number;
  category: "movies" | "music" | "science" | "geography" | "internet" | "history" | "pop";
};

export const TRIVIA: TriviaQuestion[] = [
  { id: "t1",  prompt: "Which app popularized 'For You Page' scrolling?",         options: ["Instagram Reels", "TikTok", "Snapchat", "YouTube Shorts"], correctIdx: 1, category: "internet" },
  { id: "t2",  prompt: "Capital of Vietnam?",                                      options: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hue"],             correctIdx: 1, category: "geography" },
  { id: "t3",  prompt: "Which artist released 'Espresso' in 2024?",                options: ["Taylor Swift", "Sabrina Carpenter", "Billie Eilish", "Olivia Rodrigo"], correctIdx: 1, category: "music" },
  { id: "t4",  prompt: "'Brainrot' means ___",                                     options: ["Coding all day", "Overconsuming short-form content", "Studying hard", "Sleeping too much"], correctIdx: 1, category: "internet" },
  { id: "t5",  prompt: "Largest planet in our solar system?",                      options: ["Saturn", "Jupiter", "Neptune", "Uranus"],                  correctIdx: 1, category: "science" },
  { id: "t6",  prompt: "Who directed 'Everything Everywhere All at Once'?",         options: ["Greta Gerwig", "Daniels", "Jordan Peele", "Denis Villeneuve"], correctIdx: 1, category: "movies" },
  { id: "t7",  prompt: "'Slay' originated in which community?",                    options: ["Tech bros", "Ballroom / LGBTQ+", "Gamers", "K-pop fandom"], correctIdx: 1, category: "internet" },
  { id: "t8",  prompt: "Which country invented ramen?",                            options: ["Japan", "China (claimed by Japan)", "Korea", "Thailand"],  correctIdx: 1, category: "pop" },
  { id: "t9",  prompt: "Year TikTok launched globally?",                            options: ["2014", "2016", "2018", "2020"],                           correctIdx: 2, category: "internet" },
  { id: "t10", prompt: "'It's giving ___' trend came from?",                        options: ["TikTok dance", "RuPaul's Drag Race", "K-drama", "Twitter"], correctIdx: 1, category: "internet" },
  { id: "t11", prompt: "How many seconds in a day?",                                options: ["3,600", "86,400", "1,440", "604,800"],                      correctIdx: 1, category: "science" },
  { id: "t12", prompt: "BTS stands for?",                                           options: ["Beyond the Stars", "Bangtan Sonyeondan", "Best Teen Squad", "Band That Sings"], correctIdx: 1, category: "music" },
  { id: "t13", prompt: "In chess, how does a knight move?",                         options: ["Diagonally", "L-shaped", "In a straight line", "One square at a time"], correctIdx: 1, category: "pop" },
  { id: "t14", prompt: "Which emoji is most used in 2024 globally?",                options: ["😂", "❤️", "🥺", "✨"],                                      correctIdx: 0, category: "internet" },
  { id: "t15", prompt: "Coldest continent?",                                        options: ["Arctic (not a continent)", "Antarctica", "Greenland (not a continent)", "Siberia (not a continent)"], correctIdx: 1, category: "geography" },
];

export function pickRandomTen(): TriviaQuestion[] {
  const shuffled = [...TRIVIA].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10);
}
