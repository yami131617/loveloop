"""Gen Z themed sprites for LOVELOOP.
- Gradient backgrounds (pink → purple → blue)
- Rounded button pills (multiple colors)
- Cute heart/sparkle sticker shapes
- Soft shadow cards
"""
import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter

OUT = r"E:\app\loveloop\unity\Assets\Sprites"
os.makedirs(OUT, exist_ok=True)

def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p, "PNG")
    print(f"Saved {p}")

def rounded_rect(size, radius, color):
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w-1, h-1], radius=radius, fill=color)
    return img

def soft_shadow(img, offset=(0, 8), blur=20, color=(0, 0, 0, 80)):
    """Return image with soft drop shadow behind."""
    w, h = img.size
    pad = blur * 2
    canvas = Image.new("RGBA", (w + pad*2, h + pad*2 + offset[1]), (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    # Use image alpha as mask for shadow
    sd = ImageDraw.Draw(shadow_layer)
    # Paste a solid-color version of alpha
    alpha = img.split()[-1]
    solid = Image.new("RGBA", img.size, color)
    shadow_layer.paste(solid, (pad + offset[0], pad + offset[1]), alpha)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    canvas.paste(img, (pad, pad), img)
    return canvas

def gradient_bg(size, colors, direction='vertical'):
    """Multi-stop gradient. colors = list of (r,g,b,a) stops."""
    w, h = size
    img = Image.new("RGBA", size, colors[0])
    d = ImageDraw.Draw(img)
    n_stops = len(colors)
    if direction == 'vertical':
        for y in range(h):
            t = y / (h - 1) * (n_stops - 1)
            i = int(t)
            frac = t - i
            if i >= n_stops - 1:
                c = colors[-1]
            else:
                c1, c2 = colors[i], colors[i+1]
                c = tuple(int(c1[k] + (c2[k] - c1[k]) * frac) for k in range(4))
            d.line([(0, y), (w, y)], fill=c)
    else:  # diagonal
        for y in range(h):
            for x in range(w):
                pass  # fallback
    return img

# ---- Main BG: diagonal gradient pink → purple → deep blue ----
BG_COLORS = [
    (255, 138, 195, 255),  # soft pink top
    (168, 107, 222, 255),  # lavender mid
    (80, 56, 143, 255),    # deep purple
    (35, 20, 75, 255),     # navy bottom
]
bg = gradient_bg((1080, 1920), BG_COLORS)
# Add sparkle particles
random.seed(42)
d = ImageDraw.Draw(bg)
for _ in range(80):
    x, y = random.randint(0, 1080), random.randint(0, 1920)
    r = random.randint(2, 6)
    alpha = random.randint(60, 180)
    d.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255, alpha))
# Blurry big orbs
orb_layer = Image.new("RGBA", bg.size, (0, 0, 0, 0))
od = ImageDraw.Draw(orb_layer)
od.ellipse([-200, 400, 400, 900], fill=(255, 180, 230, 80))
od.ellipse([700, 1200, 1300, 1700], fill=(180, 120, 255, 70))
od.ellipse([300, 100, 900, 500], fill=(255, 200, 255, 50))
orb_layer = orb_layer.filter(ImageFilter.GaussianBlur(100))
bg = Image.alpha_composite(bg, orb_layer)
save(bg, "Background.png")

# ---- Rounded card (for panels) ----
card = rounded_rect((900, 600), 40, (255, 255, 255, 25))
save(card, "Card.png")

# Big pill buttons (multiple colors)
for name, color in [
    ("BtnPink", (255, 76, 138, 255)),
    ("BtnPurple", (143, 92, 232, 255)),
    ("BtnBlue", (92, 164, 232, 255)),
    ("BtnMint", (100, 217, 180, 255)),
    ("BtnDark", (40, 28, 65, 255)),
]:
    btn = rounded_rect((500, 150), 75, color)
    # Subtle top gloss: a single soft-alpha ellipse, not stripes
    gloss = Image.new("RGBA", btn.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse([30, 12, 470, 70], fill=(255, 255, 255, 35))
    gloss = gloss.filter(ImageFilter.GaussianBlur(6))
    # Only apply gloss where button is solid (use btn alpha as mask)
    btn_alpha = btn.split()[-1]
    btn = Image.alpha_composite(btn, Image.composite(gloss, Image.new("RGBA", btn.size, (0,0,0,0)), btn_alpha))
    save(btn, f"{name}.png")

# Rounded input field (darker)
inp = rounded_rect((800, 120), 60, (30, 20, 55, 200))
# Subtle border
d = ImageDraw.Draw(inp)
d.rounded_rectangle([2, 2, 798, 118], radius=58, outline=(255, 255, 255, 40), width=2)
save(inp, "Input.png")

# ---- Heart sticker ----
def heart(size, color):
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = w // 2, h // 2
    # Two circles + triangle
    r = w // 4
    d.ellipse([cx - r - w//8, cy - r - h//12, cx - w//8 + r, cy + r - h//12], fill=color)
    d.ellipse([cx + w//8 - r, cy - r - h//12, cx + w//8 + r, cy + r - h//12], fill=color)
    d.polygon([(cx - r - w//8, cy - h//12 + r//3),
               (cx + r + w//8, cy - h//12 + r//3),
               (cx, cy + h//3)], fill=color)
    # Highlight
    d.ellipse([cx - r, cy - r - h//6, cx - r//2, cy - r//2 - h//6], fill=(255, 255, 255, 180))
    return img

h = heart((256, 256), (255, 76, 138, 255))
save(h, "Heart.png")

# Sparkle
def sparkle(size=128, color=(255, 217, 102, 255)):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = size // 2
    # 4-point star
    points = []
    for i in range(8):
        angle = math.pi * 2 * i / 8 - math.pi / 2
        radius = size // 2 - 8 if i % 2 == 0 else size // 6
        points.append((cx + radius * math.cos(angle), cx + radius * math.sin(angle)))
    d.polygon(points, fill=color)
    d.ellipse([cx-10, cx-10, cx+10, cx+10], fill=(255, 255, 255, 200))
    return img

save(sparkle(), "Sparkle.png")

# Avatar placeholder (circle with gradient)
def avatar(size=256):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # gradient inside circle
    g = gradient_bg((size, size), [(255, 146, 190, 255), (143, 92, 232, 255)])
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([4, 4, size-4, size-4], fill=255)
    img.paste(g, (0, 0), mask)
    # Emoji-ish face
    d = ImageDraw.Draw(img)
    d.ellipse([size//2 - 30, size//2 - 40, size//2 - 10, size//2 - 20], fill=(20, 20, 30, 255))
    d.ellipse([size//2 + 10, size//2 - 40, size//2 + 30, size//2 - 20], fill=(20, 20, 30, 255))
    d.arc([size//2 - 35, size//2, size//2 + 35, size//2 + 50], 0, 180,
          fill=(255, 255, 255, 200), width=4)
    return img

save(avatar(), "AvatarDefault.png")

# Chat bubble (mine - pink, other - white translucent)
mine_bubble = rounded_rect((600, 120), 50, (255, 76, 138, 255))
save(mine_bubble, "BubbleMine.png")
other_bubble = rounded_rect((600, 120), 50, (255, 255, 255, 40))
save(other_bubble, "BubbleOther.png")

# Top bar gradient
top_bar = gradient_bg((1080, 180), [(255, 138, 195, 255), (168, 107, 222, 255)], 'vertical')
save(top_bar, "TopBar.png")

print("Gen Z sprites done.")
