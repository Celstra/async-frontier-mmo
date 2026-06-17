#!/usr/bin/env python3
"""Convert baked checkerboard PNGs to true alpha, crop, and trim grey fringe."""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def is_bg_pixel(r: int, g: int, b: int) -> bool:
    spread = max(r, g, b) - min(r, g, b)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    return spread <= 20 and lum >= 185


def prepare_png(path: Path) -> tuple[int, int]:
    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size

    visited = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg_pixel(*px[x, y][:3]):
                queue.append((x, y))
                visited[y][x] = True

    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x] and is_bg_pixel(*px[x, y][:3]):
                queue.append((x, y))
                visited[y][x] = True

    while queue:
        x, y = queue.popleft()
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_bg_pixel(*px[nx, ny][:3]):
                visited[ny][nx] = True
                queue.append((nx, ny))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and is_bg_pixel(r, g, b):
                px[x, y] = (r, g, b, 0)

    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        pad = 4
        l = max(0, bbox[0] - pad)
        t = max(0, bbox[1] - pad)
        r = min(w, bbox[2] + pad)
        b = min(h, bbox[3] + pad)
        img = img.crop((l, t, r, b))

    alpha = img.split()[-1]
    for _ in range(2):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    img.putalpha(alpha)

    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            spread = max(r, g, b) - min(r, g, b)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if a < 220 or (spread < 25 and 120 < lum < 245):
                px[x, y] = (r, g, b, 0)

    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        pad = 2
        img = img.crop(
            (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(w, bbox[2] + pad),
                min(h, bbox[3] + pad),
            )
        )

    img.save(path, optimize=True)
    return img.size


def main() -> int:
    targets = [Path(arg) for arg in sys.argv[1:]]
    if not targets:
        print("usage: prepare-pixel-art-alpha.py <png> [...]", file=sys.stderr)
        return 1

    for path in targets:
        size = prepare_png(path)
        print(f"{path}: {size[0]}x{size[1]} RGBA")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
