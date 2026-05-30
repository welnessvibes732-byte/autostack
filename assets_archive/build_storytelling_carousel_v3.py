"""
Professional Real Estate Storytelling Carousel
Vibe: High-end B2B, Deep Navy Palette, Embedded AI Imagery, Creator Photo on CTA.
"""

import os
import base64

# --- Helper: Convert Local Image to Base64 ---
def image_to_b64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Failed to load image {path}: {e}")
        return ""

# --- Load Generated Story Images ---
img1_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\keys_drop_off_1779205757832.png"
img2_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\dripping_sink_1779205808291.png"
img3_path = r"C:\Users\DELL\.gemini\antigravity\brain\1e1a770e-60c5-45bf-af7c-93e9dd74650b\financial_bleed_1779205856422.png"

keys_b64 = image_to_b64(img1_path)
sink_b64 = image_to_b64(img2_path)
bleed_b64 = image_to_b64(img3_path)

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
        "type": "image_hook",
        "image": keys_b64,
        "text": '<div style="font-family: \'Outfit\', sans-serif; font-size: 24px; color: var(--accent); font-weight: 800; letter-spacing: 3px; margin-bottom: 30px;">THE TRUE COST OF TURNOVER</div><div class="hook-text" style="font-size: 76px;">Why losing a tenant is <br><span style="color:var(--red); font-style:italic;">never</span> about the rent.</div><div style="font-family: \'Outfit\', sans-serif; font-size: 32px; color: var(--muted); margin-top: 40px; font-weight: 300; line-height: 1.4; text-align: center;">A breakdown of the $4,500 operational failure<br>quietly destroying your Net Operating Income.</div>'
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
        "type": "image_story",
        "image": sink_b64,
        "text": 'She didn\'t leave because of the rent.<br><br>She left because her kitchen sink dripped for <span class="highlight">14 days.</span><br><br>Because when her AC broke in July, she got an automated response—and then complete silence for <span class="highlight">72 hours.</span>'
    },
    {
        "type": "statement",
        "text": 'Turnover is not a leasing problem.<br><br><span class="blue-box">It is an operations problem.</span>'
    },
    {
        "type": "image_scale",
        "image": bleed_b64,
        "text": 'If you manage 200 units with a standard 35% turnover rate...<br><br>You are bleeding <span class="highlight-red">$315,000</span> every single year.<br><br>Just to replace the people who were already living in your building.'
    },
    {
        "type": "cta",
        "text": 'Protecting a renewal is not just "good customer service."<br><br><span class="blue-box">It is yield defense.</span>',
        "show_big_profile": True
    }
]

total = len(slides)

