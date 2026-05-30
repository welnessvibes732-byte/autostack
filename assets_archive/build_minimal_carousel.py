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
    background: #e2e8f0; /* Simple gray for the wrapper */
    font-family: 'Outfit', sans-serif;
    color: #f8fafc;
    padding: 40px;
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    justify-content: center;
}

/* Print settings for PDF export fallback */
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
    background: #0f172a;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
}

/* Geometric Accents (Supported by html2canvas) */
.slide::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 300px;
    height: 100%;
    background: #1e293b;
    z-index: 1;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
}

/* Top Header */
.header {
    position: relative;
    z-index: 10;
    padding: 60px 80px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.author-glass {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #eab308;
}

.author-info {
    display: flex;
    flex-direction: column;
}

.author-name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #ffffff;
}

.author-handle {
    font-size: 16px;
    color: #94a3b8;
    font-weight: 600;
}

.brand-pill {
    background: #eab308;
    color: #000;
    padding: 10px 24px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
}

/* Main Content Container */
.content-glass {
    position: relative;
    z-index: 10;
    margin: auto 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.content-row {
    display: flex;
    gap: 60px;
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
    font-size: 72px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 32px;
    color: #ffffff;
    letter-spacing: -1px;
}

.cover-headline {
    font-size: 84px;
}

.body {
    font-size: 32px;
    line-height: 1.5;
    color: #cbd5e1;
    font-weight: 400;
}

.highlight {
    color: #eab308;
    background: rgba(234, 179, 8, 0.1);
    padding: 0 8px;
    border-radius: 4px;
}

/* Visuals */
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
    background: #1e293b;
    border-radius: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 2px solid #334155;
    padding: 40px;
}

.glass-icon-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

/* Cover / Closing Avatar */
.hero-avatar {
    width: 280px;
    height: 280px;
    border-radius: 50%;
    object-fit: cover;
    border: 8px solid #1e293b;
    box-shadow: 0 0 0 4px #eab308;
}

/* Footer progress */
.footer {
    position: relative;
    z-index: 10;
    padding: 0 80px 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.progress-container {
    display: flex;
    gap: 10px;
}

.progress-bar {
    width: 40px;
    height: 6px;
    background: #334155;
    border-radius: 4px;
}

.progress-bar.active {
    background: #eab308;
}

.swipe-text {
    font-size: 20px;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 2px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Export Button */
.export-btn {
    background: #000;
    color: #fff;
    border: 2px solid #334155;
    padding: 16px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    text-transform: uppercase;
}
.export-btn:hover { background: #1e293b; }
.export-btn.primary {
    background: #eab308;
    color: #000;
    border: 2px solid #eab308;
}
.export-btn.primary:hover { background: #ca8a04; }
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
    
    # Use standard html2canvas + jspdf for solid colors (it works perfectly without glassmorphism)
    html_parts.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>')
    html_parts.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>')
    
    html_parts.append('<div class="no-print" style="position:fixed; top:20px; right:20px; z-index:999; display:flex; gap:16px;">')
    html_parts.append('<button class="export-btn" id="btn-images" onclick="downloadImages()">⬇ Download PNGs</button>')
    html_parts.append('<button class="export-btn primary" id="btn-pdf" onclick="downloadPDF()">⬇ Download PDF</button>')
    html_parts.append('</div>')

    js_logic = """
    <script>
    async function downloadImages() {
        const btn = document.getElementById('btn-images');
        btn.innerText = 'GENERATING...';
        const slides = document.querySelectorAll('.slide');
        for (let i = 0; i < slides.length; i++) {
            const canvas = await html2canvas(slides[i], { scale: 2, backgroundColor: '#0f172a' });
            const link = document.createElement('a');
            link.download = `slide_${i+1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            await new Promise(r => setTimeout(r, 200));
        }
        btn.innerText = '⬇ Download PNGs';
    }

    async function downloadPDF() {
        const btn = document.getElementById('btn-pdf');
        btn.innerText = 'GENERATING...';
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'px', [1080, 1080]);
        const slides = document.querySelectorAll('.slide');
        
        for (let i = 0; i < slides.length; i++) {
            const canvas = await html2canvas(slides[i], { scale: 2, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            if (i > 0) pdf.addPage([1080, 1080], 'p');
            pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1080);
        }
        pdf.save('linkedin_carousel.pdf');
        btn.innerText = '⬇ Download PDF';
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
            html_parts.append(f'<div class="progress-bar{active_class}"></div>')
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
    print(f"Minimalist carousel generated: {output_path}")

if __name__ == "__main__":
    import html
    if len(sys.argv) < 3:
        print("Usage: python build_minimal_carousel.py <spec.json> <output.html>")
        sys.exit(1)
    generate_html(sys.argv[1], sys.argv[2])
