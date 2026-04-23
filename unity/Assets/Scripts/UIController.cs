using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace LoveLoop
{
    // Single-scene UI controller with multiple panels (login, home, swipe, matches, chat).
    // Switched via SetPanel. Keeps it simple for MVP.
    public class UIController : MonoBehaviour
    {
        public static UIController Instance { get; private set; }

        [Header("Panels")]
        public GameObject loginPanel;
        public GameObject homePanel;
        public GameObject swipePanel;
        public GameObject matchesPanel;
        public GameObject chatPanel;

        [Header("Login")]
        public TMP_InputField emailInput;
        public TMP_InputField passwordInput;
        public TMP_InputField usernameInput;
        public Button loginBtn;
        public Button registerBtn;
        public TextMeshProUGUI loginStatus;

        [Header("Home")]
        public TextMeshProUGUI userLabel;
        public TextMeshProUGUI coinsLabel;
        public TextMeshProUGUI gemsLabel;
        public Button goToSwipeBtn;
        public Button goToMatchesBtn;
        public Button logoutBtn;

        [Header("Swipe")]
        public TextMeshProUGUI cardName;
        public TextMeshProUGUI cardBio;
        public TextMeshProUGUI cardInterests;
        public Button likeBtn;
        public Button dislikeBtn;
        public Button backFromSwipe;
        public TextMeshProUGUI swipeStatus;

        [Header("Matches")]
        public Transform matchListContent;
        public GameObject matchRowPrefab;
        public Button refreshMatchesBtn;
        public Button backFromMatches;

        [Header("Chat")]
        public TextMeshProUGUI chatPartnerName;
        public Transform chatMessagesContent;
        public GameObject chatMessagePrefab;
        public TMP_InputField chatInput;
        public Button sendChatBtn;
        public Button backFromChat;

        private List<Card> cardQueue = new List<Card>();
        private int cardIndex = 0;
        private string currentChatMatchId;
        private string currentChatPartner;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void Start()
        {
            if (loginBtn) loginBtn.onClick.AddListener(OnLoginClick);
            if (registerBtn) registerBtn.onClick.AddListener(OnRegisterClick);
            if (logoutBtn) logoutBtn.onClick.AddListener(OnLogoutClick);
            if (goToSwipeBtn) goToSwipeBtn.onClick.AddListener(() => { SetPanel(swipePanel); StartCoroutine(LoadNextCards()); });
            if (goToMatchesBtn) goToMatchesBtn.onClick.AddListener(() => { SetPanel(matchesPanel); StartCoroutine(LoadMatches()); });
            if (likeBtn) likeBtn.onClick.AddListener(() => DoSwipe("like"));
            if (dislikeBtn) dislikeBtn.onClick.AddListener(() => DoSwipe("dislike"));
            if (backFromSwipe) backFromSwipe.onClick.AddListener(() => SetPanel(homePanel));
            if (refreshMatchesBtn) refreshMatchesBtn.onClick.AddListener(() => StartCoroutine(LoadMatches()));
            if (backFromMatches) backFromMatches.onClick.AddListener(() => SetPanel(homePanel));
            if (sendChatBtn) sendChatBtn.onClick.AddListener(OnSendChat);
            if (backFromChat) backFromChat.onClick.AddListener(() => SetPanel(matchesPanel));

            // Auto-login if token exists
            if (NetworkManager.Instance != null && NetworkManager.Instance.IsLoggedIn)
                StartCoroutine(TryAutoLogin());
            else
                SetPanel(loginPanel);
        }

        private IEnumerator TryAutoLogin()
        {
            yield return AuthManager.Instance.FetchMe((ok, me) =>
            {
                if (ok) GoToHome(me.user);
                else { NetworkManager.Instance.Logout(); SetPanel(loginPanel); }
            });
        }

        public void SetPanel(GameObject active)
        {
            foreach (var p in new[] { loginPanel, homePanel, swipePanel, matchesPanel, chatPanel })
                if (p) p.SetActive(p == active);
        }

        private void OnLoginClick()
        {
            if (loginStatus) loginStatus.text = "Logging in...";
            StartCoroutine(AuthManager.Instance.Login(emailInput.text, passwordInput.text, (ok, json) =>
            {
                if (ok) GoToHome(AuthManager.Instance.CurrentUser);
                else if (loginStatus) loginStatus.text = "Login failed: " + json;
            }));
        }

        private void OnRegisterClick()
        {
            if (loginStatus) loginStatus.text = "Registering...";
            var username = !string.IsNullOrEmpty(usernameInput?.text) ? usernameInput.text : emailInput.text.Split('@')[0];
            StartCoroutine(AuthManager.Instance.Register(emailInput.text, passwordInput.text, username, username, (ok, json) =>
            {
                if (ok) GoToHome(AuthManager.Instance.CurrentUser);
                else if (loginStatus) loginStatus.text = "Register failed: " + json;
            }));
        }

        private void OnLogoutClick()
        {
            AuthManager.Instance.Logout();
            SetPanel(loginPanel);
        }

        private void GoToHome(User u)
        {
            if (u != null)
            {
                if (userLabel) userLabel.text = $"Hi, {u.display_name ?? u.username}!  Lv.{u.level}";
                if (coinsLabel) coinsLabel.text = $"● {u.coins_balance}";
                if (gemsLabel) gemsLabel.text = $"♥ {u.gems_balance}";
            }
            SetPanel(homePanel);
        }

        private IEnumerator LoadNextCards()
        {
            if (swipeStatus) swipeStatus.text = "Loading...";
            yield return SwipeManager.Instance.LoadCards(10, (ok, cards) =>
            {
                if (!ok || cards == null || cards.Length == 0)
                {
                    if (swipeStatus) swipeStatus.text = "No cards. Try later.";
                    cardQueue.Clear();
                    return;
                }
                cardQueue = new List<Card>(cards);
                cardIndex = 0;
                ShowCurrentCard();
            });
        }

        private void ShowCurrentCard()
        {
            if (cardIndex >= cardQueue.Count)
            {
                if (swipeStatus) swipeStatus.text = "No more cards — swipe back later!";
                if (cardName) cardName.text = "";
                if (cardBio) cardBio.text = "";
                if (cardInterests) cardInterests.text = "";
                return;
            }
            var c = cardQueue[cardIndex];
            if (cardName) cardName.text = $"{c.display_name ?? c.username}, {c.age}";
            if (cardBio) cardBio.text = string.IsNullOrEmpty(c.bio) ? "<i>No bio</i>" : c.bio;
            if (cardInterests) cardInterests.text = c.interests != null ? string.Join(" · ", c.interests) : "";
            if (swipeStatus) swipeStatus.text = $"{cardIndex + 1} / {cardQueue.Count}";
        }

        private void DoSwipe(string action)
        {
            if (cardIndex >= cardQueue.Count) return;
            var targetId = cardQueue[cardIndex].id;
            var targetName = cardQueue[cardIndex].display_name ?? cardQueue[cardIndex].username;
            StartCoroutine(SwipeManager.Instance.Swipe(targetId, action, (ok, resp) =>
            {
                if (ok && resp != null && resp.matched)
                {
                    if (swipeStatus) swipeStatus.text = $"♥ MATCH with {targetName}!";
                }
                cardIndex++;
                ShowCurrentCard();
            }));
        }

        private IEnumerator LoadMatches()
        {
            yield return SwipeManager.Instance.GetMatches((ok, matches) =>
            {
                if (!matchListContent) return;
                for (int i = matchListContent.childCount - 1; i >= 0; i--)
                    Destroy(matchListContent.GetChild(i).gameObject);
                if (!ok || matches == null) return;
                foreach (var m in matches)
                {
                    if (!matchRowPrefab) continue;
                    var row = Instantiate(matchRowPrefab, matchListContent);
                    var label = row.GetComponentInChildren<TextMeshProUGUI>();
                    if (label) label.text = $"♥ {m.other_display_name ?? m.other_username} (Lv{m.relationship_level})";
                    var btn = row.GetComponentInChildren<Button>();
                    if (btn)
                    {
                        var matchId = m.id;
                        var name = m.other_display_name ?? m.other_username;
                        btn.onClick.AddListener(() => OpenChat(matchId, name));
                    }
                }
            });
        }

        private void OpenChat(string matchId, string partnerName)
        {
            currentChatMatchId = matchId;
            currentChatPartner = partnerName;
            if (chatPartnerName) chatPartnerName.text = partnerName;
            SetPanel(chatPanel);
            StartCoroutine(LoadChat());
        }

        private IEnumerator LoadChat()
        {
            yield return ChatManager.Instance.GetMessages(currentChatMatchId, 50, (ok, msgs) =>
            {
                if (!chatMessagesContent) return;
                for (int i = chatMessagesContent.childCount - 1; i >= 0; i--)
                    Destroy(chatMessagesContent.GetChild(i).gameObject);
                if (!ok || msgs == null) return;
                foreach (var m in msgs) AddChatBubble(m);
            });
        }

        private void AddChatBubble(Message m)
        {
            if (!chatMessagePrefab || !chatMessagesContent) return;
            var row = Instantiate(chatMessagePrefab, chatMessagesContent);
            var label = row.GetComponentInChildren<TextMeshProUGUI>();
            if (label)
            {
                bool isMine = m.sender_id == NetworkManager.Instance.CurrentUserId;
                label.text = (isMine ? "You: " : currentChatPartner + ": ") + m.content;
                label.alignment = isMine ? TextAlignmentOptions.Right : TextAlignmentOptions.Left;
            }
        }

        private void OnSendChat()
        {
            if (string.IsNullOrEmpty(chatInput?.text)) return;
            var content = chatInput.text;
            chatInput.text = "";
            StartCoroutine(ChatManager.Instance.SendMessage(currentChatMatchId, content, (ok, msg) =>
            {
                if (ok && msg != null) AddChatBubble(msg);
            }));
        }
    }
}
