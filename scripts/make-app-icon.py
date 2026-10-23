# 앱 아이콘·스플래시 이미지를 원화(assets/brand/app-icon-art.png)에서 만든다:
# 짙은 초록 바탕 + 크림색 냉장고 + 채소 그릇 + 반짝이.
#
#   python3 scripts/make-app-icon.py      (Pillow, numpy 필요)
#
# 만드는 파일 (assets/):
#   icon.png                      1024² 꽉 찬 정사각형 (iOS·스토어용, 모서리는 OS가 깎는다)
#   android-icon-foreground.png   적응형 아이콘 앞면. 가운데 안전 영역(지름 66/108) 안에만 그린다
#   android-icon-background.png   적응형 아이콘 바탕 (단색)
#   android-icon-monochrome.png   Android 13+ 테마 아이콘용 실루엣 (모노톤 원화에서)
#   splash-icon.png               스플래시 가운데 둥근 아이콘 (바깥 투명, 흰 배경 위에 놓인다)
#   favicon.png                   웹 파비콘 48²
#
# 원화는 둥근 사각형 안에 그려진 그림이라, 초록 바탕을 지워 그림만 떼어 낸 뒤 용도별로 다시 놓는다.

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
ART = ASSETS / 'brand' / 'app-icon-art.png'
# 테마 아이콘(한 가지 색)용 모노톤 원화. 잎·손잡이가 뚫리고 그릇이 냉장고와 떨어져 있다.
MONO_ART = ASSETS / 'brand' / 'app-icon-mono-art.png'

# 원화 바탕의 위·아래 색 (위가 조금 밝다). 가운데 색은 app.json의 적응형 아이콘·스플래시 배경과 같다.
TOP = (10, 92, 69)
BOTTOM = (3, 68, 53)
MID = (6, 80, 61)  # #06503D
S = 1024
# 그림이 차지하는 폭 (캔버스 대비). 아이콘은 둥근 사각형 안, 적응형은 가운데 안전 영역 안에서 여유 있게.
ICON_WIDTH = 0.74
ADAPTIVE_WIDTH = 0.48


def foreground(art: Image.Image) -> Image.Image:
    """초록 바탕(그림자 포함)을 투명하게 지운 RGBA. 잎처럼 밝은 초록은 남긴다."""
    a = np.asarray(art.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (r < 45) & (g < 115) & (b < 95) & (g > r + 25)
    mask = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    # 둥근 사각형 바깥의 흰 여백은 사각형 모양 마스크로 잘라 낸다 (냉장고의 크림색은 남는다)
    frame = Image.new('L', art.size, 0)
    ImageDraw.Draw(frame).rounded_rectangle((130, 126, 1124, 1126), radius=200, fill=255)
    mask = Image.fromarray(np.minimum(np.asarray(mask), np.asarray(frame)))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = art.convert('RGBA')
    out.putalpha(mask)
    return out.crop(out.getbbox())


def silhouette(mono_art: Image.Image) -> Image.Image:
    """테마 아이콘용 실루엣. 모노톤 원화(크림 바탕 + 짙은 초록 그림)에서 짙은 부분만 남긴다."""
    a = np.asarray(mono_art.convert('L')).astype(float)
    # 크림 바탕(밝음)은 투명, 짙은 초록은 불투명. 그 사이는 부드럽게.
    alpha = np.clip((215 - a) / (215 - 90), 0, 1) * 255
    out = Image.new('RGBA', mono_art.size, (255, 255, 255, 0))
    out.putalpha(Image.fromarray(alpha.astype(np.uint8)))
    return out.crop(out.getbbox())


def gradient() -> Image.Image:
    t = np.linspace(0, 1, S)[:, None, None]
    rows = (np.array(TOP) * (1 - t) + np.array(BOTTOM) * t).astype(np.uint8)
    return Image.fromarray(np.repeat(rows, S, axis=1), 'RGB')


def place(canvas: Image.Image, fg: Image.Image, width: float, cy: float = 0.5) -> Image.Image:
    """그림을 캔버스 폭의 width 비율로 줄여 가운데(세로는 cy)에 놓는다."""
    w = round(S * width)
    h = round(fg.height * w / fg.width)
    scaled = fg.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((S - w) // 2, round(S * cy - h / 2)))
    return canvas


def save(img: Image.Image, name: str, size: int = S) -> None:
    if size != S:
        img = img.resize((size, size), Image.LANCZOS)
    img.save(ASSETS / name, optimize=True)
    print(f'{name} ({size}²)')


art = Image.open(ART)
fg = foreground(art)

# 원화에서 그림이 둥근 사각형의 약 3/4을 차지한다 → 같은 비율로 꽉 찬 아이콘을 다시 만든다.
full = place(gradient().convert('RGBA'), fg, ICON_WIDTH)
save(full.convert('RGB'), 'icon.png')
save(full.convert('RGB'), 'favicon.png', 48)

# 적응형 아이콘은 원·물방울 등으로 잘려도 그림이 남도록 가운데 안전 영역에 맞춘다.
save(place(Image.new('RGBA', (S, S)), fg, ADAPTIVE_WIDTH), 'android-icon-foreground.png')
save(Image.new('RGB', (S, S), MID), 'android-icon-background.png')
save(place(Image.new('RGBA', (S, S)), silhouette(Image.open(MONO_ART)), ADAPTIVE_WIDTH), 'android-icon-monochrome.png', 432)

# 스플래시: 흰 배경 위 둥근 아이콘. 이어서 나오는 앱 인트로 화면도 흰 바탕이라 깜빡이지 않는다.
corner = Image.new('L', (S, S), 0)
ImageDraw.Draw(corner).rounded_rectangle((0, 0, S - 1, S - 1), radius=round(S * 0.225), fill=255)
splash = full.copy()
splash.putalpha(corner)
save(splash, 'splash-icon.png')
