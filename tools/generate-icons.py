"""生成 Unote 的 Android 图标与启动图。

设计：珊瑚红底 + 奶油色「u.」标记。只依赖 Pillow，可重复运行。

用法： python tools/generate-icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android/app/src/main/res"

CORAL = (250, 83, 45, 255)  # #fa532d
CREAM = (255, 239, 229, 255)  # #ffefe5

FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")
FONT_FALLBACK = Path("C:/Windows/Fonts/arialbd.ttf")

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def _font(size: int) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if FONT_BOLD.exists() else FONT_FALLBACK
    return ImageFont.truetype(str(path), size)


def draw_mark(canvas: Image.Image, box: tuple[float, float, float, float], color) -> None:
    """在给定方框里居中画「u.」；box = (x, y, w, h)。"""
    x, y, w, h = box
    draw = ImageDraw.Draw(canvas)
    font_size = int(h * 0.92)
    font = _font(font_size)

    # 「u」略微左移，给右下角的点留位置
    glyph_cx = x + w * 0.44
    glyph_cy = y + h * 0.46
    draw.text((glyph_cx, glyph_cy), "u", font=font, fill=color, anchor="mm")

    radius = max(1.5, w * 0.055)
    dot_cx = x + w * 0.74
    dot_cy = y + h * 0.72
    draw.ellipse(
        [dot_cx - radius, dot_cy - radius, dot_cx + radius, dot_cy + radius],
        fill=color,
    )


def legacy_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), CORAL)
    draw = ImageDraw.Draw(image)
    # 轻微圆角，老系统直接显示时也不至于太方
    radius = int(size * 0.22)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    image.putalpha(mask)
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, size - 1, size - 1], fill=CORAL)
    image.putalpha(mask)
    draw_mark(image, (size * 0.16, size * 0.14, size * 0.68, size * 0.68), CREAM)
    return image


def adaptive_foreground(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # 安全区：中心 66/108
    safe = size * 66 / 108
    offset = (size - safe) / 2
    draw_mark(image, (offset, offset + safe * 0.04, safe, safe * 0.9), CREAM)
    return image


def splash(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, CREAM)
    side = min(size) * 0.32
    draw_mark(
        image,
        ((size[0] - side) / 2, (size[1] - side) / 2, side, side),
        CORAL,
    )
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

    preview = legacy_icon(512)
    (ROOT / "design").mkdir(exist_ok=True)
    preview.save(ROOT / "design" / "icon-preview.png")
    print("icons written")


if __name__ == "__main__":
    main()
