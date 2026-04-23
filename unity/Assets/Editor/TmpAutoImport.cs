#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

[InitializeOnLoad]
public static class TmpAutoImport
{
    static TmpAutoImport() { EditorApplication.delayCall += TryImport; }

    [MenuItem("LoveLoop/Import TMP Essentials")]
    public static void TryImport()
    {
        if (Directory.Exists("Assets/TextMesh Pro")) return;

        string pkgFile = null;
        var root = "Library/PackageCache";
        if (Directory.Exists(root))
        {
            foreach (var dir in Directory.GetDirectories(root))
            {
                if (!Path.GetFileName(dir).StartsWith("com.unity.ugui")) continue;
                var candidates = Directory.GetFiles(dir, "TMP Essential Resources.unitypackage", SearchOption.AllDirectories);
                if (candidates.Length > 0) { pkgFile = candidates[0]; break; }
            }
        }
        if (pkgFile == null) return;

        Debug.Log("[TmpAutoImport] Importing " + pkgFile);
        AssetDatabase.importPackageCompleted += name => Debug.Log("[TmpAutoImport] done: " + name);
        AssetDatabase.importPackageFailed += (name, err) => Debug.LogError("[TmpAutoImport] failed: " + name + " | " + err);
        AssetDatabase.ImportPackage(pkgFile, false);
    }
}
#endif
