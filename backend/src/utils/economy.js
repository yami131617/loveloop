// LOVELOOP economy constants. Server-authoritative — never trust client.

const INTERESTS = [
  'Music', 'Gaming', 'Sports', 'Movies', 'Travel', 'Art',
  'Cooking', 'Reading', 'Tech', 'Fashion', 'Photography',
  'Dancing', 'Fitness', 'Anime', 'K-pop', 'Memes'
];

const RELATIONSHIP_THRESHOLDS = {
  0: { label: 'Just Matched', games: 0 },
  1: { label: 'Getting to Know', games: 3 },
  2: { label: 'Dating', games: 10 },
  3: { label: 'In Love', games: 25 },
  4: { label: 'Soulmates', games: 100 }
};

const GAME_REWARDS = {
  quiz:    { coins: [10, 50],  xp: [5, 25] },
  rhythm:  { coins: [20, 100], xp: [10, 50] },
  word:    { coins: [50, 100], xp: [25, 50] },
  trivia:  { coins: [50, 200], xp: [25, 100] },
  drawing: { coins: [50, 100], xp: [25, 50] }
};

const SUPER_LIKE_COST_GEMS = 5;
const BATTLE_PASS_COINS_PER_MONTH = 500;
const BATTLE_PASS_XP_MULTIPLIER = 2;
const BATTLE_PASS_COIN_MULTIPLIER = 2;

// Level thresholds (XP required to reach next level)
function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function levelFromXp(xp) {
  let lv = 1;
  while (xpForLevel(lv) <= xp && lv < 100) lv++;
  return lv;
}

// Matching algorithm: simple score based on mutual interests + age
function matchScore(userA, userB) {
  const interestsA = new Set(userA.interests || []);
  const interestsB = new Set(userB.interests || []);
  const shared = [...interestsA].filter(i => interestsB.has(i)).length;

  const ageDiff = Math.abs((userA.age || 25) - (userB.age || 25));
  const ageScore = Math.max(0, 10 - ageDiff);

  return shared * 10 + ageScore;
}

function requiredLevelFromGames(games) {
  if (games >= 100) return 4;
  if (games >= 25)  return 3;
  if (games >= 10)  return 2;
  if (games >= 3)   return 1;
  return 0;
}

module.exports = {
  INTERESTS,
  RELATIONSHIP_THRESHOLDS,
  GAME_REWARDS,
  SUPER_LIKE_COST_GEMS,
  BATTLE_PASS_COINS_PER_MONTH,
  BATTLE_PASS_XP_MULTIPLIER,
  BATTLE_PASS_COIN_MULTIPLIER,
  xpForLevel,
  levelFromXp,
  matchScore,
  requiredLevelFromGames
};
