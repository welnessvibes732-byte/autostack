"""
Fast background removal using rembg with tiny u2netp model (~4MB vs 176MB).
Produces a grayscale cutout — clean Raj Shamani editorial look.
"""
import io
import sys
from pathlib import Path
from PIL import Image, ImageEnhance

# ── Input / output ──────────────────────────────────────────────────────────
INPUT  = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\media__1779815428588.jpg"
OUTPUT = r"C:\Users\DELL\Documents\autostackk\user_bw_cutout.png"

print("Loading image …")
with open(INPUT, "rb") as fh:
    raw = fh.read()

print("Removing background (u2netp small model ~4 MB) …")
from rembg import remove, new_session
session = new_session("u2netp")          # tiny model, downloads in seconds
result_bytes = remove(raw, session=session)

print("Converting to grayscale editorial style …")
img = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

# Split channels, grayscale RGB, keep alpha mask
r, g, b, a = img.split()
gray = Image.merge("RGB", (r, g, b)).convert("L")

# Boost contrast for stark editorial B&W look
gray = ImageEnhance.Contrast(gray).enhance(1.5)
gray = ImageEnhance.Sharpness(gray).enhance(1.8)

# Re-merge with original alpha (transparent background preserved)
gray_rgba = Image.merge("RGBA", (gray, gray, gray, a))

# Save at natural aspect ratio — NO squishing
gray_rgba.save(OUTPUT, "PNG")
print(f"Saved to {OUTPUT} ({gray_rgba.size[0]}x{gray_rgba.size[1]})")
