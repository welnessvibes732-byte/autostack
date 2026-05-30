"""
God Mode Storytelling Carousel
Vibe: Ultra-Premium, Glassmorphism, Brutalist Typography, Pitch Black + Neon Accents.
The absolute highest-end PDF export for LinkedIn.
"""

import os
import base64

def image_to_b64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Failed to load image {path}: {e}")
        return ""

img1_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\pm_overwhelmed_1779297487501.png"
img2_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\unpaid_invoices_1779297618432.png"

pm_b64 = image_to_b64(img1_path)
invoices_b64 = image_to_b64(img2_path)

assets_path = os.path.join(os.path.dirname(__file__), "assets_b64.txt")
profile_b64 = ""
if os.path.exists(assets_path):
    with open(assets_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("PROFILE:"):
                profile_b64 = line.strip().replace("PROFILE:", "")

slides = [
    {
        "type": "cover",
        "image": pm_b64,
        "kicker": "AETHERA INTELLIGENCE",
        "title": "THE<br>SCALING<br>TRAP.",
        "subtitle": "Why doubling your portfolio<br>just tripled your overhead."
    },
    {
        "type": "big_number",
        "number": "75",
        "kicker": "THE BREAKING POINT",
        "text": "A property manager can handle exactly 75 doors before they break. <br><br>That is not an opinion. <br>It is the mathematical limit of human capacity."
    },
    {
        "type": "glass_split",
        "image": invoices_b64,
        "title": "THE FATAL FLAW",
        "text": "When you acquire 500 new doors, your revenue doubles. But to handle the volume, you hire 3 more asset managers.<br><br>Suddenly, 6 more salaries are eating your Net Operating Income."
    },
    {
        "type": "centered_glass",
        "kicker": "THE HUMAN API TAX",
        "text": "You are paying <span class='accent-red'>$70,000 a year</span> for an elite asset manager...<br><br>...and using them as a <span class='accent-blue'>human router</span> between 6 different platforms."
    },
    {
        "type": "manifesto",
        "title": "THE PARADIGM SHIFT",
        "text": "The firms pulling ahead in 2026 aren\'t hiring faster.<br><br>They are ripping out their legacy software and embedding autonomous operational layers directly into their workflow.<br><br>They don\'t buy software for their managers. They buy an engine that <span class='italic-serif'>multiplies</span> them."
    },
    {
        "type": "cta",
        "text": "Stop buying doors if you don\'t have the architecture to run them profitably.",
        "stats": "4 PEOPLE. 1,000 DOORS. ZERO COMPROMISES."
    }
]

total = len(slides)

def build_slide(slide, index):
    num = f"0{index+1}"
    
    # Base layout
    header = f'<div class="header">AETHERA</div>'
    
    profile_small_html = f'<img src="data:image/jpeg;base64,{profile_b64}" class="footer-profile" />' if profile_b64 else ''
    footer = f'''
    <div class="footer">
        <div class="footer-left">
            {profile_small_html}
            <div class="footer-brand">
                <span style="color:#fff; font-family:\'Clash Display\'; font-weight:700;">NITHESH DEVARLA</span><br>
                <span style="font-size:12px;">AETHERA INTELLIGENCE</span>
            </div>
        </div>
        <div class="footer-right">{num} // {total:02d}</div>
    </div>
    '''
    
    content = ""
    
    if slide["type"] == "cover":
        content = f'''
        <div class="bg-glow blue-glow" style="top:-10%; left:-10%;"></div>
        <img src="data:image/png;base64,{slide['image']}" class="bg-image cover-img" />
        <div class="gradient-overlay"></div>
        <div class="cover-content">
            <div class="kicker">{slide["kicker"]}</div>
            <h1 class="massive-title">{slide["title"]}</h1>
            <div class="subtitle">{slide["subtitle"]}</div>
        </div>
        '''
    elif slide["type"] == "big_number":
        content = f'''
        <div class="bg-glow red-glow" style="bottom:10%; right:-10%;"></div>
        <div class="giant-bg-number">{slide["number"]}</div>
        <div class="content-box glass-panel">
            <div class="kicker">{slide["kicker"]}</div>
            <div class="body-text">{slide["text"]}</div>
        </div>
        '''
    elif slide["type"] == "glass_split":
        content = f'''
        <img src="data:image/png;base64,{slide['image']}" class="bg-image split-bg-img" />
        <div class="gradient-overlay-side"></div>
        <div class="glass-split-panel">
            <div class="kicker">{slide["title"]}</div>
            <div class="body-text">{slide["text"]}</div>
        </div>
        '''
    elif slide["type"] == "centered_glass":
        content = f'''
        <div class="bg-glow blue-glow" style="top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.1; width:1000px; height:1000px;"></div>
        <div class="centered-glass-panel glass-panel">
            <div class="kicker" style="text-align:center;">{slide["kicker"]}</div>
            <div class="body-text" style="text-align:center; font-size:64px;">{slide["text"]}</div>
        </div>
        '''
    elif slide["type"] == "manifesto":
        content = f'''
        <div class="manifesto-panel">
            <div class="kicker">{slide["title"]}</div>
            <div class="body-text">{slide["text"]}</div>
        </div>
        '''
    elif slide["type"] == "cta":
        profile_html = f'<img src="data:image/jpeg;base64,{profile_b64}" class="cta-profile" />' if profile_b64 else ''
        content = f'''
        <div class="bg-glow blue-glow" style="top:0; left:20%; width: 800px; height: 800px; opacity:0.15;"></div>
        <div class="cta-wrapper">
            <div class="stats-text">{slide["stats"]}</div>
            <div class="cta-headline">{slide["text"]}</div>
            <div class="cta-author">
                {profile_html}
                <div class="author-info">
                    <div class="author-name">NITHESH DEVARLA</div>
                    <div class="author-title">FOUNDER, AETHERA</div>
                </div>
            </div>
        </div>
        '''

    return f'''
    <div class="slide">
        {header}
        <div class="slide-inner {slide['type']}">
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
<title>Aethera GOD MODE Carousel</title>
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@200,400,600,700&f[]=switzer@300,400,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root {{
    --bg: #050505;
    --text: #ffffff;
    --accent-blue: #00E5FF;
    --accent-red: #FF003C;
    --glass-bg: rgba(255, 255, 255, 0.03);
    --glass-border: rgba(255, 255, 255, 0.08);
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#111; display:flex; flex-direction:column; align-items:center; padding:40px 20px; gap:40px; }}
.dl-btn {{ position:fixed; top:20px; right:20px; z-index:999; background:var(--text); color:var(--bg); border:none; padding:16px 32px; border-radius:50px; font-family:'Clash Display',sans-serif; font-weight:700; cursor:pointer; letter-spacing:1px; text-transform:uppercase; box-shadow: 0 10px 30px rgba(255,255,255,0.2); transition: 0.3s; }}
.dl-btn:hover {{ transform: scale(1.05); }}

.slide {{
    width: 1080px;
    height: 1350px;
    background: var(--bg);
    position: relative;
    overflow: hidden;
    transform: scale(0.45);
    transform-origin: top center;
    margin-bottom: -740px;
    color: var(--text);
    border: 1px solid #222;
}}

/* Structural Elements */
.header {{ position:absolute; top:50px; left:60px; font-family:'Clash Display', sans-serif; font-weight:700; font-size:24px; letter-spacing:8px; z-index:100; }}
.footer {{ position:absolute; bottom:50px; left:60px; right:60px; display:flex; justify-content:space-between; align-items:center; font-family:'Switzer', sans-serif; font-weight:600; font-size:16px; letter-spacing:4px; z-index:100; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
.footer-left {{ display:flex; align-items:center; gap:16px; text-align:left; }}
.footer-profile {{ width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2); }}
.footer-brand {{ display:flex; flex-direction:column; justify-content:center; line-height:1.3; letter-spacing:3px; font-size:14px; }}

.slide-inner {{ width:100%; height:100%; position:relative; z-index:10; display:flex; }}

/* Background FX */
.bg-image {{ position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1; filter: grayscale(50%) contrast(1.2); }}
.gradient-overlay {{ position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to top, #050505 0%, rgba(5,5,5,0.7) 40%, rgba(5,5,5,0.3) 100%); z-index:2; }}
.gradient-overlay-side {{ position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to right, #050505 0%, #050505 40%, rgba(5,5,5,0.1) 100%); z-index:2; }}

.bg-glow {{ position:absolute; width:600px; height:600px; border-radius:50%; filter:blur(120px); z-index:1; opacity:0.25; }}
.blue-glow {{ background:var(--accent-blue); }}
.red-glow {{ background:var(--accent-red); }}

/* Typography & Layouts */
.kicker {{ font-family:'Clash Display', sans-serif; font-weight:600; font-size:20px; letter-spacing:6px; color:var(--accent-blue); margin-bottom:24px; text-transform:uppercase; }}
.body-text {{ font-family:'Switzer', sans-serif; font-weight:400; font-size:52px; line-height:1.4; color:#E0E0E0; }}
.italic-serif {{ font-family:'Playfair Display', serif; font-style:italic; font-weight:600; color:var(--accent-red); }}
.accent-red {{ color:var(--accent-red); font-weight:600; }}
.accent-blue {{ color:var(--accent-blue); font-weight:600; }}

/* Slide 1: Cover */
.cover-content {{ position:absolute; bottom:150px; left:60px; right:60px; z-index:10; }}
.massive-title {{ font-family:'Clash Display', sans-serif; font-weight:700; font-size:160px; line-height:0.9; text-transform:uppercase; margin-bottom:40px; letter-spacing: -2px; }}
.subtitle {{ font-family:'Switzer', sans-serif; font-weight:400; font-size:42px; line-height:1.3; color:rgba(255,255,255,0.7); }}

/* Slide 2: Big Number */
.giant-bg-number {{ position:absolute; top:-50px; right:-20px; font-family:'Clash Display', sans-serif; font-weight:700; font-size:800px; line-height:1; color:rgba(255,255,255,0.03); z-index:1; letter-spacing:-20px; }}
.glass-panel {{ position:absolute; top:50%; left:60px; transform:translateY(-50%); width:850px; background:var(--glass-bg); backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); border:1px solid var(--glass-border); border-radius:24px; padding:80px; z-index:10; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}

/* Slide 3: Glass Split */
.glass-split-panel {{ position:absolute; top:0; left:0; height:100%; width:65%; background:var(--glass-bg); backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); border-right:1px solid var(--glass-border); z-index:10; display:flex; flex-direction:column; justify-content:center; padding:0 80px 0 60px; }}

/* Slide 4: Centered Glass */
.centered-glass-panel {{ position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:850px; text-align:center; padding:100px 80px; z-index:10; }}

/* Slide 5: Manifesto */
.manifesto-panel {{ width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; padding:0 120px; z-index:10; position:relative; }}

/* Slide 6: CTA */
.cta-wrapper {{ width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:0 80px; z-index:10; position:relative; }}
.stats-text {{ font-family:'Clash Display', sans-serif; font-weight:700; font-size:42px; color:var(--accent-blue); letter-spacing:4px; margin-bottom:40px; }}
.cta-headline {{ font-family:'Switzer', sans-serif; font-weight:400; font-size:64px; line-height:1.2; margin-bottom:100px; }}
.cta-author {{ display:flex; align-items:center; gap:30px; }}
.cta-profile {{ width:160px; height:160px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2); }}
.author-info {{ text-align:left; }}
.author-name {{ font-family:'Clash Display', sans-serif; font-weight:700; font-size:32px; letter-spacing:2px; margin-bottom:8px; }}
.author-title {{ font-family:'Switzer', sans-serif; font-weight:600; font-size:18px; color:rgba(255,255,255,0.5); letter-spacing:3px; }}

@media print {{
    body {{ padding:0; gap:0; background:#fff; }}
    .slide {{ transform:scale(1); margin-bottom:0; page-break-after:always; border:none; }}
    .dl-btn {{ display:none; }}
}}
</style>
</head>
<body>
<button class="dl-btn" onclick="downloadPDF()">⬇ EXPORT GOD MODE PDF</button>
{slides_html}
<script>
async function downloadPDF() {{
    const btn = document.querySelector('.dl-btn');
    btn.textContent = '⏳ RENDERING...';
    btn.disabled = true;
    const {{ jsPDF }} = window.jspdf;
    const pdf = new jsPDF({{ orientation:'portrait', unit:'px', format:[1080,1350] }});
    const slides = document.querySelectorAll('.slide');
    for (let i = 0; i < slides.length; i++) {{
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#050505",
            onclone: function(doc) {{
                doc.querySelectorAll('.slide').forEach(s => {{ s.style.transform='scale(1)'; s.style.marginBottom='0'; }});
            }}
        }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Aethera_God_Mode_Carousel.pdf');
    btn.textContent = '⬇ EXPORT GOD MODE PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "god_mode_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[GOD MODE] High-End Professional Carousel saved to: {output_path}")
