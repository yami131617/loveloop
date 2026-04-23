const BASE = process.env.NEXT_PUBLIC_API_BASE || "https://backend-production-61ee6.up.railway.app";

export type User = {
  id: string;
  email?: string;
  username: string;
  display_name: string | null;
  bio?: string | null;
  age?: number | null;
  gender?: string | null;
  avatar_url?: string | null;
  level?: number;
  total_xp?: number;
  coins_balance?: number;
  gems_balance?: number;
  interests?: string[];
};

export type Card = {
  id: string;
  username: string;
  display_name: string | null;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  score?: number;
};

export type Match = {
  id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  relationship_level: number;
  total_games_played: number;
  matched_at: string;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me?: boolean;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("loveloop_token");
}

async function req<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  const r = await fetch(BASE + path, {
    method,
    headers: h,
    body: body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await r.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!r.ok) {
    // Smart: auto-logout on token-expired/invalid (but not on /auth/* so login errors still surface)
    if (r.status === 401 && typeof window !== "undefined" && t && !path.startsWith("/auth/")) {
      localStorage.removeItem("loveloop_token");
      if (window.location.pathname !== "/") window.location.href = "/";
    }
    const err = (json && typeof json === "object" && "error" in json ? (json as { error: string }).error : `HTTP ${r.status}`) || `HTTP ${r.status}`;
    throw new Error(err);
  }
  return json as T;
}

export const api = {
  base: BASE,
  // auth
  register: (data: { email: string; password: string; username: string; display_name?: string }) =>
    req<{ user: User; token: string }>("POST", "/auth/register", data),
  login: (email: string, password: string) =>
    req<{ user: User; token: string }>("POST", "/auth/login", { email, password }),
  me: () => req<{ user: User }>("GET", "/auth/me"),

  // profile
  getInterests: () => req<{ interests: string[] }>("GET", "/profile/interests"),
  getProfile: (userId: string) =>
    req<{ profile: User; interests: string[]; photos: { url: string; is_primary: boolean }[] }>("GET", `/profile/${userId}`),
  updateProfile: (data: Partial<User> & { interests?: string[] }) =>
    req<{ user: User }>("PUT", "/profile/", data),

  // swipe
  getCards: (limit = 10) => req<{ cards: Card[] }>("GET", `/swipe/cards?limit=${limit}`),
  swipe: (targetId: string, action: "like" | "dislike" | "super_like") =>
    req<{ matched: boolean; match?: Match }>("POST", `/swipe/${targetId}`, { action }),
  getMatches: () => req<{ matches: Match[] }>("GET", "/swipe/matches/list"),

  // chat
  sendMessage: (matchId: string, content: string, mediaUrl?: string, mediaType?: string) =>
    req<{ message: Message }>("POST", `/chat/${matchId}/message`, { content, media_url: mediaUrl, media_type: mediaType }),
  getMessages: (matchId: string) => req<{ messages: Message[] }>("GET", `/chat/${matchId}/messages`),

  // games
  getGameTypes: () => req<{ games: { type: string; name: string; description: string }[] }>("GET", "/games/types"),
  startGame: (matchId: string, gameType: string) =>
    req<{ session: { id: string } }>("POST", "/games/start", { match_id: matchId, game_type: gameType }),
  endGame: (sessionId: string, p1: number, p2: number) =>
    req<{ winner_id: string; total_games: number }>("POST", `/games/${sessionId}/end`, { player1_score: p1, player2_score: p2 }),

  // leaderboard
  getLeaderboard: (type: "hearts" | "level" | "couples") =>
    req<{ leaderboard: { id: string; username: string; display_name: string | null; score: number }[] }>("GET", `/leaderboard/${type}`),

  // cosmetics
  shopList: () => req<{ items: unknown[] }>("GET", "/cosmetics/shop"),

  // posts
  getFeed: (limit = 20, offset = 0) =>
    req<{ posts: Post[] }>("GET", `/posts/feed?limit=${limit}&offset=${offset}`),
  getPost: (postId: string) => req<{ post: Post }>("GET", `/posts/id/${postId}`),
  getUserPosts: (userId: string) =>
    req<{ posts: Post[] }>("GET", `/posts/user/${userId}`),
  likePost: (postId: string) => req<{ liked: boolean }>("POST", `/posts/${postId}/like`),
  getComments: (postId: string) => req<{ comments: Comment[] }>("GET", `/posts/${postId}/comments`),
  postComment: (postId: string, content: string) =>
    req<{ comment: Comment }>("POST", `/posts/${postId}/comment`, { content }),
  follow: (userId: string) => req<{ following: boolean }>("POST", `/posts/follow/${userId}`),
};

// Resolve relative media URLs to absolute (backend /uploads fallback)
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return BASE + url;
}

export function saveAuth(t: string) {
  if (typeof window !== "undefined") localStorage.setItem("loveloop_token", t);
}
export function clearAuth() {
  if (typeof window !== "undefined") localStorage.removeItem("loveloop_token");
}
export function hasToken() {
  return !!token();
}
