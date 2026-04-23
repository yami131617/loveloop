#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

public static class BuildScript
{
    public static void BuildWindows()
    {
        var scenes = new System.Collections.Generic.List<string>();
        foreach (var s in EditorBuildSettings.scenes) if (s.enabled) scenes.Add(s.path);
        System.IO.Directory.CreateDirectory("../builds/Windows");
        PlayerSettings.productName = "LoveLoop";
        PlayerSettings.companyName = "yami";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Standalone, "com.yami.loveloop");

        var opts = new BuildPlayerOptions {
            scenes = scenes.ToArray(),
            locationPathName = "../builds/Windows/LoveLoop.exe",
            target = BuildTarget.StandaloneWindows64
        };
        var r = BuildPipeline.BuildPlayer(opts);
        Debug.Log("[Build] " + r.summary.result);
        EditorApplication.Exit(r.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 1);
    }

    public static void BuildAndroid()
    {
        var scenes = new System.Collections.Generic.List<string>();
        foreach (var s in EditorBuildSettings.scenes) if (s.enabled) scenes.Add(s.path);
        System.IO.Directory.CreateDirectory("../builds");
        PlayerSettings.productName = "LoveLoop";
        PlayerSettings.companyName = "yami";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.yami.loveloop");
        EditorUserBuildSettings.buildAppBundle = false;
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);

        var opts = new BuildPlayerOptions {
            scenes = scenes.ToArray(),
            locationPathName = "../builds/LoveLoop.apk",
            target = BuildTarget.Android
        };
        var r = BuildPipeline.BuildPlayer(opts);
        Debug.Log("[Build] " + r.summary.result);
        EditorApplication.Exit(r.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 1);
    }
}
#endif
