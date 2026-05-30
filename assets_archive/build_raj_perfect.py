import html
import json
import base64
from pathlib import Path

CSS = r"""
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #222;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #111;
  display: flex;
  justify-content: center;
  padding: 2rem;
}
.deck {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}
.slide {
  position: relative;
  width: 1080px;
  height: 1350px;
  background-color: #fff;
  /* Grid paper background */
  background-image: linear-gradient(#f0f0f0 1px, transparent 1px), linear-gradient(90deg, #f0f0f0 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: center center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  height: 140px;
  position: relative;
  border-bottom: 2px solid #111;
  margin: 40px 60px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #111;
  padding: 0 20px;
}
.kicker, .author {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Main Content Area */
.content-wrapper {
  flex: 1;
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  justify-content: center; /* Center everything vertically so it's not at the top */
  position: relative;
  z-index: 10;
}

.headline {
  font-size: 76px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 30px 0;
  letter-spacing: -1px;
  max-width: 900px;
}

.cover .headline {
  font-size: 92px;
}

.body {
  font-size: 34px;
  line-height: 1.4;
  margin: 0 0 40px 0;
  max-width: 800px;
  color: #333;
}

/* Marker Highlight (Actually aligns with text!) */
.marker {
  position: relative;
  display: inline-block;
  z-index: 1;
}
.marker::after {
  content: "";
  position: absolute;
  left: -10px;
  right: -10px;
  bottom: 0px;
  height: 40%;
  background-color: #fff200;
  z-index: -1;
  transform: rotate(-1deg);
}

/* Image Placement - Integrated, not floating randomly */
.visual-container {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-top: 20px;
}

.visual {
  width: 350px;
  height: 350px;
  flex-shrink: 0;
}

.cover .visual-container {
  justify-content: center;
  margin-top: 60px;
}

.cover .visual {
  width: 500px;
  height: 500px;
}

.visual img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* grayscale filter applied to the image directly */
}

/* Callouts block */
.callouts {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.callout {
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 15px;
}
.callout::before {
  content: "→";
  color: #fff200;
  font-size: 35px;
  background: #111;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Footer */
.footer {
  height: 120px;
  position: relative;
  margin: 0 60px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.swipe {
  border: 3px solid #111;
  border-radius: 50px;
  padding: 8px 24px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1px;
}

.page {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #fff200;
  font-size: 22px;
  font-weight: 900;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 3px solid #111;
}

.dl-btn { position:fixed; top:20px; right:20px; z-index:999; background:#fff200; color:#111; border:3px solid #111; padding:16px 32px; border-radius:50px; font-weight:800; cursor:pointer; letter-spacing:1px; text-transform:uppercase; box-shadow: 0 10px 0 rgba(0,0,0,1); transition: 0.1s; }
.dl-btn:active { transform: translateY(10px); box-shadow: 0 0 0 rgba(0,0,0,1); }

@media print {
  body { background: #fff; padding: 0; display: block;}
  .deck { display: block; padding: 0; gap: 0; }
  .slide { width: 1080px; height: 1350px; page-break-after: always; box-shadow: none; margin: 0;}
  .dl-btn { display: none; }
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

def generate_carousel():
    slides_data = [
        {
            "headline": "Why giving <span class='marker'>\"One Month Free\"</span> destroys your building's value.",
            "body": "It's the most common reaction to a softening market. It's also the most expensive mistake operators make.",
            "img_path": r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\user_image_processed.png",
            "is_cover": True
        },
        {
            "headline": "The <span class='marker'>Panic Move.</span>",
            "body": "Vacancy ticks up 2%. Your leasing manager panics, looks at the competitor across the street, and blindly copies their special.",
            "callouts": ["No Data Used", "Pure Emotional Reaction"],
            "img_path": r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\slide2_img.png"
        },
        {
            "headline": "The <span class='marker'>Concession Trap.</span>",
            "body": "You give away $2,500 to 30 new tenants this year. But half of them were ready to sign for a simple $500 deposit reduction.",
            "callouts": ["$75,000 Given Away", "Half of it Unnecessary"],
            "img_path": r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\slide3_img.png"
        },
        {
            "headline": "The <span class='marker'>Brutal Math.</span>",
            "body": "$37,500 in NOI completely wasted. At a 5% Cap Rate, that single panic move just erased massive value from your property.",
            "callouts": ["-$37.5k Cash", "-$750k Property Value"],
            "img_path": r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\slide3_img.png"
        },
        {
            "headline": "<span class='marker'>Stop guessing.</span>",
            "body": "Use real-time market intelligence. Know exactly what concessions are needed to close the lease—and not a single dollar more.",
            "callouts": ["Deploy Aethera Intelligence", "Comment 'YIELD' below"],
            "img_path": r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\slide5_img.png"
        }
    ]

    kicker = "OPERATIONAL INTELLIGENCE"
    author = "NITHESH DEVARLA"

    html_slides = []
    
    for idx, slide in enumerate(slides_data, start=1):
        kind = "cover" if slide.get("is_cover") else "content"
        headline = slide["headline"] # Not escaping here to keep the HTML span tags
        body = esc(slide.get("body", ""))
        
        callouts_html = ""
        if "callouts" in slide:
            c_items = "".join([f"<div class='callout'>{esc(c)}</div>" for c in slide["callouts"]])
            callouts_html = f"<div class='callouts'>{c_items}</div>"
            
        img_b64 = get_image_b64(slide["img_path"])
        img_html = f"<img src='data:image/png;base64,{img_b64}' />" if img_b64 else ""

        # Layout logic: if cover, image goes below text. If content, image goes next to callouts.
        slide_html = f"""
        <section class="slide {kind}">
          <div class="header">
            <div class="kicker">{esc(kicker)}</div>
            <div class="author">{esc(author)}</div>
          </div>
          
          <div class="content-wrapper">
            <h1 class="headline">{headline}</h1>
            <p class="body">{body}</p>
            
            <div class="visual-container">
              {f"<div class='callouts-col'>{callouts_html}</div>" if callouts_html else ""}
              <div class="visual">{img_html}</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="swipe">SWIPE &lt;&lt;</div>
            <div class="page">{idx}</div>
          </div>
        </section>
        """
        html_slides.append(slide_html)

    full_html = f"""<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<title>The Concession Trap</title>
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
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#ffffff" }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Raj_Shamani_Carousel_V2.pdf');
    btn.textContent = '⬇ EXPORT PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>"""

    Path("raj_concession_carousel_v2.html").write_text(full_html, encoding="utf-8")
    print("Generated perfect fit carousel layout.")

if __name__ == "__main__":
    generate_carousel()
