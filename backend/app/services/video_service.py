"""
Video Generation Service — Cinematic AI Videos
Creates educational videos with AI-generated images, Ken Burns camera effects,
smooth crossfade transitions, TTS narration, and styled subtitles.
Fully FFmpeg-based (no moviepy).
"""

import os
import glob
import json
import math
import logging
import textwrap
import subprocess
from datetime import datetime
from typing import List

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from gtts import gTTS
from mutagen.mp3 import MP3

from app.config import settings
from app.services.image_service import get_topic_images, resize_crop

logger = logging.getLogger(__name__)


def _gtts_worker(text: str, output_path: str):
    """Worker function for gTTS (must be module-level for multiprocessing)."""
    try:
        t = gTTS(text=text, lang="en", slow=False)
        t.save(output_path)
    except Exception:
        pass

# Accent colour palettes — (primary, secondary/glow)
ACCENT_PALETTES = [
    ((233, 69, 96),   (255, 120, 140)),
    ((0, 180, 255),   (100, 220, 255)),
    ((255, 107, 107), (255, 160, 160)),
    ((102, 192, 244), (160, 220, 255)),
    ((15, 220, 160),  (80, 255, 200)),
    ((255, 180, 40),  (255, 220, 100)),
]

# Ken Burns zoompan expressions — more variety for dynamic feel
ZOOM_EFFECTS = [
    # Slow zoom IN, centred
    "z='min(zoom+0.0012,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    # Slow zoom OUT, centred
    "z='if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0012))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    # Zoom + pan RIGHT
    "z='min(zoom+0.0008,1.12)':x='(iw-iw/zoom)*on/{d}':y='ih/2-(ih/zoom/2)'",
    # Zoom + pan LEFT
    "z='min(zoom+0.0008,1.12)':x='(iw-iw/zoom)*(1-on/{d})':y='ih/2-(ih/zoom/2)'",
    # Zoom into top-right corner
    "z='min(zoom+0.0010,1.18)':x='(iw-iw/zoom)*0.7':y='(ih-ih/zoom)*0.25'",
    # Zoom into bottom-left corner
    "z='min(zoom+0.0010,1.18)':x='(iw-iw/zoom)*0.3':y='(ih-ih/zoom)*0.7'",
    # Gentle float upward
    "z='1.12':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/{d})'",
    # Gentle float downward
    "z='1.12':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/{d}'",
]

# ---------------------------------------------------------------------------
#  Utility helpers
# ---------------------------------------------------------------------------

