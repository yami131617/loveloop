using System;
using System.Collections;
using UnityEngine;

namespace LoveLoop
{
    public class AuthManager : MonoBehaviour
    {
        public static AuthManager Instance { get; private set; }
        public User CurrentUser { get; private set; }

        public event Action<User> OnLoggedIn;
        public event Action OnLoggedOut;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public IEnumerator Register(string email, string password, string username, string displayName, Action<bool, string> cb)
        {
            var body = $"{{\"email\":\"{email}\",\"password\":\"{password}\",\"username\":\"{username}\",\"display_name\":\"{displayName}\"}}";
            yield return NetworkManager.Instance.Post("/auth/register", body, (ok, json) =>
            {
                if (ok)
                {
                    var r = JsonUtility.FromJson<AuthResponse>(json);
                    NetworkManager.Instance.SetToken(r.token);
                    NetworkManager.Instance.CurrentUserId = r.user.id;
                    CurrentUser = r.user;
                    OnLoggedIn?.Invoke(r.user);
                }
                cb?.Invoke(ok, json);
            });
        }

        public IEnumerator Login(string email, string password, Action<bool, string> cb)
        {
            var body = $"{{\"email\":\"{email}\",\"password\":\"{password}\"}}";
            yield return NetworkManager.Instance.Post("/auth/login", body, (ok, json) =>
            {
                if (ok)
                {
                    var r = JsonUtility.FromJson<AuthResponse>(json);
                    NetworkManager.Instance.SetToken(r.token);
                    NetworkManager.Instance.CurrentUserId = r.user.id;
                    CurrentUser = r.user;
                    OnLoggedIn?.Invoke(r.user);
                }
                cb?.Invoke(ok, json);
            });
        }

        public IEnumerator FetchMe(Action<bool, MeResponse> cb)
        {
            yield return NetworkManager.Instance.Get("/auth/me", (ok, json) =>
            {
                if (!ok) { cb?.Invoke(false, null); return; }
                var r = JsonUtility.FromJson<MeResponse>(json);
                CurrentUser = r.user;
                NetworkManager.Instance.CurrentUserId = r.user.id;
                cb?.Invoke(true, r);
            });
        }

        public void Logout()
        {
            NetworkManager.Instance.Logout();
            CurrentUser = null;
            OnLoggedOut?.Invoke();
        }
    }
}
