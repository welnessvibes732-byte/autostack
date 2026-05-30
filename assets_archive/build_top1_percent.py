import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background: #111;
    font-family: 'Outfit', sans-serif;
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    justify-content: center;
    padding: 40px;
}

@media print {
    body {
        background: #000000 !important;
        -webkit-print-color-adjust: exact;
        padding: 0;
        gap: 0;
        display: block;
    }
    .slide {
        page-break-after: always;
        break-after: page;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
    }
    .no-print {
        display: none !important;
    }
    @page {
        size: 1080px 1080px;
        margin: 0;
    }
}

.slide {
    width: 1080px;
    height: 1080px;
    background: #030712; /* Deepest slate/black */
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 100px;
}

/* Dynamic Color Splashes (Behind the image) */
.color-splash-1 {
    position: absolute;
    width: 1000px;
    height: 1000px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(0,0,0,0) 70%);
    top: -200px;
    right: -200px;
    z-index: 1;
    filter: blur(60px);
}

.color-splash-2 {
    position: absolute;
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(234, 179, 8, 0.1) 0%, rgba(0,0,0,0) 70%);
    bottom: -100px;
    left: -100px;
    z-index: 1;
    filter: blur(80px);
}

/* The Full-Page Immersive Image */
.hero-art {
    position: absolute;
    right: -5%;
    top: 50%;
    transform: translateY(-50%);
    width: 850px;
    height: 850px;
    object-fit: contain;
    z-index: 2;
    opacity: 0.85;
    /* Advanced CSS Masking to blend edges perfectly into the dark background */
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 75%);
}

/* Cinematic Gradient Overlay to ensure text legibility over full-bleed image */
.text-protector {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(90deg, rgba(3,7,18,1) 35%, rgba(3,7,18,0.7) 60%, rgba(3,7,18,0) 100%);
    z-index: 3;
}

/* Text Layer */
.text-layer {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 900px; /* Spans across the page */
}

.headline {
    font-size: 88px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -2px;
    margin-bottom: 40px;
    text-transform: uppercase;
    /* Metallic/Tech Text Gradient */
    background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}

.cover-headline {
    font-size: 110px; /* Massive impact */
}

