import html
import json
import sys
import base64
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');

* { box-sizing: border-box; }
body {
  margin: 0;
  background: #121214;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #18181b;
  display: flex;
  justify-content: center;
  padding: 3rem;
}
.deck {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
  justify-content: center;
}
.slide {
  position: relative;
  width: 1080px;
  height: 1350px;
  background-color: #fbfbfa;
  background-image: 
    linear-gradient(#f0eee9 1.5px, transparent 1.5px), 
    linear-gradient(90deg, #f0eee9 1.5px, transparent 1.5px);
  background-size: 45px 45px;
  background-position: center center;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 4px solid #18181b;
  border-radius: 24px;
}

/* ── Header ────────────────────────────────────── */
.header {
  height: 130px;
  flex-shrink: 0;
  border-bottom: 3px solid #18181b;
  margin: 40px 60px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
}
.kicker {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #52525b;
}

/* Round avatar next to author in header */
.author-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 3px solid #18181b;
  padding: 8px 18px;
  border-radius: 40px;
  box-shadow: 3px 3px 0px #18181b;
}
.header-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #18181b;
  object-fit: cover;
  object-position: center;
  filter: grayscale(100%);
}
.author-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #18181b;
}

/* ── Content wrapper ────────────────────────────── */
.content-wrapper {
  flex: 1;
  padding: 50px 70px 30px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  z-index: 10;
  overflow: hidden;
}

.headline {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px 0;
  letter-spacing: -2px;
  color: #18181b;
}
.cover .headline {
  font-size: 82px;
  line-height: 1.08;
  margin-bottom: 30px;
}

.body {
  font-size: 32px;
  line-height: 1.45;
  margin: 0 0 35px 0;
  color: #3f3f46;
  max-width: 920px;
  font-weight: 500;
}
.cover .body {
  font-size: 34px;
  color: #27272a;
}

/* ── Yellow marker highlight ─────────────────────── */
.marker {
  position: relative;
  display: inline;
  z-index: 1;
  padding: 0 4px;
}
.marker::after {
  content: "";
  position: absolute;
  left: 0; right: 0;
  bottom: 4px;
  height: 40%;
  background: #ffe600;
  z-index: -1;
  transform: rotate(-1deg);
}

/* ── Row: icon + callouts ────────────────────────── */
.visual-container {
  display: flex;
  align-items: stretch;
  gap: 40px;
  margin-top: 10px;
  flex: 1;
  min-height: 0;
}

/* Icon image card layout — beautifully contained */
.visual-card {
  width: 240px;
  background: #ffffff;
  border: 3px solid #18181b;
  border-radius: 20px;
  box-shadow: 6px 6px 0px #18181b;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  flex-shrink: 0;
}
.visual-card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: grayscale(100%);
}

/* Cover and Last Slide Layout */
.cover-layout {
  display: flex;
  align-items: center;
  gap: 50px;
  margin-top: 20px;
  flex: 1;
}

/* Round Creator Avatar Badge (Cover/Last) */
.creator-badge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.creator-avatar-large {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 5px solid #18181b;
  box-shadow: 8px 8px 0px #18181b;
  overflow: hidden;
  background: #ffe600;
}
.creator-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: grayscale(100%);
}
.creator-label {
  background: #18181b;
  color: #ffe600;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 6px 16px;
  border-radius: 30px;
  box-shadow: 4px 4px 0px rgba(0,0,0,0.15);
}

