using System;
using System.Collections;
using UnityEngine;

namespace LoveLoop
{
    public class SwipeManager : MonoBehaviour
    {
        public static SwipeManager Instance { get; private set; }

        public event Action<Card[]> OnCardsLoaded;
        public event Action<Match> OnMatchSuccess;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public IEnumerator LoadCards(int count, Action<bool, Card[]> cb)
        {
            yield return NetworkManager.Instance.Get($"/swipe/cards?limit={count}", (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<CardsResponse>(json);
                OnCardsLoaded?.Invoke(r.cards);
                cb?.Invoke(true, r.cards);
            });
        }

        public IEnumerator Swipe(string targetId, string action, Action<bool, SwipeResponse> cb)
        {
            var body = $"{{\"action\":\"{action}\"}}";
            yield return NetworkManager.Instance.Post($"/swipe/{targetId}", body, (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<SwipeResponse>(json);
                if (r.matched) OnMatchSuccess?.Invoke(r.match);
                cb?.Invoke(true, r);
            });
        }

        public IEnumerator GetMatches(Action<bool, Match[]> cb)
        {
            yield return NetworkManager.Instance.Get("/swipe/matches/list", (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<MatchesResponse>(json);
                cb?.Invoke(true, r.matches);
            });
        }
    }
}
