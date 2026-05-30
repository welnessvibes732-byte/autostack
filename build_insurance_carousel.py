"""
Build Insurance Blindspot Carousel — Aethera LinkedIn
Uses Emerald Green (#10B981) accent for Yield/Profit focus.
8 slides, heavy information, proper CSS scaling and typography.
"""

import os

# --- Load base64 assets ---
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

# --- Slide content (8 Slides) ---
slides = [
    {
        "sysid": "THE REALITY",
        "title": 'Your Property Insurance<br>Just Went Up <span>28%</span>.',
        "subtitle": "You negotiated it down to 22%. Felt like a win.<br><strong style='color:#fff'>It wasn't.</strong>",
        "type": "hook"
    },
    {
        "sysid": "THE BLINDSPOT",
        "title": 'That Premium Increase<br>Is Not A Billing Event.',
        "subtitle": "It is a permanent <span>Valuation Signal.</span>",
        "cards": [
            {"icon": "🌊", "label": "FLOOD ZONES", "text": "Insurers now use granular climate risk scoring to price your building. Your property isn't being evaluated on its history; it's being evaluated on predictive climate models."},
            {"icon": "🔥", "label": "WILDFIRE & HEAT", "text": "If your asset sits in a risk zone, your premium is not 'temporarily high.' The era of cheap insurance in volatile regions is over."},
            {"icon": "📉", "label": "PERMANENT COST", "text": "It is a structural operating cost increase. And permanent cost increases directly destroy long-term portfolio valuations."},
        ]
    },
    {
        "sysid": "THE BRUTAL MATH",
        "title": 'The Math Nobody<br>Is Running.',
        "subtitle": "A standard 100-unit multifamily building.",
        "stats": [
            {"num": "$180K", "unit": "OLD PREMIUM", "desc": "Previous annual expense"},
            {"num": "$232K", "unit": "NEW PREMIUM", "desc": "After 28% increase"},
            {"num": "$52K", "unit": "NEW EXPENSE", "desc": "Recurring annual hit to your NOI"},
        ]
    },
    {
        "sysid": "THE BLEED",
        "title": 'One Line Item.<br><span>−$1,040,000</span>.',
        "subtitle": "Not a bad quarter. Not a one-time hit. A structural repricing of what your building is worth.",
        "cards": [
            {"icon": "🧮", "label": "THE CAP RATE EFFECT", "text": "At a standard 5% Cap Rate, that $52,000 reduction in your Net Operating Income mathematically erases $1.04 million from your asset's market value."},
            {"icon": "⏳", "label": "THE DELAYED SHOCK", "text": "Most operators don't realize this until they try to sell or refinance. By then, the damage is already permanent."},
        ]
    },
    {
        "sysid": "THE BROWN DISCOUNT",
        "title": 'Institutional Buyers<br>Already Know This.',
        "subtitle": "They call it the <span>Brown Discount</span>.",
        "cards": [
            {"icon": "🏢", "label": "THE MARKET GAP", "text": "The measurable gap in valuation between climate-resilient assets (which command a green premium) and everything else."},
            {"icon": "🧠", "label": "SMARTER RISK MODELS", "text": "Your building did not get worse. The market's risk model got smarter. Capital is fleeing unprotected assets."},
            {"icon": "📊", "label": "LAST QUARTER'S P&L", "text": "And your software is still showing you last quarter's numbers, completely blind to the macro shift."},
        ]
    },
    {
        "sysid": "THE HONEST ANSWER",
        "title": 'What Aethera Does.<br>And <span class="red">Does Not</span> Do.',
        "subtitle": "Anyone who tells you software fixes climate risk is selling you a fantasy.",
        "cards": [
            {"icon": "✗", "label": "WE DO NOT REDUCE PREMIUMS", "text": "Aethera will not negotiate with your insurer or change your flood zone status."},
            {"icon": "✗", "label": "WE DO NOT RETROFIT", "text": "Aethera will not magically make your physical building climate-resilient."},
            {"icon": "✓", "label": "WE DO GIVE VISIBILITY", "text": "Aethera guarantees you are never the last person in the room to find out what a cost increase did to your valuation."},
        ]
    },
    {
        "sysid": "THE SOLUTION",
        "title": 'Live NOI Recalculation.<br><span>Instantly.</span>',
        "subtitle": "The second that insurance renewal hits your ledger, Aethera's architecture reacts.",
        "cards": [
            {"icon": "⚡", "label": "AUTOMATIC REPRICING", "text": "Your Live NOI recalculates instantly. Your portfolio valuation updates automatically. No manual spreadsheet work."},
            {"icon": "🎯", "label": "DAY-ONE VISIBILITY", "text": "You see the $1M valuation damage the day it happens — not 3 months later when your accountant delivers a quarterly P&L."},
            {"icon": "🛡️", "label": "YIELD DEFENSE", "text": "You gain the time to react: renegotiate, retrofit, or reprice your rents to compensate before it's too late."},
        ]
    },
    {
        "sysid": "THE CLOSING LINE",
        "title": 'The Market Is Pricing<br>Your Risk Today.',
        "subtitle": "Your software should be, too.",
        "cta": True,
        "cta_line": "Software shouldn't just record decisions.<br>It should protect your yield.",
        "cta_link": "propiq.in / aethera"
    },
]

