using System;
using System.Collections;
using UnityEngine;

namespace LoveLoop
{
    public class ChatManager : MonoBehaviour
    {
        public static ChatManager Instance { get; private set; }
        public event Action<Message> OnMessageReceived;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public IEnumerator SendMessage(string matchId, string content, Action<bool, Message> cb)
        {
            var body = $"{{\"content\":{JsonEscape(content)}}}";
            yield return NetworkManager.Instance.Post($"/chat/{matchId}/message", body, (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var wrapper = JsonUtility.FromJson<MessageWrapper>(json);
                cb?.Invoke(true, wrapper.message);
            });
        }

        public IEnumerator GetMessages(string matchId, int limit, Action<bool, Message[]> cb)
        {
            yield return NetworkManager.Instance.Get($"/chat/{matchId}/messages?limit={limit}", (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<MessagesResponse>(json);
                cb?.Invoke(true, r.messages);
            });
        }

        private static string JsonEscape(string s)
        {
            if (s == null) return "\"\"";
            var sb = new System.Text.StringBuilder("\"");
            foreach (var c in s)
            {
                if (c == '"') sb.Append("\\\"");
                else if (c == '\\') sb.Append("\\\\");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else if (c < 32) sb.Append($"\\u{(int)c:x4}");
                else sb.Append(c);
            }
            sb.Append('"');
            return sb.ToString();
        }

        [Serializable] private class MessageWrapper { public Message message; }
    }
}
