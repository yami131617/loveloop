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
    // Smart: auto-logout when the token we SENT is rejected.
    // Exclude /auth/login and /auth/register only — their 401s are expected bad-credentials errors
    // (no token was being relied on). Keep /auth/me in scope: a 401 there means our session is dead.
    const isLoginOrRegister = path === "/auth/login" || path === "/auth/register";
    if (r.status === 401 && typeof window !== "undefined" && t && !isLoginOrRegister) {
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
  changeUsername: (username: string) =>
    req<{ username: string }>("PUT", "/profile/username", { username }),

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
  deletePost: (postId: string) => req<{ success: boolean }>("DELETE", `/posts/${postId}`),

  // preferences
  getPrefs: () => req<Prefs>("GET", "/preferences"),
  updatePrefs: <K extends keyof Prefs>(group: K, patch: Partial<Prefs[K]>) =>
    req<Pick<Prefs, K>>("PUT", `/preferences/${group}`, patch),
  getBlocked: () => req<{ blocked: BlockedUser[] }>("GET", "/preferences/blocked"),
  block: (userId: string) => req<{ blocked: boolean }>("POST", `/preferences/block/${userId}`),
  unblock: (userId: string) => req<{ blocked: boolean }>("DELETE", `/preferences/block/${userId}`),

  // security
  changePassword: (current_password: string, new_password: string) =>
    req<{ success: boolean }>("POST", "/auth/password", { current_password, new_password }),

  // groups + friends
  listGroups: () => req<{ groups: GroupChat[] }>("GET", "/groups"),
  createGroup: (name: string, member_ids: string[], avatar_url?: string) =>
    req<{ group: GroupChat }>("POST", "/groups", { name, member_ids, avatar_url }),
  getGroup: (id: string) => req<{ group: GroupChat; members: GroupMember[]; messages: Message[] }>("GET", `/groups/${id}`),
  sendGroupMessage: (id: string, content: string, media_url?: string, media_type?: string) =>
    req<{ message: Message }>("POST", `/groups/${id}/message`, { content, media_url, media_type }),
  addGroupMembers: (id: string, user_ids: string[]) =>
    req<{ added: string[] }>("POST", `/groups/${id}/members`, { user_ids }),
  leaveGroup: (id: string, userId: string) =>
    req<{ success: boolean }>("DELETE", `/groups/${id}/members/${userId}`),
  renameGroup: (id: string, name: string) =>
    req<{ group: GroupChat }>("PUT", `/groups/${id}`, { name }),

  listFriends: () => req<{ friends: Friend[] }>("GET", "/groups/friends/list"),
  friendRequests: () => req<{ requests: FriendRequest[] }>("GET", "/groups/friends/requests"),
  sendFriendRequest: (userId: string) =>
    req<{ status: "pending" | "accepted" }>("POST", `/groups/friends/request/${userId}`),
  respondFriendRequest: (userId: string, action: "accept" | "decline") =>
    req<{ status: "accepted" | "declined" }>("POST", `/groups/friends/respond/${userId}`, { action }),
  searchFriends: (q: string) =>
    req<{ users: Friend[] }>("GET", `/groups/friends/search?q=${encodeURIComponent(q)}`),

  // music
  musicCategories: () => req<{ categories: { category: string; track_count: number }[] }>("GET", "/music/categories"),
  musicList: (params: { category?: string; q?: string; trending?: boolean; favorite?: boolean; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    if (params.trending) qs.set("trending", "1");
    if (params.favorite) qs.set("favorite", "1");
    if (params.limit) qs.set("limit", String(params.limit));
    return req<{ tracks: MusicTrack[] }>("GET", `/music?${qs.toString()}`);
  },
  useMusic: (trackId: string) => req<{ use_count: number }>("POST", `/music/${trackId}/use`),
  favoriteMusic: (trackId: string) => req<{ favorited: boolean }>("POST", `/music/${trackId}/favorite`),
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  category: string;
  mood: string | null;
  duration_seconds: number;
  url: string;
  cover_gradient: string;
  use_count: number;
  is_trending: boolean;
  tags: string[];
  favorited_by_me?: boolean;
};

export type GroupChat = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
  member_count?: number;
  last_message?: {
    content: string;
    sender_id: string;
    media_type: string | null;
    created_at: string;
  } | null;
};

export type GroupMember = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
};

export type Friend = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  source?: "friend" | "match";
};

export type FriendRequest = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Prefs = {
  notifications: {
    match: boolean; message: boolean; comment: boolean; like: boolean;
    follow: boolean; push: boolean; email: boolean;
  };
  privacy: {
    discoverable: boolean; show_age: boolean; show_distance: boolean;
    show_online: boolean; read_receipts: boolean;
  };
  discover: {
    age_min: number; age_max: number;
    gender: "any" | "female" | "male" | "non_binary";
    max_distance_km: number;
  };
};

export type BlockedUser = {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; created_at: string;
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