.body {
    font-size: 38px;
    font-weight: 400;
    line-height: 1.4;
    color: #e2e8f0;
    max-width: 760px;
    
    /* Architectural framing for the text block */
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(12px);
    padding: 32px 40px;
    border-left: 6px solid #38bdf8;
    border-radius: 0 16px 16px 0;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.highlight {
    color: #38bdf8;
    font-weight: 700;
}

/* Aethera Brand Tag */
.brand-tag {
    position: absolute;
    top: 60px;
    left: 100px;
    font-size: 18px;
    font-weight: 900;
    color: #38bdf8;
    letter-spacing: 6px;
    text-transform: uppercase;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 16px;
}
.brand-tag::before {
    content: '';
    width: 12px; height: 12px;
    background: #38bdf8;
    box-shadow: 0 0 12px #38bdf8;
}

/* Footer & Author */
.footer {
    position: absolute;
    bottom: 60px;
    left: 100px;
    width: calc(100% - 200px);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    z-index: 20;
}

.author-block {
    display: flex;
    align-items: center;
    gap: 24px;
}
.author-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #38bdf8;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}
.author-name {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
}
.author-handle {
    font-size: 20px;
    color: #94a3b8;
    letter-spacing: 1px;
}

.progress-container {
    display: flex;
    gap: 12px;
    align-items: center;
}
.progress-bar {
    width: 60px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
}
.progress-bar.active {
    background: #38bdf8;
    box-shadow: 0 0 10px #38bdf8;
}
.swipe-text {
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 3px;
    margin-left: 20px;
}

/* Export Buttons */
.export-btn {
    background: #000;
    color: #fff;
    border: 1px solid #334155;
    padding: 12px 24px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 600;
    border-radius: 6px;
}
.export-btn.primary {
    background: #38bdf8;
    color: #000;
    border-color: #38bdf8;
}
"""

def file_to_b64(filepath):
    if not filepath:
        return ""
    try:
        p = Path(filepath)
        if not p.exists():
            return ""
        mime = "image/png"
        if p.suffix.lower() in [".jpg", ".jpeg"]:
            mime = "image/jpeg"
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"data:{mime};base64,{b64}"
    except Exception as e:
        return ""

def generate_html(spec_path, output_path):
    with open(spec_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)

    author = spec.get("author", {})
    slides = spec.get("slides", [])
    
    author_img_b64 = ""
    for s in slides:
        if s.get("type") in ["cover", "closing"] and s.get("img_path"):
            author_img_b64 = file_to_b64(s["img_path"])
            break

    html_parts = []
    html_parts.append(f"<!DOCTYPE html>\n<html>\n<head>\n<meta charset='UTF-8'>\n<style>\n{CSS}\n</style>\n</head>\n<body>")
    
    html_parts.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>')
    html_parts.append('<div class="no-print" style="position:fixed; top:20px; right:20px; z-index:999; display:flex; gap:10px;">')
    html_parts.append('<button class="export-btn" id="btn-images" onclick="downloadImages()">⬇ Download PNGs</button>')
    html_parts.append('<button class="export-btn primary" onclick="window.print()">⬇ Download PDF</button>')
    html_parts.append('</div>')

    js_logic = """
    <script>
    async function downloadImages() {
        const btn = document.getElementById('btn-images');
        btn.innerText = 'GENERATING...';
        const slides = document.querySelectorAll('.slide');
        for (let i = 0; i < slides.length; i++) {
            const dataUrl = await window.htmlToImage.toPng(slides[i], { quality: 1.0, width: 1080, height: 1080 });
            const link = document.createElement('a');
            link.download = `slide_${i+1}.png`;
            link.href = dataUrl;
            link.click();
            await new Promise(r => setTimeout(r, 500));
        }
        btn.innerText = '⬇ Download PNGs';
    }
    </script>
    """
    html_parts.append(js_logic)

    total_slides = len(slides)

    for i, slide in enumerate(slides):
        stype = slide.get("type", "content")
        headline = slide.get("headline", "")
        body = slide.get("body", "")
        highlight = slide.get("highlight", "")
        img_path = slide.get("img_path", "")
        img_b64 = file_to_b64(img_path)

        if highlight and highlight in headline:
            headline = headline.replace(highlight, f"<span class='highlight'>{highlight}</span>")
        if highlight and highlight in body:
            body = body.replace(highlight, f"<span class='highlight'>{highlight}</span>")

        html_parts.append('<div class="slide">')
        
        # Color Splashes
        html_parts.append('<div class="color-splash-1"></div>')
        html_parts.append('<div class="color-splash-2"></div>')

        # Full Page Background Image with Masking
        if img_b64 and stype not in ["cover", "closing"]:
            html_parts.append(f'<img class="hero-art" src="{img_b64}" />')
            html_parts.append('<div class="text-protector"></div>')

        # Top Brand Tag
        html_parts.append('<div class="brand-tag">AETHERA_OS</div>')

        # Text Layer (Spanning heavily)
        html_parts.append('<div class="text-layer">')
        if stype == "cover":
            html_parts.append(f'<h1 class="headline cover-headline">{headline}</h1>')
        else:
            html_parts.append(f'<h1 class="headline">{headline}</h1>')
            
        if body:
            html_parts.append(f'<p class="body">{body}</p>')
        html_parts.append('</div>')

        # Footer
        html_parts.append('<div class="footer">')
        
        # Left side of footer (Author for cover, nothing for content)
        if stype in ["cover", "closing"] and author_img_b64:
            html_parts.append('<div class="author-block">')
            html_parts.append(f'<img class="author-avatar" src="{author_img_b64}" />')
            html_parts.append('<div>')
            html_parts.append(f'<div class="author-name">{author.get("name", "")}</div>')
            html_parts.append(f'<div class="author-handle">@{author.get("handle", "")}</div>')
            html_parts.append('</div></div>')
        else:
            html_parts.append('<div></div>')

        # Right side of footer (Progress)
        html_parts.append('<div class="progress-container">')
        for j in range(total_slides):
            active = " active" if j == i else ""
            html_parts.append(f'<div class="progress-bar{active}"></div>')
        
        if i < total_slides - 1:
            html_parts.append('<div class="swipe-text">SWIPE</div>')
        else:
            html_parts.append('<div class="swipe-text" style="color:#38bdf8;">DONE</div>')
            
        html_parts.append('</div>') # end progress
        html_parts.append('</div>') # end footer

        html_parts.append('</div>') # end slide

    html_parts.append("</body>\n</html>")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_parts))
    print(f"Top 1% God Mode carousel generated: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <spec.json> <output.html>")
        sys.exit(1)
    generate_html(sys.argv[1], sys.argv[2])
