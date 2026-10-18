"""生成 Unote 的 Android 图标与启动图。

构图：奶油色点阵纸 + 一支珊瑚色荧光笔 + 右下角漫上来的海浪。
只依赖 Pillow，可重复运行： python tools/generate-icons.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android/app/src/main/res"

PAPER = (255, 243, 234, 255)  # #fff3ea
DOT = (250, 150, 122, 255)  # 点阵比主色浅，让笔更跳出来
CORAL = (250, 83, 45, 255)  # #fa532d
CORAL_DARK = (208, 58, 28, 255)
CYAN = (86, 223, 227, 255)  # #56dfe3
TEAL = (51, 169, 201, 255)  # #33a9c9
DEEP = (30, 127, 166, 255)  # #1e7fa6

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def draw_art(canvas: Image.Image, scale: float = 1.0, compact: bool = False) -> None:
    """点阵纸铺满整张画布；笔和水波落在中间的安全区里。"""
    w, h = canvas.size
    draw = ImageDraw.Draw(canvas)

    ox = (w - w * scale) / 2
    oy = (h - h * scale) / 2
    sw, sh = w * scale, h * scale

    # 点阵纸：等距网格，铺满整张纸
    step = w * (0.168 if compact else 0.105)
    radius = w * (0.013 if compact else 0.0075)
    y = step * 0.62
    row = 0
    while y < h * 0.94:
        x = step * (0.62 if row % 2 else 0.38)
        while x < w * 0.96:
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=DOT)
            x += step
        y += step
        row += 1

    # 海浪：从右下角斜着漫上来，三层
    def water(offset: float, amp: float, phase: float, color):
        points = []
        steps = 56
        lift = -0.06 if compact else 0.0
        for i in range(steps + 1):
            t = i / steps
            x = (0.20 + 0.80 * t) * w
            base = 1.06 - 0.52 * t + offset + lift
            y = (base + amp * math.sin(t * math.pi * 2.2 + phase)) * h
            points.append((x, y))
        points.append((w, h))
        points.append((0.20 * w, h))
        draw.polygon(points, fill=color)

    water(0.00, 0.030, 0.6, CYAN)
    water(0.085, 0.028, 2.2, TEAL)
    water(0.175, 0.026, 1.1, DEEP)

    # 荧光笔：尾巴圆钝，笔尖收成一个点
    tail = (ox + 0.635 * sw, oy + 0.745 * sh)
    tip = (ox + 0.415 * sw, oy + 0.245 * sh)
    body = sw * (0.056 if compact else 0.040)
    steps = 80
    for i in range(steps + 1):
        t = i / steps
        cx = tail[0] + (tip[0] - tail[0]) * t
        cy = tail[1] + (tip[1] - tail[1]) * t
        # 前 15% 是笔帽，略粗；之后等宽；最后 20% 收锋
        if t < 0.15:
            r = body * 1.06
        else:
            k = max(0.0, (t - 0.78) / 0.22)
            r = body * (1 - k) ** 0.85 + sw * 0.004
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CORAL)

    # 笔帽的一道深色环，让"笔"这个身份更明确
    if not compact:
        cap = (tail[0] + (tip[0] - tail[0]) * 0.13, tail[1] + (tip[1] - tail[1]) * 0.13)
        dx = (tip[0] - tail[0]) / math.hypot(tip[0] - tail[0], tip[1] - tail[1])
        dy = (tip[1] - tail[1]) / math.hypot(tip[0] - tail[0], tip[1] - tail[1])
        nx, ny = -dy, dx
        band = body * 1.02
        draw.line(
            [
                (cap[0] - nx * band, cap[1] - ny * band),
                (cap[0] + nx * band, cap[1] + ny * band),
            ],
            fill=CORAL_DARK,
            width=max(1, int(sw * 0.012)),
        )


def legacy_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), PAPER)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * 0.222), fill=255
    )
    image.putalpha(mask)
    draw_art(image, scale=0.98, compact=size <= 72)
    image.putalpha(mask)
    return image


def adaptive_foreground(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_art(image, scale=0.80, compact=size <= 162)
    return image


def splash(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, PAPER)
    side = min(size) * 0.46
    art = Image.new("RGBA", (int(side), int(side)), (0, 0, 0, 0))
    draw_art(art, scale=1.0)
    image.alpha_composite(art, (int((size[0] - side) / 2), int((size[1] - side) / 2)))
    return image


def main() -> None:
    for density, scale in DENSITIES.items():
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)

        icon_size = int(48 * scale)
        legacy_icon(icon_size).save(folder / "ic_launcher.png")
        legacy_icon(icon_size).save(folder / "ic_launcher_round.png")

        fg_size = int(108 * scale)
        adaptive_foreground(fg_size).save(folder / "ic_launcher_foreground.png")

    for splash_dir in sorted(RES.glob("drawable*")):
        target = splash_dir / "splash.png"
        if not target.exists():
            continue
        with Image.open(target) as existing:
            size = existing.size
        splash(size).save(target)

    design = ROOT / "design"
    design.mkdir(exist_ok=True)
    legacy_icon(512).save(design / "icon-preview.png")
    print("icons written")


if __name__ == "__main__":
    main()
