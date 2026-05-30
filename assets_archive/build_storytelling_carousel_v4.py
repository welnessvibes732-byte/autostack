import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;600;800&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background: #e2e8f0;
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
    background: #050505;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
}

/* Vertical Text Column */
.text-col {
    width: 60%;
    height: 100%;
    padding: 100px 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 10;
}

/* Right side transparent image container */
.img-col {
    width: 50%;
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
}

/* Beautiful organic gradient mesh in the background */
.img-col::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(234,179,8,0.15) 0%, rgba(0,0,0,0) 70%);
    border-radius: 50%;
    z-index: -1;
}

.transparent-art {
    max-width: 120%;
    max-height: 90%;
    object-fit: contain;
    /* mix-blend-mode: screen; */
    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.8));
    animation: float 6s ease-in-out infinite;
}

@keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
    100% { transform: translateY(0px); }
}

.headline {
    font-family: 'Playfair Display', serif;
    font-size: 80px;
    font-weight: 700;
    line-height: 1.1;
    color: #ffffff;
    margin-bottom: 40px;
    letter-spacing: -1px;
}

.body {
    font-size: 32px;
    font-weight: 300;
    line-height: 1.5;
    color: #94a3b8;
}

.highlight {
    color: #eab308;
    font-weight: 600;
    font-style: italic;
    font-family: 'Playfair Display', serif;
}

.brand-tag {
    position: absolute;
    top: 60px;
    left: 80px;
    font-size: 16px;
    font-weight: 800;
    color: #eab308;
    letter-spacing: 4px;
    text-transform: uppercase;
    z-index: 20;
}

/* Slide counter at the bottom */
.footer {
    position: absolute;
    bottom: 60px;
    left: 80px;
    width: calc(100% - 160px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 20;
}

.progress-line {
    display: flex;
    gap: 8px;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #334155;
}

.dot.active {
    background: #eab308;
}

.swipe-text {
    font-size: 16px;
    font-weight: 800;
    color: #cbd5e1;
    letter-spacing: 2px;
}

/* Cover Author Profile */
.author-block {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 60px;
}
.author-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #eab308;
}
.author-name {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
}
.author-handle {
    font-size: 16px;
    color: #64748b;
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
}
.export-btn.primary {
    background: #eab308;
    color: #000;
    border-color: #eab308;
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
        html_parts.append('<div class="brand-tag">AETHERA</div>')

        # Text Side (Left)
        html_parts.append('<div class="text-col">')
        html_parts.append(f'<h1 class="headline">{headline}</h1>')
        if body:
            html_parts.append(f'<p class="body">{body}</p>')
            
        if stype in ["cover", "closing"] and author_img_b64:
            html_parts.append('<div class="author-block">')
            html_parts.append(f'<img class="author-avatar" src="{author_img_b64}" />')
            html_parts.append('<div>')
            html_parts.append(f'<div class="author-name">{author.get("name", "")}</div>')
            html_parts.append(f'<div class="author-handle">@{author.get("handle", "")}</div>')
            html_parts.append('</div></div>')
            
        html_parts.append('</div>')

        # Image Side (Right transparent floating)
        if img_b64 and stype not in ["cover", "closing"]:
            html_parts.append('<div class="img-col">')
            html_parts.append(f'<img class="transparent-art" src="{img_b64}" />')
            html_parts.append('</div>')

        # Footer Progress
        html_parts.append('<div class="footer">')
        html_parts.append('<div class="progress-line">')
        for j in range(total_slides):
            active = " active" if j == i else ""
            html_parts.append(f'<div class="dot{active}"></div>')
        html_parts.append('</div>')
        if i < total_slides - 1:
            html_parts.append('<div class="swipe-text">SWIPE ➔</div>')
        else:
            html_parts.append('<div class="swipe-text" style="color:#eab308;">DONE</div>')
        html_parts.append('</div>')

        html_parts.append('</div>')

    html_parts.append("</body>\n</html>")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_parts))
    print(f"Editorial carousel generated: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <spec.json> <output.html>")
        sys.exit(1)
    generate_html(sys.argv[1], sys.argv[2])
