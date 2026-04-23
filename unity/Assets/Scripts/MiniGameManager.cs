using System;
using System.Collections;
using UnityEngine;

namespace LoveLoop
{
    public class MiniGameManager : MonoBehaviour
    {
        public static MiniGameManager Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public IEnumerator StartSession(string matchId, string gameType, Action<bool, GameSession> cb)
        {
            var body = $"{{\"match_id\":\"{matchId}\",\"game_type\":\"{gameType}\"}}";
            yield return NetworkManager.Instance.Post("/games/start", body, (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<GameSessionResponse>(json);
                cb?.Invoke(true, r.session);
            });
        }

        public IEnumerator EndSession(string sessionId, int player1Score, int player2Score, Action<bool, string> cb)
        {
            var body = $"{{\"player1_score\":{player1Score},\"player2_score\":{player2Score}}}";
            yield return NetworkManager.Instance.Post($"/games/{sessionId}/end", body, cb);
        }
    }
}