def get_system_font() -> str:
    """Find a suitable bold TTF font on the system."""
    candidates = [
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    found = glob.glob("/usr/share/fonts/**/*Bold*.ttf", recursive=True)
    return found[0] if found else None


def _get_regular_font() -> str:
    """Find a regular (non-bold) TTF font."""
    candidates = [
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    found = glob.glob("/usr/share/fonts/**/*Sans*.ttf", recursive=True)
    return found[0] if found else None


_font_cache = {}


def _font(size: int, bold: bool = True):
    """Return a TrueType font at *size*."""
    key = (size, bold)
    if key not in _font_cache:
        path = get_system_font() if bold else _get_regular_font()
        if not path:
            path = get_system_font()
        try:
            _font_cache[key] = ImageFont.truetype(path, size) if path else ImageFont.load_default()
        except Exception:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _rounded_rect(draw, xy, radius, fill, outline=None, outline_width=0):
    """Draw a rounded rectangle (compatible with older Pillow)."""
    x0, y0, x1, y1 = xy
    r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
    # Use rounded_rectangle if available (Pillow 8.2+)
    try:
        draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=outline_width)
    except AttributeError:
        draw.rectangle(xy, fill=fill, outline=outline, width=outline_width)


# ---------------------------------------------------------------------------
#  Frame creation — cinematic visuals
# ---------------------------------------------------------------------------

def create_frame(
    image: Image.Image,
    text: str,
    slide_number: int,
    total_slides: int,
    is_title: bool,
    width: int,
    height: int,
    accent: tuple,
) -> Image.Image:
    """Compose a cinematic frame: topic image + overlay + styled text."""
    accent_primary = accent[0] if isinstance(accent[0], tuple) else accent
    accent_glow = accent[1] if isinstance(accent[0], tuple) else tuple(min(c + 60, 255) for c in accent)

    # --- background image ---
    frame = image.copy().convert("RGBA")
    if frame.size != (width, height):
        frame = resize_crop(frame.convert("RGB"), width, height).convert("RGBA")

    # --- cinematic overlay ---
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    if is_title:
        # Full-screen gradient vignette — heavier at center for contrast
        for y in range(height):
            # S-curve for smoother falloff
            norm = y / height
            a = int(160 * (0.3 + 0.7 * (1.0 - abs(norm - 0.5) * 1.4)))
            a = max(0, min(a, 200))
            od.line([(0, y), (width, y)], fill=(0, 0, 0, a))
        # Top and bottom edge darkening
        for y in range(int(height * 0.08)):
            a = int(120 * (1 - y / (height * 0.08)))
            od.line([(0, y), (width, y)], fill=(0, 0, 0, a))
        for y in range(int(height * 0.85), height):
            a = int(150 * ((y - height * 0.85) / (height * 0.15)))
            od.line([(0, y), (width, y)], fill=(0, 0, 0, int(a)))
    else:
        # Content: bottom glass panel gradient
        start = int(height * 0.35)
        for y in range(start, height):
            progress = (y - start) / (height - start)
            # Ease-in curve for smoother gradient
            a = int(220 * (progress ** 1.5))
            od.line([(0, y), (width, y)], fill=(0, 0, 0, a))
        # Subtle top bar — thin accent line
        od.rectangle([(0, 0), (width, 3)], fill=(*accent_primary, 200))

    frame = Image.alpha_composite(frame, overlay)

    # --- accent glow effect at bottom ---
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    glow_y = height - 180 if is_title else int(height * 0.55)
    for r in range(120, 0, -3):
        a = int(12 * (1 - r / 120))
        gd.ellipse(
            [(width // 2 - r * 3, glow_y - r), (width // 2 + r * 3, glow_y + r)],
            fill=(*accent_primary, a),
        )
    frame = Image.alpha_composite(frame, glow_layer).convert("RGB")

    draw = ImageDraw.Draw(frame)

    if is_title:
        _draw_title(draw, text, width, height, accent_primary, accent_glow)
        return frame
    else:
        result = _draw_content(frame, text, slide_number, total_slides, width, height, accent_primary, accent_glow)
        return result


def _draw_title(draw, question, w, h, accent, accent_glow):
    title_f = _font(56)
    sub_f = _font(28, bold=False)
    brand_f = _font(24, bold=False)

    # "DID YOU KNOW?" or topic header
    header_y = int(h * 0.28)
    draw.text((w // 2, header_y), "— DID YOU KNOW? —", font=sub_f, fill=accent, anchor="mm")

    # Accent underline below header
    line_w = 160
    line_y = header_y + 28
    draw.rectangle([(w // 2 - line_w // 2, line_y), (w // 2 + line_w // 2, line_y + 3)], fill=accent)

    # Question text — centered, multi-line
    lines = textwrap.TextWrapper(width=20).wrap(question)
    y = int(h * 0.40)
    for line in lines[:5]:
        # Shadow
        draw.text((w // 2 + 2, y + 3), line, font=title_f, fill=(0, 0, 0, 180), anchor="mm")
        # Main text
        draw.text((w // 2, y), line, font=title_f, fill="#ffffff", anchor="mm")
        y += 72

    # Bottom branding area
    by = h - 120
    # Small accent dots
    dot_r = 4
    for i in range(3):
        cx = w // 2 - 20 + i * 20
        draw.ellipse([(cx - dot_r, by - dot_r), (cx + dot_r, by + dot_r)], fill=accent)
    draw.text((w // 2, by + 30), "EduVid AI", font=brand_f, fill=(200, 200, 200), anchor="mm")


def _draw_content(frame_img, text, num, total, w, h, accent, accent_glow):
    content_f = _font(38)
    num_f = _font(48)
    label_f = _font(20, bold=False)
    small_f = _font(22, bold=False)

    # --- glass card panel ---
    card_top = int(h * 0.42)
    card_bottom = h - 80
    card_left = 40
    card_right = w - 40

    # Glass card background (semi-transparent)
    base = frame_img.convert("RGBA")
    card_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card_layer)
    _rounded_rect(cd, (card_left, card_top, card_right, card_bottom), 24, fill=(0, 0, 0, 100))
    # Accent top edge on card
    _rounded_rect(cd, (card_left, card_top, card_right, card_top + 4), 2, fill=(*accent, 180))

    base = Image.alpha_composite(base, card_layer).convert("RGB")
    draw = ImageDraw.Draw(base)

    # --- slide number badge ---
    badge_x = card_left + 45
    badge_y = card_top + 40
    badge_r = 22
    draw.ellipse(
        [(badge_x - badge_r, badge_y - badge_r), (badge_x + badge_r, badge_y + badge_r)],
        fill=accent,
    )
    draw.text((badge_x, badge_y), str(num), font=num_f, fill="#ffffff", anchor="mm")

    # "Point N of M" label
    draw.text(
        (badge_x + badge_r + 14, badge_y),
        f"Point {num} of {total}",
        font=label_f, fill=(180, 180, 180), anchor="lm",
    )

    # --- content text ---
    lines = textwrap.TextWrapper(width=28).wrap(text)
    y = card_top + 90
    max_lines = min(len(lines), 8)
    for line in lines[:max_lines]:
        # Subtle shadow
        draw.text((w // 2 + 1, y + 2), line, font=content_f, fill=(0, 0, 0), anchor="mm")
        draw.text((w // 2, y), line, font=content_f, fill=(240, 240, 240), anchor="mm")
        y += 52

    # --- progress indicator (dots) ---
    dot_y = card_bottom - 30
    dot_r = 5
    total_width = total * 18
    start_x = w // 2 - total_width // 2
    for i in range(total):
        cx = start_x + i * 18
        if i + 1 == num:
            draw.ellipse([(cx - dot_r - 2, dot_y - dot_r - 2), (cx + dot_r + 2, dot_y + dot_r + 2)], fill=accent)
        else:
            draw.ellipse([(cx - dot_r, dot_y - dot_r), (cx + dot_r, dot_y + dot_r)], fill=(80, 80, 80))

    return base


# ---------------------------------------------------------------------------
#  Script / audio / subtitle helpers
# ---------------------------------------------------------------------------

def split_script_into_segments(script: str) -> List[str]:
    """Split script into segments for slides."""
    sentences = []
    for part in script.replace("!", "!|").replace(".", ".|").replace("?", "?|").split("|"):
        part = part.strip()
        if len(part) > 10:
            sentences.append(part)

    segments, current = [], ""
    for s in sentences:
        if len(current) + len(s) < 200:
            current = f"{current} {s}".strip() if current else s
        else:
            if current:
                segments.append(current)
            current = s
    if current:
        segments.append(current)
    return segments if segments else [script]


def generate_tts_audio(text: str, output_path: str) -> float:
    """Generate TTS audio → MP3.  Falls back to silent audio on failure."""
    import multiprocessing

    try:
        proc = multiprocessing.Process(target=_gtts_worker, args=(text, output_path))
        proc.start()
        proc.join(timeout=30)  # Hard 30s timeout
        if proc.is_alive():
            proc.terminate()
            proc.join(2)
            raise TimeoutError("gTTS timed out after 30s")
        if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
            return MP3(output_path).info.length
        raise RuntimeError("gTTS produced no output")
    except Exception as e:
        logger.warning(f"gTTS failed ({e}), generating silent audio")
        duration = max(len(text.split()) / 2.5, 15)
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
                 "-t", str(duration), "-q:a", "9", "-codec:a", "libmp3lame",
                 output_path],
                capture_output=True, timeout=30,
            )
        except Exception as e2:
            logger.error(f"Silent audio also failed: {e2}")
        return duration


def generate_subtitle_data(script: str, total_duration: float) -> List[dict]:
    words = script.split()
    if not words:
        return []
    tpw = total_duration / len(words)
    subs, chunk = [], 6
    for i in range(0, len(words), chunk):
        subs.append({
            "text": " ".join(words[i:i + chunk]),
            "start": round(i * tpw, 2),
            "end": round(min((i + chunk) * tpw, total_duration), 2),
        })
    return subs


def generate_srt_content(subtitles: List[dict]) -> str:
    lines = []
    for i, s in enumerate(subtitles, 1):
        lines += [str(i), f"{_srt_ts(s['start'])} --> {_srt_ts(s['end'])}", s["text"], ""]
    return "\n".join(lines)


def _srt_ts(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ---------------------------------------------------------------------------
#  FFmpeg video assembly helpers
# ---------------------------------------------------------------------------

CROSSFADE_DURATION = 0.6  # seconds of crossfade between clips


def _assemble_kenburns(
    frame_paths, durations, audio_path, output_path,
    width, height, fps, srt_path, video_id, temp_dir,
):
    """Create video clips with zoompan per frame, crossfade transitions,
    audio, and subtitles."""
    clip_paths = []

    for i, (fp, dur) in enumerate(zip(frame_paths, durations)):
        # Add extra time for crossfade overlap (except last clip)
        extra = CROSSFADE_DURATION if i < len(frame_paths) - 1 else 0
        clip_dur = dur + extra
        d_frames = max(int(clip_dur * fps), fps)
        effect = ZOOM_EFFECTS[i % len(ZOOM_EFFECTS)].replace("{d}", str(max(d_frames - 1, 1)))
        clip = os.path.join(temp_dir, f"clip_{i:03d}.mp4")

        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", fp,
            "-vf", f"zoompan={effect}:d={d_frames}:s={width}x{height}:fps={fps}",
            "-t", f"{clip_dur:.2f}",
            "-c:v", "libx264", "-b:v", "1500k",
            "-pix_fmt", "yuv420p", "-an",
            clip,
        ]
        logger.info(f"[Video {video_id}] Ken Burns clip {i + 1}/{len(frame_paths)}...")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            raise RuntimeError(f"zoompan clip {i} failed: {res.stderr[-300:]}")
        clip_paths.append(clip)

    # ---- crossfade between clips ----
    merged = _crossfade_clips(clip_paths, CROSSFADE_DURATION, temp_dir, video_id)

    # ---- add audio ----
    has_audio = os.path.exists(audio_path) and os.path.getsize(audio_path) > 0
    if has_audio:
        with_audio = os.path.join(temp_dir, "with_audio.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-i", merged, "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-shortest", "-movflags", "+faststart",
            with_audio,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            logger.warning(f"Audio merge failed, using video only: {res.stderr[-200:]}")
            with_audio = merged
    else:
        with_audio = merged

    # ---- burn subtitles ----
    _burn_subtitles(with_audio, srt_path, output_path)


def _crossfade_clips(clip_paths, fade_dur, temp_dir, video_id):
    """Apply crossfade transitions between clips using xfade filter."""
    if len(clip_paths) < 2:
        return clip_paths[0]

    # Try xfade-based crossfading (requires clips to be re-encoded with same params)
    try:
        return _xfade_chain(clip_paths, fade_dur, temp_dir, video_id)
    except Exception as e:
        logger.warning(f"[Video {video_id}] Crossfade failed ({e}), using simple concat")
        # Fallback: simple concat
        concat_file = os.path.join(temp_dir, "clips.txt")
        with open(concat_file, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{cp}'\n")
        merged = os.path.join(temp_dir, "merged.mp4")
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
            "-c:v", "copy", "-movflags", "+faststart", merged,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            raise RuntimeError(f"concat failed: {res.stderr[-300:]}")
        return merged


def _xfade_chain(clip_paths, fade_dur, temp_dir, video_id):
    """Chain xfade transitions across all clips.
    Applies transitions iteratively: (clip0 x clip1) → tmp, (tmp x clip2) → tmp2, etc.
    Uses different transition styles for variety."""
    transitions = ["fade", "fadeblack", "slideleft", "slideup", "smoothleft", "smoothup"]
    current = clip_paths[0]

    for i in range(1, len(clip_paths)):
        transition = transitions[i % len(transitions)]
        output = os.path.join(temp_dir, f"xfade_{i:03d}.mp4")

        # Get duration of current clip to calculate offset
        probe_cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", current,
        ]
        probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=15)
        if probe_res.returncode != 0:
            raise RuntimeError(f"ffprobe failed for clip {i}")
        cur_duration = float(probe_res.stdout.strip())
        offset = max(cur_duration - fade_dur, 0.1)

        cmd = [
            "ffmpeg", "-y",
            "-i", current, "-i", clip_paths[i],
            "-filter_complex",
            f"[0:v][1:v]xfade=transition={transition}:duration={fade_dur:.2f}:offset={offset:.2f},format=yuv420p[v]",
            "-map", "[v]",
            "-c:v", "libx264", "-b:v", "1500k",
            "-movflags", "+faststart", "-an",
            output,
        ]
        logger.info(f"[Video {video_id}] Crossfade {i}/{len(clip_paths)-1} ({transition})...")
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            raise RuntimeError(f"xfade {i} failed: {res.stderr[-300:]}")
        current = output

    return current


def _assemble_simple(
    frame_paths, durations, audio_path, output_path, fps, srt_path, temp_dir,
):
    """Fallback: simple slide concat with fade filter between slides."""
    concat_file = os.path.join(temp_dir, "concat.txt")
    with open(concat_file, "w") as f:
        for fp, dur in zip(frame_paths, durations):
            f.write(f"file '{fp}'\nduration {dur:.4f}\n")
        f.write(f"file '{frame_paths[-1]}'\n")

    temp_vid = os.path.join(temp_dir, "simple.mp4")
    has_audio = os.path.exists(audio_path) and os.path.getsize(audio_path) > 0
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file]
    if has_audio:
        cmd += ["-i", audio_path]
    cmd += ["-c:v", "libx264", "-b:v", "1500k", "-pix_fmt", "yuv420p",
            "-r", str(fps)]
    if has_audio:
        cmd += ["-c:a", "aac", "-b:a", "128k", "-shortest"]
    cmd += ["-movflags", "+faststart", temp_vid]

    res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if res.returncode != 0:
        raise RuntimeError(f"simple assembly: {res.stderr[-300:]}")

    _burn_subtitles(temp_vid, srt_path, output_path)


def _burn_subtitles(input_path: str, srt_path: str, output_path: str):
    """Burn styled SRT subtitles into video. Falls back to no-sub copy on error."""
    srt_esc = srt_path.replace("\\", "/").replace(":", "\\:")
    style = (
        "FontSize=24,FontName=DejaVu Sans,"
        "PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,"
        "BackColour=&H80000000,"
        "BorderStyle=1,Outline=2,Shadow=0,"
        "MarginV=50,Bold=1,"
        "Alignment=2"
    )
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", f"subtitles={srt_esc}:force_style='{style}'",
        "-c:a", "copy", "-c:v", "libx264", "-b:v", "1500k",
        output_path,
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            logger.warning(f"Subtitle burn failed, copying without: {res.stderr[-200:]}")
            os.rename(input_path, output_path)
    except Exception as e:
        logger.warning(f"Subtitle error: {e}")
        if os.path.exists(input_path):
            os.rename(input_path, output_path)


# ---------------------------------------------------------------------------
#  Main entry point
# ---------------------------------------------------------------------------

def create_video(video_id: int, question: str, script: str) -> dict:
    """
    Generate a cinematic educational video:
      1. TTS narration
      2. AI-generated topic images (Pollinations.ai / fallback gradients)
      3. Frames with image background + text overlay
      4. Ken Burns zoompan camera movement
      5. Hardcoded subtitles
    Returns dict with file_path, duration, subtitle_text, thumbnail_path.
    """
    accent = ACCENT_PALETTES[hash(question) % len(ACCENT_PALETTES)]
    temp_dir = os.path.join(settings.TEMP_DIR, f"video_{video_id}")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # 1 — Audio
        logger.info(f"[Video {video_id}] Generating narration...")
        audio_path = os.path.join(temp_dir, "narration.mp3")
        audio_dur = max(generate_tts_audio(script, audio_path), 10)

        # 2 — Script segments
        segments = split_script_into_segments(script)
        n_slides = len(segments) + 1          # +1 for title
        time_per = audio_dur / n_slides

        # 3 — Fetch topic images (AI or gradient fallback)
        logger.info(f"[Video {video_id}] Fetching AI images...")
        images = get_topic_images(
            question, segments,
            settings.VIDEO_WIDTH, settings.VIDEO_HEIGHT,
        )

        # 4 — Create cinematic frames
        logger.info(f"[Video {video_id}] Composing {n_slides} cinematic frames...")
        frame_paths = []

        # title
        title_img = create_frame(
            images[0], question, 0, len(segments), True,
            settings.VIDEO_WIDTH, settings.VIDEO_HEIGHT, accent,
        )
        tp = os.path.join(temp_dir, "frame_000.png")
        title_img.save(tp)
        frame_paths.append(tp)

        # content
        for i, seg in enumerate(segments):
            img = images[i + 1] if i + 1 < len(images) else images[-1]
            cf = create_frame(
                img, seg, i + 1, len(segments), False,
                settings.VIDEO_WIDTH, settings.VIDEO_HEIGHT, accent,
            )
            fp = os.path.join(temp_dir, f"frame_{i + 1:03d}.png")
            cf.save(fp)
            frame_paths.append(fp)

        # 5 — Subtitles
        logger.info(f"[Video {video_id}] Generating subtitles...")
        subs = generate_subtitle_data(script, audio_dur)
        srt_path = os.path.join(temp_dir, "subtitles.srt")
        with open(srt_path, "w") as f:
            f.write(generate_srt_content(subs))

        # 6 — Assemble video (Ken Burns → fallback simple concat)
        output_name = f"eduvid_{video_id}_{int(datetime.now().timestamp())}.mp4"
        output_path = os.path.join(settings.VIDEO_DIR, output_name)
        durations = [time_per] * n_slides

        logger.info(f"[Video {video_id}] Assembling with Ken Burns effect...")
        try:
            _assemble_kenburns(
                frame_paths, durations, audio_path, output_path,
                settings.VIDEO_WIDTH, settings.VIDEO_HEIGHT,
                settings.VIDEO_FPS, srt_path, video_id, temp_dir,
            )
        except Exception as e:
            logger.warning(f"[Video {video_id}] Ken Burns failed ({e}), using simple assembly")
            _assemble_simple(
                frame_paths, durations, audio_path, output_path,
                settings.VIDEO_FPS, srt_path, temp_dir,
            )

        # 7 — Thumbnail
        thumb_name = f"thumb_{video_id}.png"
        thumb_path = os.path.join(settings.VIDEO_DIR, thumb_name)
        title_img.resize((270, 480)).save(thumb_path)

        duration = int(audio_dur)
        logger.info(f"[Video {video_id}] Done! {duration}s → {output_path}")

        return {
            "file_path": output_name,
            "thumbnail_path": thumb_name,
            "duration": duration,
            "subtitle_text": json.dumps(subs),
        }

    except Exception as e:
        logger.error(f"[Video {video_id}] Failed: {e}", exc_info=True)
        raise
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
