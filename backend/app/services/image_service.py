"""
Image Service - Fetches topic-specific images for cinematic video backgrounds.

Source priority:
  1. Unsplash (free napi, no key needed) — real high-quality photos
  2. Pollinations.ai (free AI generation) — AI-rendered images
  3. Offline gradient + bokeh fallback
"""

import io
import random
import logging
import urllib.parse
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger(__name__)

_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"

# Beautiful gradient presets: (top_color, bottom_color)
GRADIENT_PRESETS = [
    ((20, 20, 50), (220, 60, 90)),
    ((10, 35, 80), (0, 190, 230)),
    ((45, 20, 95), (230, 95, 95)),
    ((15, 25, 55), (85, 175, 230)),
    ((30, 5, 50), (190, 45, 135)),
    ((5, 30, 40), (0, 200, 140)),
    ((40, 10, 10), (240, 150, 50)),
    ((10, 10, 40), (80, 60, 200)),
]


# ── Topic extraction ──────────────────────────────────────────────


def extract_topic(question: str) -> str:
    """Extract the main topic noun/phrase from a question."""
    q = question.lower().strip().rstrip("?!.")
    for prefix in [
        "what is a ", "what is an ", "what is the ", "what is ",
        "what are ", "who is ", "who was ", "who are ",
        "how does ", "how do ", "how is ", "how are ",
        "why is ", "why do ", "why are ",
        "explain ", "describe ", "tell me about ",
        "define ", "show me ", "teach me about ",
    ]:
        if q.startswith(prefix):
            return q[len(prefix):].strip()
    return q


# ── Unsplash (primary) ───────────────────────────────────────────


def _search_unsplash(topic: str, count: int = 10) -> List[str]:
    """
    Search Unsplash napi for topic-related photo URLs (no API key needed).
    Returns a list of 'regular' quality URLs.
    """
    try:
        url = (
            f"https://unsplash.com/napi/search/photos"
            f"?query={urllib.parse.quote(topic)}"
            f"&per_page={count}"
        )
        resp = requests.get(url, headers={"User-Agent": _UA}, timeout=12)
        if resp.status_code != 200:
            logger.warning(f"Unsplash search: status {resp.status_code}")
            return []
        data = resp.json()
        results = data.get("results", [])
        urls = []
        for r in results:
            u = r.get("urls", {}).get("regular")
            if u:
                urls.append(u)
        logger.info(f"Unsplash: found {len(urls)} images for '{topic}'")
        return urls
    except Exception as e:
        logger.warning(f"Unsplash search failed: {e}")
        return []


def _download_image(
    url: str, width: int, height: int, timeout: int = 20,
) -> Optional[Image.Image]:
    """Download an image URL and resize/crop to target dimensions."""
    try:
        resp = requests.get(
            url, headers={"User-Agent": _UA},
            timeout=timeout, allow_redirects=True,
        )
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "image" in ct and len(resp.content) > 2000:
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            return resize_crop(img, width, height)
    except Exception as e:
        logger.warning(f"  Download failed: {e}")
    return None


# ── Pollinations.ai (secondary) ──────────────────────────────────


def fetch_ai_image(
    prompt: str, width: int = 720, height: int = 1280, timeout: int = 45,
) -> Optional[Image.Image]:
    """Fetch an AI-generated image from Pollinations.ai (free, zero API keys)."""
    try:
        encoded = urllib.parse.quote(prompt)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width={width}&height={height}&nologo=true"
            f"&seed={random.randint(1, 99999)}"
        )
        logger.info(f"  Pollinations fetch: {prompt[:55]}...")
        session = requests.Session()
        resp = session.get(url, timeout=timeout, allow_redirects=True)
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and len(resp.content) > 5000 and "image" in ct:
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            if img.size != (width, height):
                img = resize_crop(img, width, height)
            logger.info("  Pollinations image OK")
            return img
        logger.warning(
            f"  Pollinations skip: status={resp.status_code}, "
            f"size={len(resp.content)}, ct={ct}"
        )
    except Exception as e:
        logger.warning(f"  Pollinations failed: {e}")
    return None


# ── Helpers ───────────────────────────────────────────────────────


