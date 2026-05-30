import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background: #e2e8f0;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    justify-content: center;
    padding: 40px;
}

@media print {
    body {
        background: #020817 !important;
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
    background: radial-gradient(100% 100% at 50% 0%, #0f172a 0%, #020817 100%);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 80px;
}

/* Background grid for techy feel */
.slide::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: 0;
}

.content-wrapper {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.tech-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: #38bdf8; /* Techy cyan */
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 12px;
}
.tech-tag::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #38bdf8;
    border-radius: 50%;
    box-shadow: 0 0 10px #38bdf8;
}

.headline {
    font-size: 72px;
    font-weight: 800;
    line-height: 1.1;
    color: #f8fafc;
    letter-spacing: -2px;
}

.cover-headline {
    font-size: 88px;
}

.body {
    font-size: 32px;
    font-weight: 400;
    line-height: 1.5;
    color: #94a3b8;
    margin-top: 40px;
    max-width: 90%;
}

.highlight {
    color: #38bdf8;
    font-weight: 600;
}

/* Tech UI Window for Images */
.ui-window {
    margin-top: auto;
    width: 100%;
    height: 440px;
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    overflow: hidden;
}

.ui-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 40px;
    background: #18181b;
    border-bottom: 1px solid #27272a;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 8px;
}

.ui-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}
.ui-dot.r { background: #ef4444; }
.ui-dot.y { background: #eab308; }
.ui-dot.g { background: #22c55e; }

.ui-image {
    max-height: 320px;
    max-width: 80%;
    margin-top: 40px; /* push below header */
    object-fit: contain;
}

/* Footer progress */
.footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 30px 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.05);
    background: rgba(2,8,23,0.9);
    z-index: 20;
}

.progress-container {
    display: flex;
    gap: 12px;
}

.progress-bar {
    width: 48px;
    height: 4px;
    background: #1e293b;
    border-radius: 2px;
}

.progress-bar.active {
    background: #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
}

.swipe-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 2px;
}

/* Author Section Cover */
.author-block {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 80px;
}
.author-avatar {
    width: 72px;
    height: 72px;
    border-radius: 12px; /* Techy square rounded instead of circle */
    object-fit: cover;
    border: 2px solid #38bdf8;
}
.author-name {
    font-size: 24px;
    font-weight: 600;
    color: #fff;
}
.author-handle {
    font-size: 16px;
    color: #38bdf8;
    font-family: 'JetBrains Mono', monospace;
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
        html_parts.append('<div class="content-wrapper">')

        # Tech Tag
        html_parts.append('<div class="tech-tag">SYS.AETHERA.IO</div>')

        # Headline & Body
        if stype == "cover":
            html_parts.append(f'<h1 class="headline cover-headline">{headline}</h1>')
        else:
            html_parts.append(f'<h1 class="headline">{headline}</h1>')
            
        if body:
            html_parts.append(f'<p class="body">{body}</p>')
            
        # Cover specific author block
        if stype in ["cover", "closing"] and author_img_b64:
            html_parts.append('<div class="author-block">')
            html_parts.append(f'<img class="author-avatar" src="{author_img_b64}" />')
            html_parts.append('<div>')
            html_parts.append(f'<div class="author-name">{author.get("name", "")}</div>')
            html_parts.append(f'<div class="author-handle">@{author.get("handle", "")}</div>')
            html_parts.append('</div></div>')

        # Tech Window Image Container
        if img_b64 and stype not in ["cover", "closing"]:
            html_parts.append('<div class="ui-window">')
            html_parts.append('<div class="ui-header">')
            html_parts.append('<div class="ui-dot r"></div><div class="ui-dot y"></div><div class="ui-dot g"></div>')
            html_parts.append('</div>')
            html_parts.append(f'<img class="ui-image" src="{img_b64}" />')
            html_parts.append('</div>')

        html_parts.append('</div>') # end content-wrapper

        # Footer Progress
        html_parts.append('<div class="footer">')
        html_parts.append('<div class="progress-container">')
        for j in range(total_slides):
            active = " active" if j == i else ""
            html_parts.append(f'<div class="progress-bar{active}"></div>')
        html_parts.append('</div>')
        
        if i < total_slides - 1:
            html_parts.append('<div class="swipe-text">SWIPE_NEXT ></div>')
        else:
            html_parts.append('<div class="swipe-text" style="color:#38bdf8;">EXECUTE_END</div>')
            
        html_parts.append('</div>') # end footer

        html_parts.append('</div>') # end slide

    html_parts.append("</body>\n</html>")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_parts))
    print(f"Tech carousel generated: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <spec.json> <output.html>")
        sys.exit(1)
    generate_html(sys.argv[1], sys.argv[2])
