"""
Raj Shamani / High-End Creator Carousel
Vibe: Visually striking, dark mode, personal branding (Photo + Name), premium typography.
"""

import os

# --- Load base64 assets for Personal Branding ---
assets_path = os.path.join(os.path.dirname(__file__), "assets_b64.txt")
logo_b64 = ""
profile_b64 = ""

if os.path.exists(assets_path):
    with open(assets_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("LOGO:"):
                logo_b64 = line.strip().replace("LOGO:", "")
            elif line.startswith("PROFILE:"):
                profile_b64 = line.strip().replace("PROFILE:", "")

slides = [
    {
        "type": "hook",
        "text": '<div class="hook-line">A tenant drops off her keys</div><div class="hook-sub">at the end of a 12-month lease.</div>',
        "show_big_profile": True
    },
    {
        "type": "story",
        "title": "THE EXCUSES",
        "text": 'Your leasing team blames the market.<br><br>They blame the new luxury high-rise down the street.<br><br>They blame the fact that you raised rent by $100.'
    },
    {
        "type": "punch",
        "text": 'They are lying to you.'
    },
    {
        "type": "story",
        "title": "THE REALITY",
        "text": 'She didn\'t leave because of the rent.<br><br>She left because her kitchen sink dripped for <span class="highlight">14 days.</span><br><br>Because when her AC broke in July, she got an automated "We received your ticket" response—and then complete silence for <span class="highlight">72 hours.</span>'
    },
    {
        "type": "statement",
        "text": 'Turnover is not a leasing problem.<br><br><span class="yellow-box">It is an operations problem.</span>'
    },
    {
        "type": "story",
        "title": "THE BRUTAL MATH",
        "text": 'Every property management platform is obsessed with acquisition. They celebrate when you sign a new lease.<br><br>But replacing that one tenant just cost you <span class="highlight-yellow">$4,500.</span><br><br>Lost rent during vacancy. Make-ready painting. Marketing fees. Broker commissions.'
    },
    {
        "type": "scale",
        "text": 'If you manage 200 units with a standard 35% turnover rate...<br><br>You are bleeding <br><span class="massive-red">$315,000</span><br>every single year.'
    },
    {
        "type": "cta",
        "text": 'Protecting a renewal is not just "good customer service."<br><br><span class="yellow-box">It is yield defense.</span>',
    }
]

total = len(slides)

def build_slide(slide, index):
    num = f"0{index+1}" if index < 9 else f"{index+1}"
    
    # Creator Footer Pill
    footer = f'''
    <div class="footer">
        <div class="creator-pill">
            <img src="data:image/jpeg;base64,{profile_b64}" class="sm-profile" alt=""/>
            <div class="creator-details">
                <span class="name">NITHESH DEVARLA</span>
                <span class="handle">@AETHERA_HQ</span>
            </div>
        </div>
        <div class="page-indicator">
            <span class="swipe-text">SWIPE</span>
            <span class="page-num">{num}/{total:02d}</span>
        </div>
    </div>
    '''

    content = ""
    big_profile_html = ""
    
    if slide.get("show_big_profile"):
        big_profile_html = f'''
        <div class="big-profile-wrapper">
            <div class="profile-glow"></div>
            <img src="data:image/jpeg;base64,{profile_b64}" class="lg-profile" alt="Nithesh"/>
        </div>
        '''

    if slide["type"] == "hook":
        content = f'{big_profile_html}<div class="hook-text">{slide["text"]}</div>'
    elif slide["type"] == "story":
        content = f'<div class="section-badge">{slide["title"]}</div><div class="story-text">{slide["text"]}</div>'
    elif slide["type"] == "punch":
        content = f'<div class="punch-text">{slide["text"]}</div>'
    elif slide["type"] == "statement":
        content = f'<div class="statement-text">{slide["text"]}</div>'
    elif slide["type"] == "scale":
        content = f'<div class="scale-text">{slide["text"]}</div>'
    elif slide["type"] == "cta":
        content = f'<div class="cta-text">{slide["text"]}</div>'

    return f'''
    <div class="slide">
        <!-- Background Elements -->
        <div class="bg-gradient-1"></div>
        <div class="bg-gradient-2"></div>
        <div class="bg-noise"></div>
        
        <div class="content-wrapper {slide['type']}">
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
<title>Creator Storytelling Carousel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root {{
    --bg: #0A0A0A; /* Deep Charcoal */
    --text: #F3F4F6; /* Off-white */
    --accent: #FACC15; /* Creator Gold/Yellow */
    --red: #EF4444; /* Alert Red */
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#222; display:flex; flex-direction:column; align-items:center; padding:40px 20px; gap:30px; }}
.dl-btn {{ position:fixed; top:20px; right:20px; z-index:999; background:var(--accent); color:#000; border:none; padding:14px 28px; border-radius:12px; font-family:'Inter',sans-serif; font-weight:800; cursor:pointer; letter-spacing:1px; box-shadow: 0 4px 20px rgba(250,204,21,0.4); }}

.slide {{
    width: 1080px;
    height: 1350px;
    background: var(--bg);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 60px;
    transform: scale(0.45);
    transform-origin: top center;
    margin-bottom: -740px;
    color: var(--text);
    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
    border-radius: 20px;
}}

/* Background Aesthetics */
.bg-gradient-1 {{
    position: absolute; top: -200px; right: -200px; width: 800px; height: 800px;
    background: radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%);
    z-index: 1; pointer-events: none;
}}
.bg-gradient-2 {{
    position: absolute; bottom: -300px; left: -200px; width: 900px; height: 900px;
    background: radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%);
    z-index: 1; pointer-events: none;
}}
.bg-noise {{
    position: absolute; top:0; left:0; width:100%; height:100%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
    z-index: 2; pointer-events: none;
}}

.content-wrapper {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 10;
    position: relative;
    padding: 0 40px;
}}
.content-wrapper.hook {{
    align-items: center;
    text-align: center;
    justify-content: flex-start;
    padding-top: 100px;
}}

/* Profile Elements */
.big-profile-wrapper {{
    position: relative; margin-bottom: 60px;
}}
.lg-profile {{
    width: 320px; height: 320px; border-radius: 50%; object-fit: cover;
    border: 6px solid var(--accent); position: relative; z-index: 5;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}}
.profile-glow {{
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 380px; height: 380px; background: var(--accent); border-radius: 50%;
    filter: blur(60px); opacity: 0.3; z-index: 1;
}}

/* Typography */
.hook-text {{
    display: flex; flex-direction: column; gap: 20px;
}}
.hook-line {{
    font-family: 'Playfair Display', serif; font-size: 84px; font-weight: 700; font-style: italic;
    line-height: 1.1; color: var(--accent);
}}
.hook-sub {{
    font-family: 'Inter', sans-serif; font-size: 52px; font-weight: 800;
    line-height: 1.2; letter-spacing: -1px; text-transform: uppercase;
}}

.section-badge {{
    display: inline-block; font-family: 'Inter', sans-serif; font-size: 20px;
    font-weight: 900; letter-spacing: 3px; color: var(--accent); border: 2px solid var(--accent);
    padding: 8px 16px; border-radius: 8px; margin-bottom: 40px;
}}

.story-text {{
    font-family: 'Inter', sans-serif; font-size: 48px; font-weight: 500;
    line-height: 1.5; color: rgba(255,255,255,0.9);
}}
.story-text .highlight {{
    color: var(--red); font-weight: 800; font-style: italic; font-family: 'Playfair Display', serif; font-size: 54px;
}}
.story-text .highlight-yellow {{
    color: var(--accent); font-weight: 900; font-size: 56px;
}}

.punch-text {{
    font-family: 'Playfair Display', serif; font-size: 110px; font-weight: 700; font-style: italic;
    color: var(--red); line-height: 1.1; text-align: center; width: 100%;
}}

.statement-text {{
    font-family: 'Inter', sans-serif; font-size: 64px; font-weight: 800; line-height: 1.3;
    text-align: center; width: 100%;
}}
.yellow-box {{
    background: var(--accent); color: #000; padding: 10px 24px; display: inline-block;
    border-radius: 12px; margin-top: 20px; font-weight: 900; transform: rotate(-2deg);
}}

.scale-text {{
    font-family: 'Inter', sans-serif; font-size: 56px; font-weight: 600; line-height: 1.4; text-align: center;
}}
.massive-red {{
    font-family: 'Playfair Display', serif; font-size: 140px; font-weight: 700; font-style: italic;
    color: var(--red); display: block; margin: 30px 0; text-shadow: 0 10px 30px rgba(239,68,68,0.3);
}}

.cta-text {{
    font-family: 'Inter', sans-serif; font-size: 64px; font-weight: 800; line-height: 1.3;
    text-align: center; width: 100%;
}}

/* Footer Branding */
.footer {{
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 20px; z-index: 10; position: relative; margin-top: auto;
}}
.creator-pill {{
    display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.05);
    padding: 12px 24px 12px 12px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
}}
.sm-profile {{
    width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent);
}}
.creator-details {{ display: flex; flex-direction: column; }}
.creator-details .name {{ font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #fff; }}
.creator-details .handle {{ font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 500; color: var(--accent); }}

.page-indicator {{ display: flex; align-items: center; gap: 16px; }}
.swipe-text {{ font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 3px; color: rgba(255,255,255,0.5); }}
.page-num {{ font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; font-style: italic; color: #fff; }}

@media print {{
    body {{ padding:0; gap:0; background:#fff; }}
    .slide {{ transform:scale(1); margin-bottom:0; page-break-after:always; border-radius:0; box-shadow:none; }}
    .dl-btn {{ display:none; }}
}}
</style>
</head>
<body>
<button class="dl-btn" onclick="downloadPDF()">⬇ DOWNLOAD HIGH-RES PDF</button>
{slides_html}
<script>
async function downloadPDF() {{
    const btn = document.querySelector('.dl-btn');
    btn.textContent = '⏳ GENERATING...';
    btn.disabled = true;
    const {{ jsPDF }} = window.jspdf;
    const pdf = new jsPDF({{ orientation:'portrait', unit:'px', format:[1080,1350] }});
    const slides = document.querySelectorAll('.slide');
    for (let i = 0; i < slides.length; i++) {{
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#0A0A0A",
            onclone: function(doc) {{
                doc.querySelectorAll('.slide').forEach(s => {{ s.style.transform='scale(1)'; s.style.marginBottom='0'; s.style.borderRadius='0'; }});
            }}
        }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Aethera_Creator_Carousel.pdf');
    btn.textContent = '⬇ DOWNLOAD HIGH-RES PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "creator_story_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[OK] High-End Creator Carousel saved to: {output_path}")
