import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background: #0f172a; /* Fallback */
    font-family: 'Outfit', sans-serif;
    color: #f8fafc;
    padding: 40px;
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    justify-content: center;
}

/* Print settings for PDF export */
@media print {
    body {
        background: #0f172a !important;
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
    position: relative;
    overflow: hidden;
    background: radial-gradient(circle at top left, #1e293b, #0f172a);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
}

/* Beautiful dynamic background orb effects behind the glass */
.slide::before {
    content: '';
    position: absolute;
    top: -10%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(0,0,0,0) 70%);
    border-radius: 50%;
    z-index: 1;
}
.slide::after {
    content: '';
    position: absolute;
    bottom: -15%;
    left: -10%;
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(0,0,0,0) 70%);
    border-radius: 50%;
    z-index: 1;
}

/* Top Header */
.header {
    position: relative;
    z-index: 10;
    padding: 50px 60px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.author-glass {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 10px 24px 10px 10px;
    border-radius: 50px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.header-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.1);
}

.author-info {
    display: flex;
    flex-direction: column;
}

.author-name {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #ffffff;
}

.author-handle {
    font-size: 14px;
    color: #94a3b8;
}

.brand-pill {
    background: rgba(234, 179, 8, 0.1);
    color: #eab308;
    border: 1px solid rgba(234, 179, 8, 0.2);
    padding: 8px 20px;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    backdrop-filter: blur(12px);
}

/* Glass Main Content Container */
.content-glass {
    position: relative;
    z-index: 10;
    margin: auto 60px;
    padding: 60px;
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.content-row {
    display: flex;
    gap: 50px;
    align-items: center;
}

.text-col {
    flex: 1;
}

/* Cover layout specifically */
.cover-layout .text-col {
    flex: 1;
}
.cover-layout .visual-col {
    width: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* Typography */
.headline {
    font-size: 64px;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 24px;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
}

.cover-headline {
    font-size: 76px;
}

.body {
    font-size: 32px;
    line-height: 1.5;
    color: #94a3b8;
    font-weight: 300;
}

.highlight {
    color: #eab308;
    font-weight: 600;
}

/* Visuals inside Glass */
.visual-col {
    width: 320px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
}

.glass-icon-wrapper {
    width: 280px;
    height: 280px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 40px rgba(255,255,255,0.02), 0 20px 40px rgba(0,0,0,0.2);
    padding: 30px;
}

.glass-icon-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3));
}

/* Cover / Closing Avatar */
.hero-avatar {
    width: 260px;
    height: 260px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 10px rgba(234, 179, 8, 0.1), 0 20px 40px rgba(0,0,0,0.3);
}

/* Footer progress */
.footer {
    position: relative;
    z-index: 10;
    padding: 0 60px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.progress-container {
    display: flex;
    gap: 8px;
}

.progress-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
}

.progress-dot.active {
    background: #eab308;
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
}