def resize_crop(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Resize to fill target area, then center-crop to exact dimensions."""
    ratio = max(tw / img.width, th / img.height)
    nw = max(int(img.width * ratio), tw)
    nh = max(int(img.height * ratio), th)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return img.crop((left, top, left + tw, top + th))


def create_fallback_image(
    topic: str, width: int, height: int, variant: int = 0,
) -> Image.Image:
    """Create a visually rich gradient image with bokeh + glow (offline)."""
    c1, c2 = GRADIENT_PRESETS[variant % len(GRADIENT_PRESETS)]
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Smooth vertical gradient
    for y in range(height):
        r = y / height
        color = tuple(int(c1[i] + (c2[i] - c1[i]) * r) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)

    base = img.convert("RGBA")

    # Bokeh circles for depth
    rng = random.Random(hash(topic) + variant)
    for _ in range(15):
        cx, cy = rng.randint(0, width), rng.randint(0, height)
        cr = rng.randint(30, 140)
        alpha = rng.randint(15, 50)
        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse(
            [(cx - cr, cy - cr), (cx + cr, cy + cr)],
            fill=(*c2, alpha),
        )
        layer = layer.filter(ImageFilter.GaussianBlur(cr // 3))
        base = Image.alpha_composite(base, layer)

    # Center glow spot
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gx, gy = width // 2, height // 3
    for r in range(280, 0, -4):
        a = int(20 * (1 - r / 280))
        gd.ellipse([(gx - r, gy - r), (gx + r, gy + r)], fill=(*c2, a))
    base = Image.alpha_composite(base, glow)

    return base.convert("RGB")


# ── Main entry point ─────────────────────────────────────────────


def get_topic_images(
    question: str,
    segments: List[str],
    width: int = 720,
    height: int = 1280,
) -> List[Image.Image]:
    """
    Get images for each video segment.
    Priority: Unsplash → Pollinations.ai → gradient fallback.
    """
    needed = 1 + len(segments[:5])  # title + content slides
    topic = extract_topic(question)
    images: List[Optional[Image.Image]] = [None] * needed

    logger.info(f"Fetching {needed} images for topic '{topic}'...")

    # ── 1. Try Unsplash (fast, reliable, no key) ──
    unsplash_urls = _search_unsplash(topic, count=needed + 4)
    if unsplash_urls:
        random.shuffle(unsplash_urls)  # vary across runs
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {}
            for i in range(min(needed, len(unsplash_urls))):
                futures[pool.submit(_download_image, unsplash_urls[i], width, height)] = i
            for fut in as_completed(futures, timeout=30):
                idx = futures[fut]
                try:
                    result = fut.result(timeout=10)
                    if result is not None:
                        images[idx] = result
                except Exception:
                    pass

    fetched = sum(1 for img in images if img is not None)
    logger.info(f"Unsplash images: {fetched}/{needed} succeeded")

    # ── 2. Pollinations.ai for remaining gaps ──
    gaps = [i for i in range(needed) if images[i] is None]
    if gaps:
        prompts = _make_prompts(topic, segments)
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = {}
            for i in gaps:
                if i < len(prompts):
                    futures[pool.submit(fetch_ai_image, prompts[i], width, height)] = i
            for fut in as_completed(futures, timeout=60):
                idx = futures[fut]
                try:
                    result = fut.result(timeout=5)
                    if result is not None:
                        images[idx] = result
                except Exception:
                    pass
        fetched2 = sum(1 for img in images if img is not None) - fetched
        logger.info(f"Pollinations images: {fetched2} additional")

    # ── 3. Fill remaining with gradient fallback ──
    for i in range(needed):
        if images[i] is None:
            images[i] = create_fallback_image(topic, width, height, variant=i)

    total = sum(1 for img in images if img is not None)
    logger.info(f"Final images: {total}/{needed} ready")

    return images  # type: ignore


def _make_prompts(topic: str, segments: List[str]) -> List[str]:
    """Create AI image prompts for Pollinations fallback."""
    prompts = [
        f"3D cinematic render of {topic}, vibrant colors, "
        f"studio lighting, dark background, highly detailed, 8k"
    ]
    for seg in segments[:5]:
        context = seg[:80].strip()
        prompts.append(
            f"3D illustration of {topic}, showing: {context}, "
            f"cinematic lighting, vivid colors, professional"
        )
    return prompts
