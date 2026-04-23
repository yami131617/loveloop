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

    // Gen Z palette
    static Color TEXT_LIGHT = HexColor("#ffffff");
    static Color TEXT_MUTED = HexColor("#e0d0ff");
    static Color TEXT_ACCENT = HexColor("#ff6aa6");

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
                }
            }
        };
    }

    [MenuItem("LoveLoop/Create Main Scene")]
    public static void CreateMainScene()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Scenes")) AssetDatabase.CreateFolder("Assets", "Scenes");
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs")) AssetDatabase.CreateFolder("Assets", "Prefabs");
        AssetDatabase.Refresh();

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

        // Load sprites
        var spriteBg = LoadSprite("Background");
        var spriteCard = LoadSprite("Card");
        var spriteBtnPink = LoadSprite("BtnPink");
        var spriteBtnPurple = LoadSprite("BtnPurple");
        var spriteBtnBlue = LoadSprite("BtnBlue");
        var spriteBtnMint = LoadSprite("BtnMint");
        var spriteBtnDark = LoadSprite("BtnDark");
        var spriteInput = LoadSprite("Input");
        var spriteHeart = LoadSprite("Heart");
        var spriteSparkle = LoadSprite("Sparkle");
        var spriteAvatar = LoadSprite("AvatarDefault");
        var spriteBubbleMine = LoadSprite("BubbleMine");
        var spriteBubbleOther = LoadSprite("BubbleOther");
        var spriteTopBar = LoadSprite("TopBar");

        // BG
        var bg = CreateImage(canvasGO.transform, "Background", spriteBg);
        FullScreen(bg.rectTransform);

        // Top bar
        var topBar = CreateImage(canvasGO.transform, "TopBar", spriteTopBar);
        var tbRT = topBar.rectTransform;
        tbRT.anchorMin = new Vector2(0, 1); tbRT.anchorMax = new Vector2(1, 1);
        tbRT.pivot = new Vector2(0.5f, 1);
        tbRT.sizeDelta = new Vector2(0, 180);
        tbRT.anchoredPosition = Vector2.zero;

        // Title "♥ LOVELOOP ♥"
        var title = CreateText(canvasGO.transform, "Title", "♥ LOVELOOP ♥", 72,
            new Vector2(0, 830), 1000, 140, TEXT_LIGHT, FontStyles.Bold);
        title.alignment = TextAlignmentOptions.Center;

        // Panels
        var loginPanel = CreatePanel(canvasGO.transform, "LoginPanel");
        var homePanel = CreatePanel(canvasGO.transform, "HomePanel"); homePanel.SetActive(false);
        var swipePanel = CreatePanel(canvasGO.transform, "SwipePanel"); swipePanel.SetActive(false);
        var matchesPanel = CreatePanel(canvasGO.transform, "MatchesPanel"); matchesPanel.SetActive(false);
        var chatPanel = CreatePanel(canvasGO.transform, "ChatPanel"); chatPanel.SetActive(false);

        // === LOGIN ===
        CreateText(loginPanel.transform, "Heading", "find your loop ♥", 56,
            new Vector2(0, 560), 900, 100, TEXT_LIGHT, FontStyles.Bold);
        CreateText(loginPanel.transform, "Sub", "match · chat · play · level up", 34,
            new Vector2(0, 490), 900, 60, TEXT_MUTED, FontStyles.Italic);

        var emailInput = CreateInput(loginPanel.transform, "EmailInput", "@  email",
            new Vector2(0, 340), new Vector2(900, 130), spriteInput);
        var passwordInput = CreateInput(loginPanel.transform, "PasswordInput", "●  password",
            new Vector2(0, 190), new Vector2(900, 130), spriteInput);
        passwordInput.contentType = TMP_InputField.ContentType.Password;
        var usernameInput = CreateInput(loginPanel.transform, "UsernameInput", "♥  username (for register)",
            new Vector2(0, 40), new Vector2(900, 130), spriteInput);

        var loginBtn = CreateButton(loginPanel.transform, "LoginBtn", "LOG IN ♥",
            new Vector2(-230, -130), new Vector2(420, 150), spriteBtnPink);
        var registerBtn = CreateButton(loginPanel.transform, "RegisterBtn", "JOIN ♥",
            new Vector2(230, -130), new Vector2(420, 150), spriteBtnPurple);
        var loginStatus = CreateText(loginPanel.transform, "LoginStatus", "", 30,
            new Vector2(0, -280), 900, 80, TEXT_MUTED, FontStyles.Italic);

        // === HOME ===
        // Avatar circle
        var avatarIcon = CreateImage(homePanel.transform, "Avatar", spriteAvatar);
        var avRT = avatarIcon.rectTransform;
        avRT.anchorMin = avRT.anchorMax = new Vector2(0.5f, 0.5f);
        avRT.pivot = new Vector2(0.5f, 0.5f);
        avRT.sizeDelta = new Vector2(250, 250);
        avRT.anchoredPosition = new Vector2(0, 550);

        var userLabel = CreateText(homePanel.transform, "UserLabel", "hey you!", 56,
            new Vector2(0, 380), 900, 100, TEXT_LIGHT, FontStyles.Bold);

        // Stats row
        var statsBg = CreateImage(homePanel.transform, "StatsCard", spriteCard);
        var sRT = statsBg.rectTransform;
        sRT.anchorMin = sRT.anchorMax = new Vector2(0.5f, 0.5f);
        sRT.pivot = new Vector2(0.5f, 0.5f);
        sRT.sizeDelta = new Vector2(900, 180);
        sRT.anchoredPosition = new Vector2(0, 250);
        statsBg.type = Image.Type.Sliced;

        var coinsLabel = CreateText(statsBg.transform, "CoinsLabel", "● 0", 42,
            new Vector2(-220, 0), 420, 80, HexColor("#ffd966"), FontStyles.Bold);
        var gemsLabel = CreateText(statsBg.transform, "GemsLabel", "♥ 0", 42,
            new Vector2(220, 0), 420, 80, HexColor("#88e5ff"), FontStyles.Bold);

        var swipeBtn = CreateButton(homePanel.transform, "GoToSwipeBtn", "♥  DISCOVER",
            new Vector2(0, 50), new Vector2(900, 160), spriteBtnPink);
        var matchesBtn = CreateButton(homePanel.transform, "GoToMatchesBtn", "♥  MATCHES",
            new Vector2(0, -140), new Vector2(900, 160), spriteBtnPurple);
        var logoutBtn = CreateButton(homePanel.transform, "LogoutBtn", "logout",
            new Vector2(0, -700), new Vector2(300, 90), spriteBtnDark);

        // === SWIPE ===
        var cardBox = CreateImage(swipePanel.transform, "Card", spriteCard);
        var cardRT = cardBox.rectTransform;
        cardRT.anchorMin = cardRT.anchorMax = new Vector2(0.5f, 0.5f);
        cardRT.pivot = new Vector2(0.5f, 0.5f);
        cardRT.sizeDelta = new Vector2(900, 1200);
        cardRT.anchoredPosition = new Vector2(0, 100);

        // Card avatar
        var cardAvatar = CreateImage(cardBox.transform, "CardAvatar", spriteAvatar);
        var caRT = cardAvatar.rectTransform;
        caRT.anchorMin = caRT.anchorMax = new Vector2(0.5f, 0.5f);
        caRT.pivot = new Vector2(0.5f, 0.5f);
        caRT.sizeDelta = new Vector2(400, 400);
        caRT.anchoredPosition = new Vector2(0, 300);

        var cardName = CreateText(cardBox.transform, "CardName", "Loading...", 56,
            new Vector2(0, 50), 820, 100, TEXT_LIGHT, FontStyles.Bold);
        var cardBio = CreateText(cardBox.transform, "CardBio", "", 34,
            new Vector2(0, -120), 820, 200, TEXT_LIGHT, FontStyles.Normal);
        cardBio.textWrappingMode = TextWrappingModes.Normal;
        var cardInterests = CreateText(cardBox.transform, "CardInterests", "", 28,
            new Vector2(0, -350), 820, 180, TEXT_ACCENT, FontStyles.Italic);
        cardInterests.textWrappingMode = TextWrappingModes.Normal;

        var dislikeBtn = CreateButton(swipePanel.transform, "DislikeBtn", "X",
            new Vector2(-260, -730), new Vector2(200, 200), spriteBtnDark);
        var likeBtn = CreateButton(swipePanel.transform, "LikeBtn", "♥",
            new Vector2(260, -730), new Vector2(200, 200), spriteBtnPink);
        // Make button label larger for emoji
        MakeLabelLarger(likeBtn.gameObject, 90);
        MakeLabelLarger(dislikeBtn.gameObject, 70);

        var swipeStatus = CreateText(swipePanel.transform, "SwipeStatus", "", 30,
            new Vector2(0, -570), 900, 60, TEXT_LIGHT, FontStyles.Bold);
        var backFromSwipe = CreateButton(swipePanel.transform, "BackFromSwipe", "← back",
            new Vector2(-420, 800), new Vector2(220, 90), spriteBtnDark);

        // === MATCHES ===
        CreateText(matchesPanel.transform, "Heading", "♥ Your Matches", 56,
            new Vector2(0, 720), 900, 100, TEXT_LIGHT, FontStyles.Bold);
        var matchesScroll = CreateScroll(matchesPanel.transform, new Vector2(0, -40), new Vector2(960, 1300));
        var matchRow = CreateMatchRowPrefab(spriteCard);
        var refreshBtn = CreateButton(matchesPanel.transform, "RefreshMatchesBtn", "new",
            new Vector2(330, 720), new Vector2(150, 100), spriteBtnPurple);
        MakeLabelLarger(refreshBtn.gameObject, 40);
        var backFromMatches = CreateButton(matchesPanel.transform, "BackFromMatches", "← back",
            new Vector2(-420, 800), new Vector2(220, 90), spriteBtnDark);

        // === CHAT ===
        var chatPartner = CreateText(chatPanel.transform, "ChatPartnerName", "Chat", 50,
            new Vector2(0, 720), 900, 100, TEXT_LIGHT, FontStyles.Bold);
        var chatScroll = CreateScroll(chatPanel.transform, new Vector2(0, -30), new Vector2(1000, 1280));
        var chatBubble = CreateChatBubblePrefab(spriteBubbleMine);
        var chatInput = CreateInput(chatPanel.transform, "ChatInput", "type something cute...",
            new Vector2(-140, -810), new Vector2(760, 110), spriteInput);
        var sendChatBtn = CreateButton(chatPanel.transform, "SendChatBtn", "SEND",
            new Vector2(380, -810), new Vector2(200, 110), spriteBtnPink);
        MakeLabelLarger(sendChatBtn.gameObject, 40);
        var backFromChat = CreateButton(chatPanel.transform, "BackFromChat", "← back",
            new Vector2(-420, 800), new Vector2(220, 90), spriteBtnDark);

        // UIController
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

        Camera.main.backgroundColor = HexColor("#1a0e2e");
        Camera.main.clearFlags = CameraClearFlags.SolidColor;

        EditorSceneManager.SaveScene(scene, SCENE_PATH);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(SCENE_PATH, true) };
        Debug.Log("[SceneSetup] LOVELOOP Gen Z UI ready");
    }

    // ---- helpers ----
    static Color HexColor(string hex) { ColorUtility.TryParseHtmlString(hex, out var c); return c; }
    static Sprite LoadSprite(string name) => AssetDatabase.LoadAssetAtPath<Sprite>($"Assets/Sprites/{name}.png");
    static TMP_FontAsset DefaultFont()
    {
        var f = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset");
        if (f == null) f = TMP_Settings.defaultFontAsset;
        return f;
    }

    static void FullScreen(RectTransform rt)
    {
        rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
        rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
    }

    static Image CreateImage(Transform parent, string name, Sprite sprite)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        var img = go.GetComponent<Image>();
        if (sprite != null) img.sprite = sprite;
        else img.color = new Color(1, 1, 1, 0.1f);
        return img;
    }

    static GameObject CreatePanel(Transform parent, string name)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(CanvasGroup));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
        rt.offsetMin = rt.offsetMax = Vector2.zero;
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
        var font = DefaultFont();
        if (font != null) t.font = font;
        t.text = text; t.fontSize = fontSize; t.color = color;
        t.fontStyle = style; t.alignment = TextAlignmentOptions.Center;
        t.richText = true;
        return t;
    }

    static Button CreateButton(Transform parent, string name, string label, Vector2 pos, Vector2 size, Sprite sprite)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = size;
        rt.anchoredPosition = pos;
        var img = go.GetComponent<Image>();
        if (sprite != null) img.sprite = sprite;
        else img.color = new Color(1, 0.3f, 0.55f, 1);

        var labelGO = new GameObject("Label", typeof(RectTransform));
        labelGO.transform.SetParent(go.transform, false);
        var lrt = labelGO.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one; lrt.sizeDelta = Vector2.zero;
        var t = labelGO.AddComponent<TextMeshProUGUI>();
        var font = DefaultFont();
        if (font != null) t.font = font;
        t.text = label; t.fontSize = 46; t.alignment = TextAlignmentOptions.Center;
        t.color = Color.white; t.fontStyle = FontStyles.Bold;
        return go.GetComponent<Button>();
    }

    static void MakeLabelLarger(GameObject btn, int size)
    {
        var t = btn.GetComponentInChildren<TextMeshProUGUI>();
        if (t) t.fontSize = size;
    }

    static TMP_InputField CreateInput(Transform parent, string name, string placeholder, Vector2 pos, Vector2 size, Sprite sprite)
    {
        var go = new GameObject(name, typeof(RectTransform), typeof(Image));
        go.transform.SetParent(parent, false);
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.sizeDelta = size; rt.anchoredPosition = pos;
        var bgImg = go.GetComponent<Image>();
        if (sprite != null) bgImg.sprite = sprite;
        else bgImg.color = new Color(1, 1, 1, 0.1f);

        var inp = go.AddComponent<TMP_InputField>();

        var textArea = new GameObject("TextArea", typeof(RectTransform), typeof(RectMask2D));
        textArea.transform.SetParent(go.transform, false);
        var taRT = textArea.GetComponent<RectTransform>();
        taRT.anchorMin = Vector2.zero; taRT.anchorMax = Vector2.one;
        taRT.offsetMin = new Vector2(40, 10); taRT.offsetMax = new Vector2(-40, -10);

        var textGO = new GameObject("Text", typeof(RectTransform));
        textGO.transform.SetParent(textArea.transform, false);
        var trt = textGO.GetComponent<RectTransform>();
        trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one; trt.offsetMin = trt.offsetMax = Vector2.zero;
        var textComp = textGO.AddComponent<TextMeshProUGUI>();
        var inputFont = DefaultFont();
        if (inputFont != null) textComp.font = inputFont;
        textComp.fontSize = 42; textComp.color = Color.white;
        textComp.alignment = TextAlignmentOptions.MidlineLeft;

        var placeholderGO = new GameObject("Placeholder", typeof(RectTransform));
        placeholderGO.transform.SetParent(textArea.transform, false);
        var prt = placeholderGO.GetComponent<RectTransform>();
        prt.anchorMin = Vector2.zero; prt.anchorMax = Vector2.one; prt.offsetMin = prt.offsetMax = Vector2.zero;
        var placeComp = placeholderGO.AddComponent<TextMeshProUGUI>();
        if (inputFont != null) placeComp.font = inputFont;
        placeComp.text = placeholder; placeComp.fontSize = 42;
        placeComp.color = HexColor("#c0b0e0"); placeComp.fontStyle = FontStyles.Italic;
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
        go.GetComponent<Image>().color = new Color(0, 0, 0, 0.2f);

        var content = new GameObject("Content", typeof(RectTransform), typeof(VerticalLayoutGroup), typeof(ContentSizeFitter));
        content.transform.SetParent(go.transform, false);
        var crt = content.GetComponent<RectTransform>();
        crt.anchorMin = new Vector2(0, 1); crt.anchorMax = new Vector2(1, 1); crt.pivot = new Vector2(0.5f, 1);
        var vlg = content.GetComponent<VerticalLayoutGroup>();
        vlg.padding = new RectOffset(15, 15, 15, 15); vlg.spacing = 12;
        vlg.childControlWidth = true; vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
        content.GetComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        var sr = go.GetComponent<ScrollRect>();
        sr.content = crt; sr.viewport = rt; sr.horizontal = false;
        return new ScrollCreation { scroll = sr, content = crt };
    }

    static GameObject CreateMatchRowPrefab(Sprite cardSprite)
    {
        const string path = "Assets/Prefabs/MatchRow.prefab";
        var go = new GameObject("MatchRow", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
        go.GetComponent<LayoutElement>().preferredHeight = 130;
        var img = go.GetComponent<Image>();
        if (cardSprite != null) img.sprite = cardSprite;
        else img.color = new Color(1, 1, 1, 0.15f);
        var labelGO = new GameObject("Label", typeof(RectTransform));
        labelGO.transform.SetParent(go.transform, false);
        var lrt = labelGO.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
        lrt.offsetMin = new Vector2(30, 0); lrt.offsetMax = new Vector2(-30, 0);
        var t = labelGO.AddComponent<TextMeshProUGUI>();
        var mrFont = DefaultFont();
        if (mrFont != null) t.font = mrFont;
        t.text = "..."; t.fontSize = 40; t.color = Color.white;
        t.alignment = TextAlignmentOptions.MidlineLeft;
        PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return AssetDatabase.LoadAssetAtPath<GameObject>(path);
    }

    static GameObject CreateChatBubblePrefab(Sprite bubbleSprite)
    {
        const string path = "Assets/Prefabs/ChatBubble.prefab";
        var go = new GameObject("ChatBubble", typeof(RectTransform), typeof(Image), typeof(LayoutElement));
        go.GetComponent<LayoutElement>().preferredHeight = 80;
        var img = go.GetComponent<Image>();
        if (bubbleSprite != null) img.sprite = bubbleSprite;
        else img.color = new Color(1, 0.3f, 0.55f, 1);

        var labelGO = new GameObject("Label", typeof(RectTransform));
        labelGO.transform.SetParent(go.transform, false);
        var lrt = labelGO.GetComponent<RectTransform>();
        lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
        lrt.offsetMin = new Vector2(25, 10); lrt.offsetMax = new Vector2(-25, -10);
        var t = labelGO.AddComponent<TextMeshProUGUI>();
        var cbFont = DefaultFont();
        if (cbFont != null) t.font = cbFont;
        t.text = "..."; t.fontSize = 32; t.color = Color.white;
        t.textWrappingMode = TextWrappingModes.Normal;
        t.alignment = TextAlignmentOptions.MidlineLeft;

        PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return AssetDatabase.LoadAssetAtPath<GameObject>(path);
    }
}
#endif
