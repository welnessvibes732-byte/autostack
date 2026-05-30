import html
import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #d9d9d9;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}
.deck {
  display: grid;
  grid-template-columns: repeat(auto-fit, 1080px);
  gap: 28px;
  padding: 28px;
  align-items: start;
}
.slide {
  position: relative;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background-color: #fff;
  background-image:
    linear-gradient(#e9e9e9 1px, transparent 1px),
    linear-gradient(90deg, #e9e9e9 1px, transparent 1px);
  background-size: 88px 88px;
  box-shadow: 0 16px 36px rgba(0,0,0,.12);
}
.inner {
  position: absolute;
  inset: 72px 70px 78px;
}
.topline, .bottomline {
  position: absolute;
  left: 70px;
  right: 70px;
  height: 2px;
  background: #1b1b1b;
}
.topline { top: 58px; }
.bottomline { bottom: 68px; }
.kicker, .author {
  position: absolute;
  top: 38px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}
.kicker { left: 70px; }
.author { right: 70px; }
.headline {
  position: relative;
  z-index: 2;
  margin: 40px 0 22px;
  font-size: 64px;
  line-height: .98;
  font-weight: 500;
  max-width: 820px;
}
.cover .headline {
  text-align: center;
  margin-top: 84px;
  font-size: 74px;
}
.body {
  position: relative;
  z-index: 2;
  max-width: 650px;
  font-size: 28px;
  line-height: 1.16;
}
.callouts {
  position: absolute;
  inset: 235px 0 110px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 36px;
}
.callout {
  position: relative;
  z-index: 2;
  font-size: 26px;
  line-height: 1.15;
}
.visual {
  position: absolute;
  z-index: 0;
  right: 38px;
  bottom: 115px;
  width: 360px;
  height: 360px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #333;
}
.visual img {
  width: 100%;
  height: 100%;
  opacity: .85;
  object-fit: contain; /* changed from cover to contain so cutouts look better */
  border-radius: 0; /* removed 50% radius so objects aren't cut into circles */
}
.cover .visual {
  left: 72px;
  right: auto;
  bottom: 110px;
  width: 460px;
  height: 460px;
}
.cover .visual img {
  object-fit: cover;
  border-radius: 50%; /* Cover image remains a circle */
}
.highlight {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}
.mark-underline {
  left: 265px;
  top: 268px;
  width: 520px;
  height: 54px;
}
.mark-circle {
  left: 190px;
  top: 132px;
  width: 520px;
  height: 170px;
}
.mark-arrow {
  right: 170px;
  bottom: 245px;
  width: 220px;
  height: 160px;
}
.swipe {
  position: absolute;
  left: 70px;
  bottom: 31px;
  border: 2px solid #111;
  border-radius: 999px;
  padding: 4px 12px 5px;
  font-size: 14px;
  font-weight: 700;
}
.page {
  position: absolute;
  right: 70px;
  bottom: 30px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff200;
  font-size: 18px;
  font-weight: 800;
}

.dl-btn { position:fixed; top:20px; right:20px; z-index:999; background:#111; color:#fff; border:none; padding:16px 32px; border-radius:50px; font-weight:700; cursor:pointer; letter-spacing:1px; text-transform:uppercase; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transition: 0.3s; }
.dl-btn:hover { transform: scale(1.05); }

@media print {
  body { background: #fff; }
  .deck { display: block; padding: 0; gap: 0; }
  .slide { width: 1080px; height: 1350px; page-break-after: always; box-shadow: none; transform: scale(1) !important; margin-bottom: 0 !important; }
  .dl-btn { display: none; }
}
"""

MARKS = {
    "underline": '<svg class="highlight mark-underline" viewBox="0 0 520 54"><path d="M8 31 C110 12, 262 46, 512 23" stroke="#fff200" stroke-width="15" fill="none" stroke-linecap="round"/></svg>',
    "circle": '<svg class="highlight mark-circle" viewBox="0 0 520 170"><path d="M19 94 C60 14, 220 8, 338 30 C474 55, 497 133, 357 154 C212 176, 40 155, 19 94Z" stroke="#fff200" stroke-width="14" fill="none" stroke-linecap="round"/></svg>',
    "arrow": '<svg class="highlight mark-arrow" viewBox="0 0 220 160"><path d="M20 30 C96 58, 88 118, 167 101" stroke="#fff200" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M147 79 L176 102 L142 119" stroke="#fff200" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

def esc(value):
    return html.escape(str(value or ""))

def get_image_b64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception:
        return ""

def slide_html(slide, idx, total, kicker, author, img_b64):
    kind = "cover" if idx == 1 else "content"
    headline = esc(slide.get("headline", ""))
    body = esc(slide.get("body", ""))
    notes = slide.get("callouts", [])
    mark = slide.get("mark", "circle" if idx == 1 else "underline")
    callouts = "".join(f'<div class="callout">{esc(note)}</div>' for note in notes[:4])
    
    img_tag = f'<img src="data:image/png;base64,{img_b64}" alt="Visual"/>' if img_b64 else ''
    
    return f"""
    <section class="slide {kind}">
      <div class="topline"></div><div class="bottomline"></div>
      <div class="kicker">{esc(kicker)}</div><div class="author">{esc(author)}</div>
      {MARKS.get(mark, MARKS["underline"])}
      {MARKS["arrow"] if idx > 2 else ""}
      <div class="inner">
        <h1 class="headline">{headline}</h1>
        <p class="body">{body}</p>
        <div class="callouts">{callouts}</div>
      </div>
      <div class="visual">{img_tag}</div>
      <div class="swipe">SWIPE &lt;&lt;</div>
      <div class="page">{idx}</div>
    </section>
    """

def main():
    spec_path = Path("raj_spec.json")
    out_path = Path("raj_concession_carousel.html")
    
    # Map each slide to a specific processed image
    brain_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b"
    images = [
        os.path.join(brain_path, "user_image_processed.png"), # Slide 1 (Cover - user photo)
        os.path.join(brain_path, "slide2_img.png"), # Slide 2 (Banner cutoff)
        os.path.join(brain_path, "slide3_img.png"), # Slide 3 (Money falling)
        os.path.join(brain_path, "slide3_img.png"), # Slide 4 (Money falling again)
        os.path.join(brain_path, "slide5_img.png"), # Slide 5 (Data Screen)
    ]
    
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    slides = spec.get("slides", [])
    
    kicker = spec.get("kicker", "FIGURING OUT HUMANS")
    author = spec.get("author", "RAJ SHAMANI")
    
    body_slides = []
    for i, slide in enumerate(slides):
        img_path = images[i] if i < len(images) else ""
        img_b64 = get_image_b64(img_path)
        body_slides.append(slide_html(slide, i + 1, len(slides), kicker, author, img_b64))
        
    body = "\n".join(body_slides)
    
    html_doc = f"""<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>{esc(spec.get('title', 'Carousel'))}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>{CSS}</style>
</head>
<body>
<button class="dl-btn" onclick="downloadPDF()">⬇ EXPORT PDF</button>
<main class='deck'>
{body}
</main>
<script>
async function downloadPDF() {{
    const btn = document.querySelector('.dl-btn');
    btn.textContent = '⏳ RENDERING...';
    btn.disabled = true;
    const {{ jsPDF }} = window.jspdf;
    const pdf = new jsPDF({{ orientation:'portrait', unit:'px', format:[1080,1350] }});
    const slides = document.querySelectorAll('.slide');
    for (let i = 0; i < slides.length; i++) {{
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#ffffff" }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Raj_Shamani_Carousel.pdf');
    btn.textContent = '⬇ EXPORT PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>"""
    
    out_path.write_text(html_doc, encoding="utf-8")
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
