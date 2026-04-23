using System;

namespace LoveLoop
{
    [Serializable] public class AuthResponse { public User user; public string token; }
    [Serializable]
    public class User {
        public string id;
        public string email;
        public string username;
        public string display_name;
        public string bio;
        public string avatar_url;
        public int age;
        public string gender;
        public string location;
        public int level;
        public int total_xp;
        public long coins_balance;
        public int gems_balance;
        public int hearts_received;
    }

    [Serializable] public class MeResponse { public User user; public string[] interests; public string[] photos; }
    [Serializable] public class InterestsResponse { public string[] interests; }

    [Serializable] public class Card {
        public string id;
        public string username;
        public string display_name;
        public string bio;
        public string avatar_url;
        public int age;
        public string gender;
        public string[] interests;
        public int level;
    }
    [Serializable] public class CardsResponse { public Card[] cards; }

    [Serializable] public class Match {
        public string id;
        public string user1_id;
        public string user2_id;
        public string other_user_id;
        public string other_username;
        public string other_display_name;
        public string other_avatar_url;
        public int relationship_level;
        public int total_games_played;
        public string matched_at;
    }
    [Serializable] public class MatchesResponse { public Match[] matches; }
    [Serializable] public class SwipeResponse { public bool matched; public Match match; }

    [Serializable] public class Message {
        public string id;
        public string match_id;
        public string sender_id;
        public string content;
        public bool is_read;
        public string created_at;
    }
    [Serializable] public class MessagesResponse { public Message[] messages; }

    [Serializable] public class GameSession {
        public string id;
        public string game_type;
        public string match_id;
        public string player1_id;
        public string player2_id;
        public int player1_score;
        public int player2_score;
        public string status;
    }
    [Serializable] public class GameSessionResponse { public GameSession session; }
    [Serializable] public class GameEndReward { public string user_id; public int coins; public int xp; }
    [Serializable] public class GameEndResponse {
        public string winner_id; public int total_games; public int relationship_level;
    }

    [Serializable] public class LeaderboardEntry {
        public string id; public string username; public string display_name;
        public string avatar_url; public int level; public int hearts_received; public int total_xp; public int rank;
    }
    [Serializable] public class LeaderboardResponse { public LeaderboardEntry[] leaderboard; }
}