def build_slide(slide, index):
    num = f"0{index+1}" if index < 9 else f"{index+1}"
    
    # Common Header
    header = f'<div class="header"><div class="header-line">AETHERA OPERATIONS INTELLIGENCE</div></div>'
    # Common Footer
    footer = f'''
    <div class="footer">
        <span class="handle">@AETHERA_HQ</span>
        <div class="page-indicator">
            <span class="swipe-text">SWIPE</span>
            <span class="page-num">{num}/{total:02d}</span>
        </div>
    </div>
    '''

    content = ""
    
    if slide["type"] == "image_hook":
        content = f'''
        <img src="data:image/png;base64,{slide['image']}" class="bg-image" />
        <div class="overlay"></div>
        <div class="hook-text">{slide["text"]}</div>
        '''
    elif slide["type"] == "story":
        content = f'<div class="section-badge">{slide["title"]}</div><div class="story-text">{slide["text"]}</div>'
    elif slide["type"] == "punch":
        content = f'<div class="punch-text">{slide["text"]}</div>'
    elif slide["type"] == "image_story":
        content = f'''
        <div class="split-layout">
            <img src="data:image/png;base64,{slide['image']}" class="split-image" />
            <div class="story-text">{slide["text"]}</div>
        </div>
        '''
    elif slide["type"] == "statement":
        content = f'<div class="statement-text">{slide["text"]}</div>'
    elif slide["type"] == "image_scale":
        content = f'''
        <img src="data:image/png;base64,{slide['image']}" class="bg-image math-bg" />
        <div class="overlay heavy-overlay"></div>
        <div class="scale-text">{slide["text"]}</div>
        '''
    elif slide["type"] == "cta":
        profile_html = ""
        if slide.get("show_big_profile"):
            profile_html = f'''
            <div class="cta-profile-wrapper">
                <img src="data:image/jpeg;base64,{profile_b64}" class="cta-profile" alt="Nithesh"/>
                <div class="cta-name">NITHESH DEVARLA<br><span>FOUNDER, AETHERA</span></div>
            </div>
            '''
        content = f'<div class="cta-text">{slide["text"]}</div>{profile_html}'

    return f'''
    <div class="slide">
        {header}
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
<title>Aethera Deep Navy Storytelling Carousel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root {{
    --bg: #030712; /* Very Deep Navy/Charcoal */
    --text: #F9FAFB; 
    --muted: #9CA3AF;
    --accent: #0EA5E9; /* PropTech Blue */
    --red: #EF4444; 
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#222; display:flex; flex-direction:column; align-items:center; padding:40px 20px; gap:30px; }}
.dl-btn {{ position:fixed; top:20px; right:20px; z-index:999; background:var(--accent); color:#fff; border:none; padding:14px 28px; border-radius:12px; font-family:'Outfit',sans-serif; font-weight:800; cursor:pointer; letter-spacing:1px; }}

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
    border: 1px solid #1F2937;
}}

/* Images & Overlays */
.bg-image {{
    position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover; z-index: 1;
}}
.math-bg {{ filter: saturate(0.5); }}
.overlay {{
    position: absolute; top:0; left:0; width:100%; height:100%; 
    background: linear-gradient(to top, rgba(3,7,18,1) 0%, rgba(3,7,18,0.4) 50%, rgba(3,7,18,0.8) 100%);
    z-index: 2;
}}
.heavy-overlay {{
    background: linear-gradient(to right, rgba(3,7,18,0.95) 0%, rgba(3,7,18,0.6) 100%);
}}

.split-layout {{
    display: flex; flex-direction: column; gap: 40px; width: 100%;
}}
.split-image {{
    width: 100%; height: 500px; object-fit: cover; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
}}

.header {{
    z-index: 10; position: relative; width: 100%; display: flex; justify-content: flex-start;
}}
.header-line {{
    font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 4px; color: var(--muted);
    border-bottom: 2px solid var(--accent); padding-bottom: 8px;
}}

.content-wrapper {{
    flex: 1; display: flex; flex-direction: column; justify-content: center; z-index: 10; position: relative; padding: 0 40px;
}}

/* Typography */
.hook-text {{
    font-family: 'Playfair Display', serif; font-size: 84px; font-weight: 600; line-height: 1.2; text-align: center;
    text-shadow: 0 10px 30px rgba(0,0,0,0.8);
}}

.section-badge {{
    display: inline-block; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 3px; 
    color: var(--accent); margin-bottom: 40px; text-transform: uppercase;
}}

.story-text {{
    font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 300; line-height: 1.5; color: #E5E7EB;
}}
.story-text .highlight {{
    color: var(--accent); font-weight: 600;
}}

.punch-text {{
    font-family: 'Playfair Display', serif; font-size: 110px; font-weight: 600; font-style: italic;
    color: var(--text); line-height: 1.1; text-align: center; width: 100%;
}}

.statement-text {{
    font-family: 'Outfit', sans-serif; font-size: 64px; font-weight: 600; line-height: 1.4; text-align: center; width: 100%;
}}
.blue-box {{
    background: rgba(14, 165, 233, 0.15); color: var(--accent); padding: 8px 24px; display: inline-block;
    border: 2px solid var(--accent); border-radius: 12px; margin-top: 20px; font-weight: 800;
}}

.scale-text {{
    font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 400; line-height: 1.4; width: 80%;
}}
.scale-text .highlight-red {{
    color: var(--red); font-weight: 800; font-size: 72px; display: block; margin: 20px 0;
}}

.cta-text {{
    font-family: 'Outfit', sans-serif; font-size: 54px; font-weight: 400; line-height: 1.4; text-align: center; width: 100%; margin-bottom: 80px;
}}

/* CTA Profile */
.cta-profile-wrapper {{
    display: flex; align-items: center; justify-content: center; gap: 30px; margin-top: 40px;
}}
.cta-profile {{
    width: 220px; height: 220px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent);
}}
.cta-name {{
    font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #fff; line-height: 1.2;
}}
.cta-name span {{
    font-size: 20px; font-weight: 400; color: var(--muted); letter-spacing: 2px;
}}

/* Footer */
.footer {{
    display: flex; justify-content: space-between; align-items: center; z-index: 10; position: relative; border-top: 1px solid #1F2937; padding-top: 30px;
}}
.handle {{ font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 600; color: var(--text); letter-spacing: 2px; }}
.page-indicator {{ display: flex; align-items: center; gap: 16px; }}
.swipe-text {{ font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 3px; color: var(--muted); }}
.page-num {{ font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #fff; }}

@media print {{
    body {{ padding:0; gap:0; background:#fff; }}
    .slide {{ transform:scale(1); margin-bottom:0; page-break-after:always; border:none; }}
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
        const canvas = await html2canvas(slides[i], {{ scale:2, useCORS:true, width:1080, height:1350, backgroundColor: "#030712",
            onclone: function(doc) {{
                doc.querySelectorAll('.slide').forEach(s => {{ s.style.transform='scale(1)'; s.style.marginBottom='0'; }});
            }}
        }});
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1080,1350],'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
    }}
    pdf.save('Aethera_Professional_Story_Carousel.pdf');
    btn.textContent = '⬇ DOWNLOAD HIGH-RES PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "professional_story_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[OK] High-End Professional Carousel saved to: {output_path}")
