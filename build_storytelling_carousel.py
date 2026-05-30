"""
Raj Shamani Style Storytelling Carousel
Vibe: High contrast, creator-focused, heavily typographic.
Palette: Paper White (#F9F9F6), Ink Black (#111111), and Crimson Alert (#D32F2F)
Fonts: Playfair Display (Serif for story) + Inter (Sans for data/authority)
"""

import os

slides = [
    {
        "type": "story",
        "text": 'A tenant drops off her keys<br>at the end of a 12-month lease.'
    },
    {
        "type": "story",
        "text": 'Your leasing team blames the market.<br><br>They blame the new luxury high-rise.<br><br>They blame the $100 rent increase.'
    },
    {
        "type": "punch",
        "text": 'They are lying to you.'
    },
    {
        "type": "story",
        "text": 'She didn\'t leave because of the rent.<br><br>She left because her kitchen sink dripped for <span class="highlight">14 days.</span><br><br>Because she got an automated "ticket received" email for her broken AC, followed by <span class="highlight">72 hours of silence.</span>'
    },
    {
        "type": "statement",
        "text": 'Turnover is not a leasing problem.<br><br>It is an <span class="underline">operations problem.</span>'
    },
    {
        "type": "math",
        "title": 'THE BRUTAL MATH',
        "text": 'Replacing that one tenant just cost you <span class="red">$4,500.</span><br><br>Lost rent. Make-ready painting. Marketing. Broker commissions.'
    },
    {
        "type": "scale",
        "text": 'If you manage 200 units with a standard 35% turnover rate...<br><br>You are bleeding <span class="red-block">$315,000</span> every single year.'
    },
    {
        "type": "cta",
        "text": 'Protecting a renewal is not just "good customer service."<br><br><span class="highlight">It is yield defense.</span>',
        "footer": 'Aethera Operations Intelligence'
    }
]

total = len(slides)

def build_slide(slide, index):
    num = f"{index+1}/{total}"
    
    # Common Header
    header = f'<div class="header">NITHESH DEVARLA</div>'
    # Common Footer
    footer = f'<div class="footer"><span class="swipe">SWIPE &rarr;</span><span class="num">{num}</span></div>'
    if index == total - 1:
        footer = f'<div class="footer"><span class="swipe">@aethera_hq</span><span class="num">{num}</span></div>'

    content = ""

    if slide["type"] == "story":
        content = f'<div class="story-text">{slide["text"]}</div>'
    elif slide["type"] == "punch":
        content = f'<div class="punch-text">{slide["text"]}</div>'
    elif slide["type"] == "statement":
        content = f'<div class="statement-text">{slide["text"]}</div>'
    elif slide["type"] == "math":
        content = f'<div class="math-label">{slide["title"]}</div><div class="math-text">{slide["text"]}</div>'
    elif slide["type"] == "scale":
        content = f'<div class="scale-text">{slide["text"]}</div>'
    elif slide["type"] == "cta":
        content = f'<div class="cta-text">{slide["text"]}</div><div class="cta-logo">{slide.get("footer", "")}</div>'

    return f'''
    <div class="slide">
        {header}
        <div class="content-wrapper">
            {content}
        </div>
        {footer}
    </div>
    '''

slides_html = "\n".join([build_slide(s, i) for i, s in enumerate(slides)])

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Storytelling Carousel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root {{
    --bg: #F9F9F6; /* Premium paper cream */
    --text: #111111; /* Ink black */
    --accent: #D32F2F; /* Crimson red */
    --muted: #888888;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#333; display:flex; flex-direction:column; align-items:center; padding:40px 20px; gap:30px; }}
.dl-btn {{ position:fixed; top:20px; right:20px; z-index:999; background:var(--text); color:var(--bg); border:none; padding:14px 28px; border-radius:8px; font-family:'Inter',sans-serif; font-weight:800; cursor:pointer; letter-spacing:1px; }}

.slide {{
    width: 1080px;
    height: 1350px;
    background: var(--bg);
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 80px;
    transform: scale(0.45);
    transform-origin: top center;
    margin-bottom: -740px;
    color: var(--text);
    border: 1px solid #EAEAEA;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}}

.header {{
    font-family: 'Inter', sans-serif;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: 2px;
    color: var(--text);
    text-transform: uppercase;
}}

.content-wrapper {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 0 40px;
}}

/* Typography Styles */
.story-text {{
    font-family: 'Playfair Display', serif;
    font-size: 64px;
    font-weight: 600;
    line-height: 1.4;
}}

.punch-text {{
    font-family: 'Inter', sans-serif;
    font-size: 96px;
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -2px;
}}

.statement-text {{
    font-family: 'Inter', sans-serif;
    font-size: 72px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -1px;
}}

.math-label {{
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 4px;
    color: var(--accent);
    margin-bottom: 30px;
}}

.math-text {{
    font-family: 'Playfair Display', serif;
    font-size: 58px;
    font-weight: 600;
    line-height: 1.4;
}}

.scale-text {{
    font-family: 'Inter', sans-serif;
    font-size: 64px;
    font-weight: 800;
    line-height: 1.3;
}}

.cta-text {{
    font-family: 'Playfair Display', serif;
    font-size: 68px;
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 60px;
}}

.cta-logo {{
    font-family: 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 1px;
    padding: 16px 32px;
    background: var(--text);
    color: var(--bg);
}}

/* Highlights */
.highlight {{ background: rgba(211, 47, 47, 0.1); padding: 0 10px; color: var(--accent); }}
.underline {{ border-bottom: 6px solid var(--text); padding-bottom: 4px; }}
.red {{ color: var(--accent); font-weight: 900; font-family: 'Inter', sans-serif; }}
.red-block {{ background: var(--accent); color: white; padding: 4px 16px; font-family: 'Inter', sans-serif; font-weight: 900; }}

.footer {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 20px;
    color: var(--muted);
}}
.swipe {{ letter-spacing: 1px; }}
.num {{ font-weight: 800; color: var(--text); }}

@media print {{
    body {{ padding:0; gap:0; background:#fff; }}
    .slide {{ transform:scale(1); margin-bottom:0; page-break-after:always; box-shadow:none; border:none; }}
    .dl-btn {{ display:none; }}
}}
</style>
</head>
<body>
<button class="dl-btn" onclick="downloadPDF()">⬇ DOWNLOAD PDF</button>
{slides_html}
<script>
async function downloadPDF() {{
    const btn = document.querySelector('.dl-btn');
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;
    const {{ jsPDF }} = window.jspdf;
    const pdf = new jsPDF({{ orientation:'portrait', unit:'px', format:[1080,1350] }});
    const slides = document.querySelectorAll('.slide');
    for (let i = 0; i < slides.length; i++) {{
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350,
            onclone: function(doc) {{
                doc.querySelectorAll('.slide').forEach(s => {{ s.style.transform='scale(1)'; s.style.marginBottom='0'; }});
            }}
        }});
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Storytelling_Carousel.pdf');
    btn.textContent = '⬇ DOWNLOAD PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "tenant_retention_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[OK] Carousel saved to: {output_path}")