total = len(slides)

# --- Build HTML ---
def build_slide_html(slide, index):
    num = f"{index+1:02d}"
    bg_num = f'<div class="bg-num">{num}</div>'
    swipe = "SWIPE →" if index < total - 1 else ""

    header = f'''
    <div class="hdr">
        <div class="hdr-left">
            <img src="data:image/jpeg;base64,{logo_b64}" class="logo" alt="Aethera"/>
            <span class="sys-id">{slide["sysid"]}</span>
        </div>
        <span class="swipe">{swipe}</span>
    </div>'''

    content = ""

    # Title
    content += f'<div class="title">{slide["title"]}</div>'

    # Subtitle
    if slide.get("subtitle"):
        content += f'<div class="subtitle">{slide["subtitle"]}</div>'

    # Cards
    if slide.get("cards"):
        content += '<div class="cards">'
        for card in slide["cards"]:
            content += f'''
            <div class="card">
                <div class="card-icon">{card["icon"]}</div>
                <div class="card-content">
                    <div class="card-label">{card["label"]}</div>
                    <div class="card-text">{card["text"]}</div>
                </div>
            </div>'''
        content += '</div>'

    # Stats
    if slide.get("stats"):
        content += '<div class="stats">'
        for stat in slide["stats"]:
            content += f'''
            <div class="stat">
                <div class="stat-num">{stat["num"]}</div>
                <div class="stat-unit">{stat["unit"]}</div>
                <div class="stat-desc">{stat["desc"]}</div>
            </div>'''
        content += '</div>'

    # CTA
    if slide.get("cta"):
        content += f'''
        <div class="cta-box">
            <div class="cta-line">{slide["cta_line"]}</div>
            <div class="cta-link">{slide["cta_link"]}</div>
        </div>'''

    footer = f'''
    <div class="footer">
        <div class="footer-left">
            <img src="data:image/jpeg;base64,{profile_b64}" class="profile" alt="Founder"/>
            <div>
                <div class="footer-name">NITHESH DEVARLA</div>
                <div class="footer-role">FOUNDER · AETHERA</div>
            </div>
        </div>
        <div class="footer-right">
            <img src="data:image/jpeg;base64,{logo_b64}" class="logo-sm" alt=""/>
            <span class="page-num">{num} / {total:02d}</span>
        </div>
    </div>'''

    return f'''
    <div class="slide">
        {bg_num}
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
        {header}
        <div class="body">
            {content}
        </div>
        {footer}
    </div>'''