/* ── Callouts ────────────────────────────────────── */
.callouts {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  justify-content: center;
}
.callout {
  background: #ffffff;
  border: 3px solid #18181b;
  padding: 18px 26px;
  border-radius: 14px;
  font-size: 28px;
  font-weight: 700;
  color: #18181b;
  box-shadow: 5px 5px 0px #18181b;
  display: flex;
  align-items: center;
  gap: 16px;
  line-height: 1.3;
}
.callout::before {
  content: "→";
  color: #ffe600;
  font-size: 22px;
  background: #18181b;
  min-width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

/* Last slide CTA Panel */
.cta-panel {
  background: #ffe600;
  border: 4px solid #18181b;
  border-radius: 24px;
  padding: 35px;
  box-shadow: 8px 8px 0px #18181b;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.cta-title {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  margin: 0;
  color: #18181b;
}
.cta-text {
  font-size: 26px;
  line-height: 1.4;
  margin: 0;
  color: #18181b;
  font-weight: 600;
}

/* ── Footer ──────────────────────────────────────── */
.footer {
  height: 110px;
  flex-shrink: 0;
  margin: 0 60px 40px;
  border-top: 3px solid #18181b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
}
.swipe {
  border: 3px solid #18181b;
  border-radius: 50px;
  padding: 10px 28px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  background: #ffffff;
  box-shadow: 3px 3px 0px #18181b;
}
.page {
  width: 54px; height: 54px;
  border-radius: 50%;
  background: #ffe600;
  font-size: 24px;
  font-weight: 900;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 3px solid #18181b;
  box-shadow: 3px 3px 0px #18181b;
}

.dl-btn { 
  position: fixed; 
  top: 20px; 
  right: 20px; 
  z-index: 999; 
  background: #ffe600; 
  color: #18181b; 
  border: 3px solid #18181b; 
  padding: 16px 32px; 
  border-radius: 50px; 
  font-weight: 800; 
  cursor: pointer; 
  letter-spacing: 1.5px; 
  text-transform: uppercase; 
  box-shadow: 0 8px 0 #18181b; 
  transition: 0.1s; 
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
}
.dl-btn:active { 
  transform: translateY(8px); 
  box-shadow: 0 0 0 #18181b; 
}

@media print {
  body { background:#fff; padding:0; display:block; }
  .deck { display:block; padding:0; gap:0; }
  .slide { width:1080px; height:1350px; page-break-after:always; box-shadow:none; margin:0; border-radius:0; border:none; }
  .dl-btn { display:none; }
}
"""

def esc(value):
    return html.escape(str(value or ""))

def get_image_b64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception:
        return ""

def main():
    if len(sys.argv) != 3:
        print("Usage: build_carousel.py spec.json output.html", file=sys.stderr)
        raise SystemExit(2)

    spec_path = Path(sys.argv[1])
    out_path  = Path(sys.argv[2])
    spec       = json.loads(spec_path.read_text(encoding="utf-8"))
    slides_data = spec.get("slides", [])
    if not slides_data:
        raise SystemExit("spec.json must contain at least one slide")

    kicker = spec.get("kicker", "REAL ESTATE MONEY TALK")
    author = spec.get("author", "AETHERA")

    # Pre-load cover image for avatar (first slide with img_path)
    cover_img_b64 = ""
    for s in slides_data:
        if s.get("img_path"):
            cover_img_b64 = get_image_b64(s["img_path"])
            break

    html_slides = []
    total = len(slides_data)

    for idx, slide in enumerate(slides_data, start=1):
        is_cover   = slide.get("is_cover", False)
        is_last    = (idx == total)
        kind       = "cover" if is_cover else ("last-slide" if is_last else "content")

        # Yellow marker highlight in headline
        headline = slide.get("headline", "")
        hw = slide.get("highlight", "")
        if hw and hw in headline:
            headline = headline.replace(hw, f"<span class='marker'>{hw}</span>")

        body = esc(slide.get("body", ""))

        # Callouts
        callouts_html = ""
        if "callouts" in slide:
            items = "".join([f"<div class='callout'>{esc(c)}</div>" for c in slide["callouts"]])
            callouts_html = f"<div class='callouts'>{items}</div>"

        # Image (icon or cutout)
        img_b64  = get_image_b64(slide["img_path"]) if slide.get("img_path") else ""
        ext      = Path(slide.get("img_path","x.png")).suffix.lower()
        mime     = "image/png" if ext == ".png" else "image/jpeg"
        img_html = f"<img src='data:{mime};base64,{img_b64}' />" if img_b64 else ""

        # Header has round avatar
        avatar_html = f"<div class='author-badge'><img class='header-avatar' src='data:image/png;base64,{cover_img_b64}' /><span class='author-name'>{esc(author)}</span></div>" if cover_img_b64 else f"<div class='author-badge'><span class='author-name'>{esc(author)}</span></div>"
        
        header_html = f"""
        <div class="header">
          <div class="kicker">{esc(kicker)}</div>
          {avatar_html}
        </div>"""

        # Visual layout for each slide type
        if is_cover:
            # large circular creator badge next to the title or content
            badge_html = ""
            if img_b64:
                badge_html = f"""
                <div class="creator-badge-container">
                  <div class="creator-avatar-large">
                    <img src="data:image/png;base64,{img_b64}" />
                  </div>
                  <div class="creator-label">SPECIALIST</div>
                </div>"""
            
            visual_block = f"""
            <div class="cover-layout">
              <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                <div class="callout" style="background: #ffe600; font-size: 28px; box-shadow: 5px 5px 0px #18181b;">
                  10x Operational Telemetry
                </div>
                <div class="callout" style="font-size: 28px; box-shadow: 5px 5px 0px #18181b;">
                  Zero Decision Lag
                </div>
              </div>
              {badge_html}
            </div>"""

        elif is_last:
            badge_html = ""
            if img_b64:
                badge_html = f"""
                <div class="creator-badge-container">
                  <div class="creator-avatar-large">
                    <img src="data:image/png;base64,{img_b64}" />
                  </div>
                  <div class="creator-label">AETHERA</div>
                </div>"""
                
            visual_block = f"""
            <div class="cover-layout">
              {badge_html}
              <div class="cta-panel">
                <h2 class="cta-title">LET'S BUILD VALUE</h2>
                <p class="cta-text">Deploy Aethera's high-fidelity telemetry to unlock 3.5% hidden yield.</p>
                <div class="callout" style="background:#ffffff; margin-top: 10px; font-size: 24px; padding: 12px 20px;">
                  Send a DM to get started
                </div>
              </div>
            </div>"""

        else:
            # content slides: icon left + callouts right
            if img_html and callouts_html:
                visual_block = f"""
                <div class="visual-container">
                  <div class="visual-card">{img_html}</div>
                  {callouts_html}
                </div>"""
            elif callouts_html:
                visual_block = f"""
                <div class="visual-container">
                  {callouts_html}
                </div>"""
            elif img_html:
                visual_block = f"""
                <div class="visual-container">
                  <div class="visual-card">{img_html}</div>
                </div>"""
            else:
                visual_block = ""

        # Footer swipe text
        swipe_text = "SWIPE →" if idx < total else "FOLLOW FOR MORE"

        slide_html = f"""
        <section class="slide {kind}">
          {header_html}

          <div class="content-wrapper">
            <h1 class="headline">{headline}</h1>
            <p class="body">{body}</p>
            {visual_block}
          </div>

          <div class="footer">
            <div class="swipe">{swipe_text}</div>
            <div class="page">{idx}</div>
          </div>
        </section>
        """
        html_slides.append(slide_html)

    full_html = f"""<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<title>{esc(spec.get('title', 'Carousel'))}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>{CSS}</style>
</head>
<body>
<button class="dl-btn" onclick="downloadPDF()">⬇ EXPORT PDF</button>
<div class='deck'>
{"".join(html_slides)}
</div>
<script>
async function downloadPDF() {{
    const btn = document.querySelector('.dl-btn');
    btn.textContent = '⏳ RENDERING...';
    btn.disabled = true;
    const {{ jsPDF }} = window.jspdf;
    const pdf = new jsPDF({{ orientation:'portrait', unit:'px', format:[1080,1350] }});
    const slides = document.querySelectorAll('.slide');
    for (let i = 0; i < slides.length; i++) {{
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#fbfbfa" }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('{esc(spec.get("title", "Carousel"))}.pdf');
    btn.textContent = '⬇ EXPORT PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>"""

    out_path.write_text(full_html, encoding="utf-8")
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
