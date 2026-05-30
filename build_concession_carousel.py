"""
Concession Trap Carousel
Vibe: Ultra-Premium, 100% Consistent Cinematic Theme (God Mode Cover Style on every slide).
Story: Sarah's panic concession that cost $750K in valuation.
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

img_sarah = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\sarah_leasing_manager_1779458072044.png"
img_banner = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\one_month_free_banner_1779458266569.png"
img_money = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\money_falling_waste_1779458336219.png"
img_data = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\market_data_screen_1779458655346.png"

sarah_b64 = image_to_b64(img_sarah)
banner_b64 = image_to_b64(img_banner)
money_b64 = image_to_b64(img_money)
data_b64 = image_to_b64(img_data)

assets_path = os.path.join(os.path.dirname(__file__), "assets_b64.txt")
profile_b64 = ""
if os.path.exists(assets_path):
    with open(assets_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("PROFILE:"):
                profile_b64 = line.strip().replace("PROFILE:", "")

slides = [
    {
        "type": "cinematic",
        "image": sarah_b64,
        "kicker": "AETHERA INTELLIGENCE",
        "title": "THE CONCESSION<br>TRAP.",
        "subtitle": "How one panic decision cost a building $750,000."
    },
    {
        "type": "cinematic",
        "image": banner_b64,
        "kicker": "THE PANIC MOVE",
        "title": "ONE MONTH<br>FREE.",
        "subtitle": "Vacancy ticked up 2%.<br>Sarah's boss sent one email: \"Fix it.\""
    },
    {
        "type": "cinematic",
        "image": money_b64,
        "kicker": "THE REAL COST",
        "title": "$75,000<br>GONE.",
        "subtitle": "30 turnovers. Same blanket concession.<br>Half of them didn't need it."
    },
    {
        "type": "cinematic",
        "image": sarah_b64,
        "kicker": "THE VALUATION HIT",
        "title": "$750,000<br>ERASED.",
        "subtitle": "She didn't protect occupancy.<br>She destroyed the building's value."
    },
    {
        "type": "cinematic",
        "image": data_b64,
        "kicker": "THE FIX",
        "title": "REAL-TIME<br>INTEL.",
        "subtitle": "Know what your competitor is actually offering.<br>Not last quarter. Right now."
    },
    {
        "type": "cta",
        "image": data_b64,
        "text": "Drop 'YIELD' in the comments to get our 2026 Yield Defense Framework.",
        "stats": "COMMENT 'YIELD' BELOW"
    }
]

total = len(slides)

def build_slide(slide, index):
    num = f"0{index+1}"
    
    header = f'<div class="header">AETHERA</div>'
    
    profile_small_html = f'<img src="data:image/jpeg;base64,{profile_b64}" class="footer-profile" />' if profile_b64 else ''
    footer = f'''
    <div class="footer">
        <div class="footer-left">
            {profile_small_html}
            <div class="footer-brand">
                <span style="color:#fff; font-family:'Clash Display'; font-weight:700;">NITHESH DEVARLA</span><br>
                <span style="font-size:12px;">AETHERA INTELLIGENCE</span>
            </div>
        </div>
        <div class="footer-right">{num} // {total:02d}</div>
    </div>
    '''
    
    content = ""
    
    if slide["type"] == "cinematic":
        content = f'''
        <div class="bg-glow blue-glow" style="top:-10%; left:-10%;"></div>
        <img src="data:image/png;base64,{slide['image']}" class="bg-image cover-img" />
        <div class="gradient-overlay"></div>
        <div class="cover-content glass-card">
            <div class="kicker">{slide["kicker"]}</div>
            <h1 class="massive-title">{slide["title"]}</h1>
            <div class="subtitle">{slide["subtitle"]}</div>
        </div>
        '''
    elif slide["type"] == "cta":
        profile_html = f'<img src="data:image/jpeg;base64,{profile_b64}" class="cta-profile" />' if profile_b64 else ''
        content = f'''
        <img src="data:image/png;base64,{slide['image']}" class="bg-image cover-img" />
        <div class="gradient-overlay"></div>
        <div class="bg-glow blue-glow" style="top:0; left:20%; width: 800px; height: 800px; opacity:0.15;"></div>
        <div class="cta-wrapper glass-card-centered">
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
        <div class="slide-inner">
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
<title>Aethera Concession Trap Carousel</title>
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

.header {{ position:absolute; top:50px; left:60px; font-family:'Clash Display', sans-serif; font-weight:700; font-size:24px; letter-spacing:8px; z-index:100; }}
.footer {{ position:absolute; bottom:50px; left:60px; right:60px; display:flex; justify-content:space-between; align-items:center; font-family:'Switzer', sans-serif; font-weight:600; font-size:16px; letter-spacing:4px; z-index:100; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }}
.footer-left {{ display:flex; align-items:center; gap:16px; text-align:left; }}
.footer-profile {{ width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2); }}
.footer-brand {{ display:flex; flex-direction:column; justify-content:center; line-height:1.3; letter-spacing:3px; font-size:14px; }}

.slide-inner {{ width:100%; height:100%; position:relative; z-index:10; display:flex; }}

.bg-image {{ position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1; filter: grayscale(50%) contrast(1.2); opacity: 0.8; }}
.gradient-overlay {{ position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to top, #050505 10%, rgba(5,5,5,0.8) 40%, rgba(5,5,5,0.3) 100%); z-index:2; }}

.bg-glow {{ position:absolute; width:600px; height:600px; border-radius:50%; filter:blur(120px); z-index:1; opacity:0.25; }}
.blue-glow {{ background:var(--accent-blue); }}

.kicker {{ font-family:'Clash Display', sans-serif; font-weight:600; font-size:24px; letter-spacing:6px; color:var(--accent-blue); margin-bottom:24px; text-transform:uppercase; }}
.massive-title {{ font-family:'Clash Display', sans-serif; font-weight:700; font-size:130px; line-height:0.95; text-transform:uppercase; margin-bottom:40px; letter-spacing: -2px; text-shadow: 0 10px 30px rgba(0,0,0,0.8); }}
.subtitle {{ font-family:'Switzer', sans-serif; font-weight:400; font-size:46px; line-height:1.3; color:rgba(255,255,255,0.9); }}

.glass-card {{ position:absolute; bottom:150px; left:60px; right:60px; z-index:10; background:var(--glass-bg); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); padding:60px; border-radius:24px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }}
.glass-card-centered {{ position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:850px; z-index:10; background:var(--glass-bg); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); padding:80px; border-radius:24px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); display:flex; flex-direction:column; align-items:center; text-align:center; }}

.stats-text {{ font-family:'Clash Display', sans-serif; font-weight:700; font-size:42px; color:var(--accent-blue); letter-spacing:4px; margin-bottom:40px; }}
.cta-headline {{ font-family:'Switzer', sans-serif; font-weight:400; font-size:52px; line-height:1.3; margin-bottom:80px; }}
.cta-author {{ display:flex; align-items:center; gap:30px; }}
.cta-profile {{ width:140px; height:140px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2); }}
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
<button class="dl-btn" onclick="downloadPDF()">⬇ EXPORT CONCESSION TRAP PDF</button>
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
    pdf.save('Aethera_Concession_Trap_Carousel.pdf');
    btn.textContent = '⬇ EXPORT CONCESSION TRAP PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "concession_trap_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[CONCESSION TRAP] Carousel saved to: {output_path}")