slides_html = "\n".join([build_slide_html(s, i) for i, s in enumerate(slides)])

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Insurance Blindspot — Aethera Carousel</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root {{
    --bg: #07090F;
    --card: #0D111A;
    --accent: #10B981; /* Emerald Green */
    --accent-glow: rgba(16,185,129,0.15);
    --red: #FF3366;
    --text: #FFFFFF;
    --muted: #8B949E;
    --border: #1E293B;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#000; font-family:'Inter',sans-serif; display:flex; flex-direction:column; align-items:center; padding:40px 20px; gap:30px; }}
.dl-btn {{ position:fixed; top:20px; right:20px; z-index:999; background:var(--accent); color:#000; border:none; padding:14px 28px; border-radius:12px; font-family:'Inter',sans-serif; font-weight:800; font-size:14px; cursor:pointer; letter-spacing:0.05em; box-shadow:0 0 30px var(--accent-glow); transition: all 0.3s; }}
.dl-btn:hover {{ transform:scale(1.05); box-shadow:0 0 50px rgba(16,185,129,0.4); }}

.slide {{ width:1080px; height:1350px; background:var(--bg); position:relative; overflow:hidden; display:flex; flex-direction:column; transform:scale(0.45); transform-origin:top center; margin-bottom:-740px;
    background-image:
        linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
}}

.glow {{ position:absolute; border-radius:50%; pointer-events:none; filter:blur(100px); }}
.glow-1 {{ width:500px; height:500px; top:-150px; left:-150px; background:radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%); }}
.glow-2 {{ width:400px; height:400px; bottom:-100px; right:-100px; background:radial-gradient(circle, rgba(255,51,102,0.06) 0%, transparent 70%); }}

.bg-num {{ position:absolute; bottom:20px; right:30px; font-family:'JetBrains Mono',monospace; font-size:320px; font-weight:800; color:rgba(16,185,129,0.03); line-height:1; pointer-events:none; z-index:0; }}

.hdr {{ display:flex; justify-content:space-between; align-items:center; padding:50px 70px 0; z-index:2; position:relative; }}
.hdr-left {{ display:flex; align-items:center; gap:20px; }}
.logo {{ height:42px; border-radius:8px; }}
.sys-id {{ font-family:'JetBrains Mono',monospace; font-size:15px; color:var(--accent); letter-spacing:0.15em; font-weight:700; background:var(--accent-glow); padding:8px 16px; border-radius:6px; border:1px solid rgba(16,185,129,0.2); }}
.swipe {{ font-family:'JetBrains Mono',monospace; font-size:14px; color:var(--muted); letter-spacing:0.12em; font-weight:600; }}

.body {{ flex:1; display:flex; flex-direction:column; justify-content:center; padding:0 70px; gap:40px; z-index:2; position:relative; }}

.title {{ font-size:82px; font-weight:800; color:var(--text); line-height:1.05; letter-spacing:-2px; }}
.title span {{ color:var(--accent); }}
.title span.red {{ color:var(--red); }}

.subtitle {{ font-size:30px; color:var(--muted); line-height:1.4; max-width:900px; font-weight:400; }}
.subtitle span {{ color:var(--text); font-weight:600; }}

.cards {{ display:flex; flex-direction:column; gap:24px; margin-top:10px; }}
.card {{ background:var(--card); border:1px solid var(--border); border-left:6px solid var(--accent); border-radius:14px; padding:36px 40px; display:flex; align-items:flex-start; gap:28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
.card-icon {{ font-size:42px; flex-shrink:0; line-height:1; margin-top:4px; }}
.card-content {{ display:flex; flex-direction:column; gap:12px; }}
.card-label {{ font-family:'JetBrains Mono',monospace; font-size:16px; color:var(--accent); letter-spacing:0.12em; font-weight:800; }}
.card-text {{ font-size:24px; color:var(--muted); line-height:1.5; font-weight:400; }}

.stats {{ display:flex; flex-direction:column; gap:24px; margin-top:20px; }}
.stat {{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:36px 40px; display:flex; align-items:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); gap:30px; }}
.stat-num {{ font-family:'JetBrains Mono',monospace; font-size:64px; font-weight:800; color:var(--accent); line-height:1; min-width: 220px; }}
.stat-unit {{ font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:700; color:var(--text); letter-spacing:0.05em; min-width: 180px; }}
.stat-desc {{ font-size:24px; color:var(--muted); line-height:1.4; flex:1; }}

.cta-box {{ background:var(--card); border:3px solid var(--accent); border-radius:20px; padding:60px 50px; text-align:center; box-shadow: 0 20px 50px var(--accent-glow); margin-top:30px; }}
.cta-line {{ font-size:38px; font-weight:700; color:var(--text); line-height:1.3; margin-bottom:30px; letter-spacing:-1px; }}
.cta-link {{ font-family:'JetBrains Mono',monospace; font-size:24px; color:var(--accent); letter-spacing:0.15em; font-weight:700; display:inline-block; border-bottom:2px solid var(--accent); padding-bottom:4px; }}

.footer {{ display:flex; justify-content:space-between; align-items:center; padding:40px 70px; border-top:1px solid var(--border); z-index:2; position:relative; background:var(--bg); }}
.footer-left {{ display:flex; align-items:center; gap:18px; }}
.profile {{ width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid var(--accent); }}
.footer-name {{ font-size:18px; font-weight:800; color:var(--text); letter-spacing:0.05em; }}
.footer-role {{ font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--muted); letter-spacing:0.12em; margin-top:4px; font-weight:600; }}
.footer-right {{ display:flex; align-items:center; gap:16px; }}
.logo-sm {{ height:32px; border-radius:6px; opacity:0.7; }}
.page-num {{ font-family:'JetBrains Mono',monospace; font-size:16px; color:var(--muted); letter-spacing:0.1em; font-weight:700; }}

@media print {{
    body {{ padding:0; gap:0; background:#fff; }}
    .slide {{ transform:scale(1); margin-bottom:0; page-break-after:always; }}
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
    pdf.save('Insurance_Blindspot_Aethera.pdf');
    btn.textContent = '⬇ DOWNLOAD PDF';
    btn.disabled = false;
}}
</script>
</body>
</html>'''

output_path = os.path.join(os.path.dirname(__file__), "insurance_blindspot_carousel.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"[OK] Carousel saved to: {output_path}")
print(f"   Slides: {total}")
print(f"   Accent: Emerald Green (#10B981)")
print(f"   Open in browser and click DOWNLOAD PDF")