.swipe-text {
    font-size: 16px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 2px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Export Button */
.export-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999;
    background: #eab308;
    color: #000;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.export-btn:hover { background: #ca8a04; }
"""

def file_to_b64(filepath):
    if not filepath:
        return ""
    try:
        p = Path(filepath)
        if not p.exists():
            print(f"Warning: image {filepath} not found.")
            return ""
        mime = "image/png"
        if p.suffix.lower() in [".jpg", ".jpeg"]:
            mime = "image/jpeg"
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"data:{mime};base64,{b64}"
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return ""

def generate_html(spec_path, output_path):
    with open(spec_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)

    author = spec.get("author", {})
    slides = spec.get("slides", [])
    
    # We assume user_avatar.png is in the same directory as the script or absolute path.
    # We will grab it from the cover slide if provided.
    author_img_b64 = ""
    for s in slides:
        if s.get("type") in ["cover", "closing"] and s.get("img_path"):
            author_img_b64 = file_to_b64(s["img_path"])
            break

    html_parts = []
    html_parts.append(f"<!DOCTYPE html>\n<html>\n<head>\n<meta charset='UTF-8'>\n<style>\n{CSS}\n</style>\n</head>\n<body>")
    
    # Add JS library for PNG download (modern alternative to html2canvas that supports glassmorphism)
    html_parts.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>')
    
    html_parts.append('<div class="no-print" style="position:fixed; top:20px; right:20px; z-index:999; display:flex; flex-direction:column; align-items:flex-end; gap:8px;">')
    html_parts.append('<div style="display:flex; gap:10px;">')
    html_parts.append('<button class="export-btn" id="btn-images" onclick="downloadImages()" style="background:#0f172a; color:white; border:1px solid #334155;">⬇ DOWNLOAD PNGs</button>')
    html_parts.append('<button class="export-btn" onclick="window.print()" style="background:#eab308;">⬇ DOWNLOAD PDF</button>')
    html_parts.append('</div>')
    html_parts.append('<span style="color:#94a3b8; font-size:12px; background:rgba(0,0,0,0.8); padding:8px; border-radius:8px;">For PDF: Check "Background Graphics" in the save dialog.<br>The white space issue is now permanently fixed.</span>')
    html_parts.append('</div>')

    # Add the JS logic for PNG downloads
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
        btn.innerText = '⬇ DOWNLOAD PNGs';
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

        # Header
        html_parts.append('<div class="header">')
        html_parts.append('<div class="author-glass">')
        if author_img_b64:
            html_parts.append(f'<img class="header-avatar" src="{author_img_b64}" />')
        html_parts.append('<div class="author-info">')
        html_parts.append(f'<span class="author-name">{html.escape(author.get("name", "Name"))}</span>')
        html_parts.append(f'<span class="author-handle">{html.escape(author.get("handle", "@handle"))}</span>')
        html_parts.append('</div></div>')
        html_parts.append('<div class="brand-pill">AETHERA</div>')
        html_parts.append('</div>')

        # Content Glass
        html_parts.append('<div class="content-glass">')
        html_parts.append('<div class="content-row cover-layout" if stype == "cover" else "content-row">')
        
        # Text Column
        html_parts.append('<div class="text-col">')
        if stype == "cover":
            html_parts.append(f'<h1 class="headline cover-headline">{headline}</h1>')
        else:
            html_parts.append(f'<h1 class="headline">{headline}</h1>')
        html_parts.append(f'<p class="body">{body}</p>')
        html_parts.append('</div>')

        # Visual Column
        if img_b64:
            html_parts.append('<div class="visual-col">')
            if stype in ["cover", "closing"]:
                html_parts.append(f'<img class="hero-avatar" src="{img_b64}" />')
            else:
                html_parts.append(f'<div class="glass-icon-wrapper"><img src="{img_b64}" /></div>')
            html_parts.append('</div>')

        html_parts.append('</div>') # end content-row
        html_parts.append('</div>') # end content-glass

        # Footer
        html_parts.append('<div class="footer">')
        html_parts.append('<div class="progress-container">')
        for j in range(total_slides):
            active_class = " active" if j == i else ""
            html_parts.append(f'<div class="progress-dot{active_class}"></div>')
        html_parts.append('</div>')
        
        if i < total_slides - 1:
            html_parts.append('<div class="swipe-text">SWIPE <span>→</span></div>')
        else:
            html_parts.append('<div class="swipe-text" style="color:#eab308">DONE</div>')
        
        html_parts.append('</div>') # end footer

        html_parts.append('</div>') # end slide

    html_parts.append("</body>\n</html>")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_parts))
    print(f"Glassmorphism carousel generated: {output_path}")

if __name__ == "__main__":
    import html
    if len(sys.argv) < 3:
        print("Usage: python build_glass_carousel.py <spec.json> <output.html>")
        sys.exit(1)
    generate_html(sys.argv[1], sys.argv[2])
