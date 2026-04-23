using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace LoveLoop
{
    public class NetworkManager : MonoBehaviour
    {
        public static NetworkManager Instance { get; private set; }

        [Header("Backend")]
        public string baseUrl = "https://backend-production-61ee6.up.railway.app";

        private const string TOKEN_KEY = "ll_jwt";
        public string Token { get; private set; }
        public bool IsLoggedIn => !string.IsNullOrEmpty(Token);
        public string CurrentUserId { get; set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Token = PlayerPrefs.GetString(TOKEN_KEY, "");
        }

        public void SetToken(string t) { Token = t ?? ""; PlayerPrefs.SetString(TOKEN_KEY, Token); PlayerPrefs.Save(); }
        public void Logout() { Token = ""; CurrentUserId = null; PlayerPrefs.DeleteKey(TOKEN_KEY); PlayerPrefs.Save(); }

        public IEnumerator Post(string path, string json, Action<bool, string> cb)
        {
            using (var req = new UnityWebRequest(baseUrl + path, "POST"))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json ?? "{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                if (IsLoggedIn) req.SetRequestHeader("Authorization", "Bearer " + Token);
                yield return req.SendWebRequest();
                cb?.Invoke(req.result == UnityWebRequest.Result.Success, req.downloadHandler.text);
            }
        }

        public IEnumerator Put(string path, string json, Action<bool, string> cb)
        {
            using (var req = new UnityWebRequest(baseUrl + path, "PUT"))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json ?? "{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                if (IsLoggedIn) req.SetRequestHeader("Authorization", "Bearer " + Token);
                yield return req.SendWebRequest();
                cb?.Invoke(req.result == UnityWebRequest.Result.Success, req.downloadHandler.text);
            }
        }

        public IEnumerator Get(string path, Action<bool, string> cb)
        {
            using (var req = UnityWebRequest.Get(baseUrl + path))
            {
                if (IsLoggedIn) req.SetRequestHeader("Authorization", "Bearer " + Token);
                yield return req.SendWebRequest();
                cb?.Invoke(req.result == UnityWebRequest.Result.Success, req.downloadHandler.text);
            }
        }

        public IEnumerator Delete(string path, Action<bool, string> cb)
        {
            using (var req = UnityWebRequest.Delete(baseUrl + path))
            {
                req.downloadHandler = new DownloadHandlerBuffer();
                if (IsLoggedIn) req.SetRequestHeader("Authorization", "Bearer " + Token);
                yield return req.SendWebRequest();
                cb?.Invoke(req.result == UnityWebRequest.Result.Success, req.downloadHandler.text);
            }
        }
    }
}
