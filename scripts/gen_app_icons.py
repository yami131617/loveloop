"""Generate PWA + Android + iOS app icons for LoveLoop."""
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_PWA = r"E:\app\loveloop\web\public\icons"
OUT_AND = r"E:\app\loveloop\web\public\icons"  # same, will be copied to android by capacitor later

os.makedirs(OUT_PWA, exist_ok=True)

def make_icon(size, mask=False):
    """Gen Z gradient heart icon.
    mask=True leaves a ~10% safe inset for Android maskable (adaptive) icons.
    """
    # Background gradient (diagonal pink -> purple)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Rounded square background with gradient
    bg = Image.new("RGB", (size, size), (0, 0, 0))
    bd = ImageDraw.Draw(bg)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            r = int(255 - (255 - 168) * t)
            g = int(76 + (107 - 76) * t)
            b = int(138 + (222 - 138) * t)
            bd.point((x, y), fill=(r, g, b))
    # Round corners
    mask_round = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask_round)
    radius = int(size * 0.22)
    md.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=255)
    bg_rgba = bg.convert("RGBA")
    bg_rgba.putalpha(mask_round)
    img = Image.alpha_composite(img, bg_rgba)

    # Sparkle background
    sd = ImageDraw.Draw(img)
    import random
    random.seed(42)
    safe_area = int(size * 0.9) if mask else size
    offset = (size - safe_area) // 2
    for _ in range(int(size * 0.04)):
        sx, sy = random.randint(offset, size - offset), random.randint(offset, size - offset)
        r = max(1, int(size * 0.005))
        sd.ellipse([sx-r, sy-r, sx+r, sy+r], fill=(255, 255, 255, 160))

    # Draw a big heart in the center (mask-safe)
    cx, cy = size // 2, int(size * 0.52)
    heart_size = int(size * 0.42) if mask else int(size * 0.55)
    heart_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(heart_layer)
    r = heart_size // 2
    # Two circles
    hd.ellipse([cx - r*1.1, cy - r*0.9, cx - r*0.1, cy + r*0.1], fill=(255, 255, 255, 255))
    hd.ellipse([cx + r*0.1, cy - r*0.9, cx + r*1.1, cy + r*0.1], fill=(255, 255, 255, 255))
    hd.polygon([
        (cx - r*1.1, cy - r*0.1),
        (cx + r*1.1, cy - r*0.1),
        (cx, cy + r*0.95),
    ], fill=(255, 255, 255, 255))
    # Soft shadow behind heart
    shadow = heart_layer.filter(ImageFilter.GaussianBlur(int(size * 0.02)))
    img = Image.alpha_composite(img, shadow)
    img = Image.alpha_composite(img, heart_layer)

    # Small highlight on heart
    hl_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl_layer)
    hld.ellipse([cx - r*0.6, cy - r*0.75, cx - r*0.2, cy - r*0.45], fill=(255, 255, 255, 100))
    img = Image.alpha_composite(img, hl_layer)

    return img

# Standard PWA icons
for size in [72, 96, 128, 144, 152, 180, 192, 256, 384, 512]:
    icon = make_icon(size)
    icon.save(os.path.join(OUT_PWA, f"icon-{size}.png"))
    print(f"  icon-{size}.png")

# Maskable (Android adaptive) — larger safe zone
for size in [192, 512]:
    icon = make_icon(size, mask=True)
    icon.save(os.path.join(OUT_PWA, f"icon-maskable-{size}.png"))
    print(f"  icon-maskable-{size}.png")

# Apple touch icon
apple = make_icon(180)
apple.save(os.path.join(OUT_PWA, "apple-touch-icon.png"))
print("  apple-touch-icon.png")

# Favicon
for size in [16, 32, 48]:
    fv = make_icon(size)
    fv.save(os.path.join(OUT_PWA, f"favicon-{size}.png"))
# multi-res ico
ico = make_icon(48)
ico.save(r"E:\app\loveloop\web\public\favicon.ico", sizes=[(16,16),(32,32),(48,48)])
print("  favicon.ico")

# Splash screen (for iOS PWA, 1242x2688)
splash = Image.new("RGBA", (1242, 2688), (0, 0, 0, 0))
# gradient
sd = ImageDraw.Draw(splash)
for y in range(2688):
    t = y / 2688
    r = int(26 + (80 - 26) * t)
    g = int(14 + (56 - 14) * t)
    b = int(46 + (143 - 46) * t)
    sd.line([(0, y), (1242, y)], fill=(r, g, b, 255))
# center icon
center_icon = make_icon(512)
splash.paste(center_icon, ((1242 - 512) // 2, (2688 - 512) // 2), center_icon)
splash.save(os.path.join(OUT_PWA, "splash.png"))
print("  splash.png")

print("Done. Icons in", OUT_PWA)
