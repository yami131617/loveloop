#if UNITY_EDITOR
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using TMPro;
using LoveLoop;

[InitializeOnLoad]
public static class SceneSetup
{
    const string SCENE_PATH = "Assets/Scenes/Main.unity";
    const string BACKEND_URL = "https://backend-production-61ee6.up.railway.app";

    // Palette
    static Color BG = HexColor("#1a0e2e");
    static Color PANEL = HexColor("#2a1a3e");
    static Color ACCENT_PINK = HexColor("#ff4d8c");
    static Color ACCENT_PURPLE = HexColor("#8e4dff");
    static Color TEXT_LIGHT = HexColor("#f0e8ff");
    static Color TEXT_MUTED = HexColor("#9b92b4");

    static SceneSetup()
    {
        EditorApplication.delayCall += () =>
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) return;
            if (!System.IO.File.Exists(SCENE_PATH))
            {
                try { CreateMainScene(); } catch (System.Exception e) { Debug.LogError("[SceneSetup] " + e); }
            }
            else
            {
                var active = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
                if (string.IsNullOrEmpty(active.path))
                {
                    EditorSceneManager.OpenScene(SCENE_PATH, OpenSceneMode.Single);
                    Debug.Log("[SceneSetup] auto-opened Main.unity");
                }
            }
        };
    }

    [MenuItem("LoveLoop/Create Main Scene")]
    public static void CreateMainScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

        // Systems
        var systems = new GameObject("_Systems");
        var net = systems.AddComponent<NetworkManager>();
        net.baseUrl = BACKEND_URL;
        systems.AddComponent<AuthManager>();
        systems.AddComponent<SwipeManager>();
        systems.AddComponent<ChatManager>();
        systems.AddComponent<MiniGameManager>();

        // Canvas
        var canvasGO = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        var canvas = canvasGO.GetComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        var scaler = canvasGO.GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1080, 1920);
        scaler.matchWidthOrHeight = 1f;

        new GameObject("EventSystem", typeof(UnityEngine.EventSystems.EventSystem),
            typeof(UnityEngine.EventSystems.StandaloneInputModule));

        // BG
        var bg = CreateRect(canvasGO.transform, "Background");
        bg.anchorMin = Vector2.zero; bg.anchorMax = Vector2.one; bg.sizeDelta = Vector2.zero;
        bg.gameObject.AddComponent<Image>().color = BG;

        // Title bar
        var title = CreateText(canvasGO.transform, "Title", "♥ LOVELOOP ♥", 64,
            new Vector2(0, 880), 1080, 120, HexColor("#ff6aa6"), FontStyles.Bold);
        title.alignment = TextAlignmentOptions.Center;

        // Panels
        var loginPanel = CreatePanel(canvasGO.transform, "LoginPanel");
        var homePanel = CreatePanel(canvasGO.transform, "HomePanel"); homePanel.SetActive(false);
        var swipePanel = CreatePanel(canvasGO.transform, "SwipePanel"); swipePanel.SetActive(false);
        var matchesPanel = CreatePanel(canvasGO.transform, "MatchesPanel"); matchesPanel.SetActive(false);
        var chatPanel = CreatePanel(canvasGO.transform, "ChatPanel"); chatPanel.SetActive(false);

        // --- LOGIN ---
        CreateText(loginPanel.transform, "Heading", "Find your loop", 56,
            new Vector2(0, 620), 900, 100, TEXT_LIGHT, FontStyles.Bold);

        var emailInput = CreateInput(loginPanel.transform, "EmailInput", "email@example.com",
            new Vector2(0, 450), new Vector2(860, 100));
        var passwordInput = CreateInput(loginPanel.transform, "PasswordInput", "password",
            new Vector2(0, 320), new Vector2(860, 100));
        passwordInput.contentType = TMP_InputField.ContentType.Password;
        var usernameInput = CreateInput(loginPanel.transform, "UsernameInput", "username (register only)",
            new Vector2(0, 190), new Vector2(860, 100));

        var loginBtn = CreateButton(loginPanel.transform, "LoginBtn", "LOGIN",
            new Vector2(-230, 30), new Vector2(400, 120), ACCENT_PINK);
        var registerBtn = CreateButton(loginPanel.transform, "RegisterBtn", "REGISTER",
            new Vector2(230, 30), new Vector2(400, 120), ACCENT_PURPLE);
        var loginStatus = CreateText(loginPanel.transform, "LoginStatus", "", 32,
            new Vector2(0, -100), 900, 80, TEXT_MUTED, FontStyles.Italic);

        // --- HOME ---
        var userLabel = CreateText(homePanel.transform, "UserLabel", "Hi!", 48,
            new Vector2(0, 600), 900, 80, TEXT_LIGHT, FontStyles.Bold);
        var coinsLabel = CreateText(homePanel.transform, "CoinsLabel", "💰 0", 40,
            new Vector2(-200, 500), 400, 60, HexColor("#ffd966"), FontStyles.Bold);
        var gemsLabel = CreateText(homePanel.transform, "GemsLabel", "💎 0", 40,
            new Vector2(200, 500), 400, 60, HexColor("#66ddff"), FontStyles.Bold);

        var swipeBtn = CreateButton(homePanel.transform, "GoToSwipeBtn", "💕  DISCOVER",
            new Vector2(0, 280), new Vector2(800, 140), ACCENT_PINK);
        var matchesBtn = CreateButton(homePanel.transform, "GoToMatchesBtn", "💬  MATCHES",
            new Vector2(0, 100), new Vector2(800, 140), ACCENT_PURPLE);
        var logoutBtn = CreateButton(homePanel.transform, "LogoutBtn", "Logout",
            new Vector2(0, -650), new Vector2(300, 80), HexColor("#555555"));

        // --- SWIPE ---
        var cardBox = CreatePanel(swipePanel.transform, "Card", PANEL);
        var cardRT = cardBox.GetComponent<RectTransform>();
        cardRT.anchorMin = cardRT.anchorMax = new Vector2(0.5f, 0.5f);
        cardRT.sizeDelta = new Vector2(900, 1100);
        cardRT.anchoredPosition = new Vector2(0, 100);

        var cardName = CreateText(cardBox.transform, "CardName", "Loading...", 60,
            new Vector2(0, 450), 820, 120, TEXT_LIGHT, FontStyles.Bold);
        var cardBio = CreateText(cardBox.transform, "CardBio", "", 38,
            new Vector2(0, 260), 820, 200, TEXT_LIGHT, FontStyles.Normal);
        cardBio.enableWordWrapping = true;
        var cardInterests = CreateText(cardBox.transform, "CardInterests", "", 32,
            new Vector2(0, 50), 820, 180, HexColor("#ff9eb8"), FontStyles.Italic);
        cardInterests.enableWordWrapping = true;

        var dislikeBtn = CreateButton(swipePanel.transform, "DislikeBtn", "✕",
            new Vector2(-280, -700), new Vector2(200, 200), HexColor("#555555"));
        var likeBtn = CreateButton(swipePanel.transform, "LikeBtn", "♥",
            new Vector2(280, -700), new Vector2(200, 200), ACCENT_PINK);
        var swipeStatus = CreateText(swipePanel.transform, "SwipeStatus", "", 36,
            new Vector2(0, -520), 900, 60, TEXT_LIGHT, FontStyles.Bold);
        var backFromSwipe = CreateButton(swipePanel.transform, "BackFromSwipe", "← Back",
            new Vector2(-420, 880), new Vector2(200, 80), HexColor("#333344"));

        // --- MATCHES ---
        CreateText(matchesPanel.transform, "Heading", "Your Matches", 56,
            new Vector2(0, 700), 900, 100, TEXT_LIGHT, FontStyles.Bold);
        var matchesScroll = CreateScroll(matchesPanel.transform, new Vector2(0, -20), new Vector2(960, 1200));
        var matchRow = CreateMatchRowPrefab();
        var refreshBtn = CreateButton(matchesPanel.transform, "RefreshMatchesBtn", "↻ Refresh",
            new Vector2(260, 700), new Vector2(250, 80), ACCENT_PURPLE);
        var backFromMatches = CreateButton(matchesPanel.transform, "BackFromMatches", "← Back",
            new Vector2(-420, 880), new Vector2(200, 80), HexColor("#333344"));

        // --- CHAT ---
        var chatPartner = CreateText(chatPanel.transform, "ChatPartnerName", "Chat", 50,
            new Vector2(0, 800), 900, 100, TEXT_LIGHT, FontStyles.Bold);
        var chatScroll = CreateScroll(chatPanel.transform, new Vector2(0, 0), new Vector2(960, 1300));
        var chatBubble = CreateChatBubblePrefab();
        var chatInput = CreateInput(chatPanel.transform, "ChatInput", "Type a message...",
            new Vector2(-140, -780), new Vector2(700, 100));
        var sendChatBtn = CreateButton(chatPanel.transform, "SendChatBtn", "Send",
            new Vector2(360, -780), new Vector2(200, 100), ACCENT_PINK);
        var backFromChat = CreateButton(chatPanel.transform, "BackFromChat", "← Back",
            new Vector2(-420, 880), new Vector2(200, 80), HexColor("#333344"));

        // UIController wire-up
        var ui = systems.AddComponent<UIController>();
        ui.loginPanel = loginPanel; ui.homePanel = homePanel;
        ui.swipePanel = swipePanel; ui.matchesPanel = matchesPanel; ui.chatPanel = chatPanel;
        ui.emailInput = emailInput; ui.passwordInput = passwordInput; ui.usernameInput = usernameInput;
        ui.loginBtn = loginBtn; ui.registerBtn = registerBtn; ui.loginStatus = loginStatus;
        ui.userLabel = userLabel; ui.coinsLabel = coinsLabel; ui.gemsLabel = gemsLabel;
        ui.goToSwipeBtn = swipeBtn; ui.goToMatchesBtn = matchesBtn; ui.logoutBtn = logoutBtn;
        ui.cardName = cardName; ui.cardBio = cardBio; ui.cardInterests = cardInterests;
        ui.likeBtn = likeBtn; ui.dislikeBtn = dislikeBtn; ui.backFromSwipe = backFromSwipe;
        ui.swipeStatus = swipeStatus;
        ui.matchListContent = matchesScroll.content; ui.matchRowPrefab = matchRow;
        ui.refreshMatchesBtn = refreshBtn; ui.backFromMatches = backFromMatches;
        ui.chatPartnerName = chatPartner;
        ui.chatMessagesContent = chatScroll.content; ui.chatMessagePrefab = chatBubble;
        ui.chatInput = chatInput; ui.sendChatBtn = sendChatBtn; ui.backFromChat = backFromChat;

        Camera.main.backgroundColor = BG;
        Camera.main.clearFlags = CameraClearFlags.SolidColor;

        if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs")) AssetDatabase.CreateFolder("Assets", "Prefabs");
        EditorSceneManager.SaveScene(scene, SCENE_PATH);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(SCENE_PATH, true) };
        Debug.Log("[SceneSetup] LOVELOOP Main.unity created");
    }

    // ---- helpers ----
    static Color HexColor(string hex) { ColorUtility.TryParseHtmlString(hex, out var c); return c; }

    static RectTransform CreateRect(Transform parent, string name)
    {
        var go = new GameObject(name, typeof(RectTransform));
        go.transform.SetParent(parent, false);
        return go.GetComponent<RectTransform>();
    }

    static GameObject CreatePanel(Transform parent, string name, Color? fill = null)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(CanvasGroup));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
        rt.offsetMin = rt.offsetMax = Vector2.zero;
        if (fill.HasValue)
        {
            var img = go.AddComponent<Image>();
            img.color = fill.Value;
        }
        return go;
    }

    static TextMeshProUGUI CreateText(Transform parent, string name, string text, int fontSize,
        Vector2 pos, int w, int h, Color color, FontStyles style)
    {
        var go = new GameObject(name, typeof(RectTransform));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = new Vector2(w, h);
        rt.anchoredPosition = pos;
        var t = go.AddComponent<TextMeshProUGUI>();
        t.text = text; t.fontSize = fontSize; t.color = color;
        t.fontStyle = style; t.alignment = TextAlignmentOptions.Center;
        t.richText = true;
        return t;
    }

    static Button CreateButton(Transform parent, string name, string label, Vector2 pos, Vector2 size, Color fill)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = size;
        rt.anchoredPosition = pos;
        go.GetComponent<Image>().color = fill;

        var labelGO = new GameObject("Label", typeof(RectTransform));
        labelGO.transform.SetParent(go.transform, false);
        var lrt = labelGO.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
        lrt.sizeDelta = Vector2.zero;
        var t = labelGO.AddComponent<TextMeshProUGUI>();
        t.text = label; t.fontSize = 44; t.alignment = TextAlignmentOptions.Center;
        t.color = Color.white; t.fontStyle = FontStyles.Bold;
        return go.GetComponent<Button>();
    }

    static TMP_InputField CreateInput(Transform parent, string name, string placeholder, Vector2 pos, Vector2 size)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = size; rt.anchoredPosition = pos;
        go.GetComponent<Image>().color = new Color(1, 1, 1, 0.1f);

        var inp = go.AddComponent<TMP_InputField>();

        var textArea = new GameObject("TextArea", typeof(RectTransform), typeof(RectMask2D));
        textArea.transform.SetParent(go.transform, false);
        var taRT = textArea.GetComponent<RectTransform>();
        taRT.anchorMin = Vector2.zero; taRT.anchorMax = Vector2.one;
        taRT.offsetMin = new Vector2(20, 8); taRT.offsetMax = new Vector2(-20, -8);

        var textGO = new GameObject("Text", typeof(RectTransform));
        textGO.transform.SetParent(textArea.transform, false);
        var trt = textGO.GetComponent<RectTransform>();
        trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one; trt.offsetMin = trt.offsetMax = Vector2.zero;
        var textComp = textGO.AddComponent<TextMeshProUGUI>();
        textComp.fontSize = 44; textComp.color = TEXT_LIGHT;
        textComp.alignment = TextAlignmentOptions.MidlineLeft;

        var placeholderGO = new GameObject("Placeholder", typeof(RectTransform));
        placeholderGO.transform.SetParent(textArea.transform, false);
        var prt = placeholderGO.GetComponent<RectTransform>();
        prt.anchorMin = Vector2.zero; prt.anchorMax = Vector2.one; prt.offsetMin = prt.offsetMax = Vector2.zero;
        var placeComp = placeholderGO.AddComponent<TextMeshProUGUI>();
        placeComp.text = placeholder; placeComp.fontSize = 44;
        placeComp.color = TEXT_MUTED; placeComp.fontStyle = FontStyles.Italic;
        placeComp.alignment = TextAlignmentOptions.MidlineLeft;

        inp.textComponent = textComp;
        inp.placeholder = placeComp;
        inp.textViewport = taRT;
        return inp;
    }

    class ScrollCreation { public ScrollRect scroll; public RectTransform content; }
    static ScrollCreation CreateScroll(Transform parent, Vector2 pos, Vector2 size)
    {
        var go = new GameObject("Scroll", typeof(RectTransform), typeof(Image), typeof(ScrollRect), typeof(RectMask2D));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = size; rt.anchoredPosition = pos;
        go.GetComponent<Image>().color = new Color(0, 0, 0, 0.25f);

        var content = new GameObject("Content", typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
        content.transform.SetParent(go.transform, false);
        var crt = content.GetComponent<RectTransform>();
        crt.anchorMin = new Vector2(0, 1); crt.anchorMax = new Vector2(1, 1); crt.pivot = new Vector2(0.5f, 1);
        var vlg = content.GetComponent<VerticalLayoutGroup>();
        vlg.padding = new RectOffset(10, 10, 10, 10); vlg.spacing = 6;
        vlg.childControlWidth = true; vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
        content.GetComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        var sr = go.GetComponent<ScrollRect>();
        sr.content = crt; sr.viewport = rt; sr.horizontal = false;
        return new ScrollCreation { scroll = sr, content = crt };
    }

    static GameObject CreateMatchRowPrefab()
    {
        const string path = "Assets/Prefabs/MatchRow.prefab";
        var go = new GameObject("MatchRow", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
        go.GetComponent<LayoutElement>().preferredHeight = 100;
        go.GetComponent<Image>().color = PANEL;
        var labelGO = new GameObject("Label", typeof(RectTransform));
        labelGO.transform.SetParent(go.transform, false);
        var lrt = labelGO.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one; lrt.offsetMin = new Vector2(20, 0); lrt.offsetMax = new Vector2(-20, 0);
        var t = labelGO.AddComponent<TextMeshProUGUI>();
        t.text = "..."; t.fontSize = 40; t.color = TEXT_LIGHT; t.alignment = TextAlignmentOptions.MidlineLeft;
        PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return AssetDatabase.LoadAssetAtPath<GameObject>(path);
    }

    static GameObject CreateChatBubblePrefab()
    {
        const string path = "Assets/Prefabs/ChatBubble.prefab";
        var go = new GameObject("ChatBubble", typeof(RectTransform), typeof(LayoutElement));
        go.GetComponent<LayoutElement>().preferredHeight = 60;
        var t = go.AddComponent<TextMeshProUGUI>();
        t.text = "..."; t.fontSize = 32; t.color = TEXT_LIGHT;
        t.enableWordWrapping = true; t.alignment = TextAlignmentOptions.Left;
        PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return AssetDatabase.LoadAssetAtPath<GameObject>(path);
    }
}
#endif
