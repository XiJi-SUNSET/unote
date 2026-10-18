"""生成 Unote 的 Android 图标与启动图。

构图（按草图提炼）：奶油底 + 珊瑚色飞溅点 + 一支斜笔触 + 底部青蓝水波。
只依赖 Pillow，可重复运行： python tools/generate-icons.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android/app/src/main/res"

CREAM = (255, 243, 234, 255)  # #fff3ea
CORAL = (250, 83, 45, 255)  # #fa532d
CYAN = (86, 223, 227, 255)  # #56dfe3
TEAL = (51, 169, 201, 255)  # #33a9c9
DEEP = (30, 127, 166, 255)  # #1e7fa6

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}

# 飞溅点：(x, y, 半径)，全部按 0..1 归一化
DOTS = [
    (0.16, 0.14, 0.017),
    (0.31, 0.11, 0.013),
    (0.47, 0.09, 0.011),
    (0.62, 0.12, 0.015),
    (0.76, 0.09, 0.010),
    (0.10, 0.26, 0.012),
    (0.25, 0.30, 0.010),
    (0.72, 0.26, 0.013),
    (0.86, 0.21, 0.009),
    (0.44, 0.24, 0.008),
]


def draw_art(canvas: Image.Image, scale: float = 1.0, compact: bool = False) -> None:
    """把整幅插画画在 canvas 上；scale 控制内容占比（自适应图标要留安全区）。

    水波永远铺满整张画布（否则会被裁成方块），飞溅点和笔触落在中间的安全区里。
    """
    w, h = canvas.size
    draw = ImageDraw.Draw(canvas)

    ox = (w - w * scale) / 2
    oy = (h - h * scale) / 2
    sw, sh = w * scale, h * scale

    def pt(x: float, y: float) -> tuple[float, float]:
        return (ox + x * sw, oy + y * sh)

    # 飞溅点（小尺寸下太细的点会糊成一团，直接省略）
    for dx, dy, dr in DOTS:
        if compact and dr < 0.011:
            continue
        cx, cy = pt(dx, dy)
        r = dr * sw * (1.25 if compact else 1.0)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CORAL)

    # 水波：铺满画布宽度，先画最上面那层，再往下一层层盖住
    waves = [
        (0.60, 0.034, 0.4, CYAN),
        (0.70, 0.030, 2.6, TEAL),
        (0.79, 0.028, 1.2, DEEP),
    ]
    for base, amp, phase, color in waves:
        steps = 48
        points = [(0, h)]
        for i in range(steps + 1):
            x = w * i / steps
            y = oy + sh * base + sh * amp * math.sin((i / steps) * math.pi * 2.7 + phase)
            points.append((x, y))
        points.append((w, h))
        draw.polygon(points, fill=color)

    # 斜笔触：沿轴心一路画圆，半径从尾部到笔尖递减，得到自然的收锋
    tail = pt(0.625, 0.725)
    tip = pt(0.420, 0.315)
    base_radius = sw * 0.052 * (1.15 if compact else 1.0)
    steps = 72
    for i in range(steps + 1):
        t = i / steps
        cx = tail[0] + (tip[0] - tail[0]) * t
        cy = tail[1] + (tip[1] - tail[1]) * t
        r = base_radius * (1 - t) ** 0.62 + sw * 0.004
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CORAL)


def legacy_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), CREAM)
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
    # 安全区是 66/108，内容缩到 0.80，水波和笔触都留在里面
    draw_art(image, scale=0.80)
    return image


def splash(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, CREAM)
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

    # 圆形遮罩预览，模拟真实启动器
    preview = adaptive_foreground(512)
    circle = Image.new("L", (512, 512), 0)
    ImageDraw.Draw(circle).ellipse([0, 0, 511, 511], fill=255)
    masked = Image.new("RGBA", (512, 512), CREAM)
    masked.paste(preview, (0, 0), circle)
    masked.save(design / "icon-preview-circle.png")
    print("icons written")


if __name__ == "__main__":
    main()
