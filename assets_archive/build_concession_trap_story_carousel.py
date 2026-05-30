import base64
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "concession_trap_story_carousel.html"
PROFILE = ROOT / "profile.jpg"
LOGO = ROOT / "aethera_logo.jpg"


def image_data(path: Path) -> str:
    if not path.exists():
        return ""
    mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


profile_src = image_data(PROFILE)
logo_src = image_data(LOGO)


slides = [
    {
        "kind": "cover",
        "headline": "The Concession Trap",
        "body": "How one panic discount quietly erased $750,000 in building value.",
        "visual": "lease",
        "mark": "circle",
    },
    {
        "headline": "Sarah manages leasing for 200 units in Dallas.",
        "body": "Last month, vacancy moved from 4% to 6%.\n\nNot a disaster. But her boss noticed.",
        "visual": "building",
        "notes": ["200 units", "4% -> 6% vacancy", "One email: Fix it."],
        "mark": "underline",
    },
    {
        "headline": "So she did what pressure makes good operators do.",
        "body": "She put a big banner on the website:\n\nONE MONTH FREE RENT.",
        "visual": "banner",
        "notes": ["8 units filled", "2 weeks", "Boss happy"],
        "mark": "circle-small",
    },
    {
        "headline": "Except the math was bleeding underneath.",
        "body": "$2,500 x 8 tenants = $20,000 gone.\n\nIn two weeks.",
        "visual": "calculator",
        "notes": ["5 tenants were going to sign anyway", "They needed a $500 nudge", "$12,500 unnecessary"],
        "mark": "underline",
    },
    {
        "headline": "Now stretch that panic across a year.",
        "body": "30 turnovers. Same blanket concession.\n\n$75,000 in concessions.\nHalf unnecessary.\n$37,500 wasted.",
        "visual": "ledger",
        "notes": ["At a 5% cap rate", "$750,000 value erased"],
        "mark": "arrow",
    },
    {
        "headline": "Sarah was not bad at her job.",
        "body": "She just did not have the information she needed, when she needed it.\n\nThat is the Concession Trap.",
        "visual": "person",
        "notes": ["No live comp data", "No concession comparison", "Just fear"],
        "mark": "circle-small",
    },
    {
        "headline": "Aethera shows the live market before the panic starts.",
        "body": "Your team sees what competitors are actually offering right now.\n\nNot last quarter. Not a rumor.",
        "visual": "dashboard",
        "notes": ["94% occupancy across the street", "$500 move-in credit", "Waived app fee closes this"],
        "mark": "underline",
    },
    {
        "headline": "Want the Yield Defense Framework?",
        "body": "The 2026 playbook for pricing concessions without destroying valuation.\n\nDrop YIELD in the comments and I will send it.",
        "visual": "shield",
        "notes": ["Price the nudge", "Defend NOI", "Protect asset value"],
        "mark": "circle",
    },
]


def esc(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def nl(text: str) -> str:
    return esc(text).replace("\n", "<br>")


def visual(name: str) -> str:
    icons = {
        "lease": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <rect x="92" y="62" width="176" height="236" rx="18" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <path d="M124 116h112M124 152h112M124 188h76" stroke="#111" stroke-width="10" stroke-linecap="round"/>
          <path d="M196 246c34-42 72-48 96-20" stroke="#111" stroke-width="12" fill="none" stroke-linecap="round"/>
          <circle cx="128" cy="248" r="28" fill="#111"/>
          <path d="M80 318c18-44 82-45 100 0" stroke="#111" stroke-width="18" fill="none" stroke-linecap="round"/>
        </svg>""",
        "building": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <rect x="72" y="72" width="216" height="240" rx="8" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <path d="M116 116h34M196 116h34M116 166h34M196 166h34M116 216h34M196 216h34" stroke="#111" stroke-width="12" stroke-linecap="round"/>
          <path d="M154 312v-58h52v58" stroke="#111" stroke-width="10" fill="none"/>
          <path d="M48 312h264" stroke="#111" stroke-width="12" stroke-linecap="round"/>
        </svg>""",
        "banner": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <rect x="48" y="86" width="264" height="118" rx="12" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <path d="M82 126h196M82 162h150" stroke="#111" stroke-width="14" stroke-linecap="round"/>
          <path d="M94 244h172" stroke="#111" stroke-width="10" stroke-linecap="round"/>
          <path d="M116 204v58M244 204v58" stroke="#111" stroke-width="8"/>
        </svg>""",
        "calculator": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <rect x="86" y="58" width="188" height="248" rx="22" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <rect x="116" y="92" width="128" height="48" rx="8" fill="#111"/>
          <path d="M124 178h1M180 178h1M236 178h1M124 226h1M180 226h1M236 226h1M124 274h1M180 274h56" stroke="#111" stroke-width="20" stroke-linecap="round"/>
        </svg>""",
        "ledger": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <path d="M58 292h244" stroke="#111" stroke-width="10" stroke-linecap="round"/>
          <path d="M78 260l56-74 62 38 80-124" stroke="#111" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M230 100h46v46" stroke="#111" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M82 96h70M82 134h44" stroke="#111" stroke-width="10" stroke-linecap="round"/>
        </svg>""",
        "person": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <circle cx="168" cy="98" r="38" fill="#111"/>
          <path d="M100 254c22-74 112-76 138 0" stroke="#111" stroke-width="24" fill="none" stroke-linecap="round"/>
          <rect x="220" y="86" width="72" height="102" rx="8" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <path d="M72 292h220" stroke="#111" stroke-width="12" stroke-linecap="round"/>
        </svg>""",
        "dashboard": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <rect x="48" y="70" width="264" height="204" rx="18" fill="#f4f4f4" stroke="#111" stroke-width="8"/>
          <path d="M78 118h82M78 162h54M78 208h88" stroke="#111" stroke-width="10" stroke-linecap="round"/>
          <path d="M204 220l26-44 34 18 34-72" stroke="#111" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M136 306h88M180 274v32" stroke="#111" stroke-width="10" stroke-linecap="round"/>
        </svg>""",
        "shield": """
        <svg viewBox="0 0 360 360" aria-hidden="true">
          <path d="M180 48l116 46v78c0 76-45 118-116 146-71-28-116-70-116-146V94l116-46z" fill="#f4f4f4" stroke="#111" stroke-width="8" stroke-linejoin="round"/>
          <path d="M126 180l36 36 78-88" stroke="#111" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>""",
    }
    return icons[name]


html_slides = []
for index, slide in enumerate(slides, start=1):
    notes = "".join(f"<li>{esc(note)}</li>" for note in slide.get("notes", []))
    html_slides.append(
        f"""
        <section class="slide {esc(slide.get('kind', ''))}">
          <div class="rule top"></div>
          <div class="rule bottom"></div>
          <div class="kicker">YIELD DEFENSE</div>
          <div class="author">AETHERA</div>
          <svg class="marker {esc(slide.get('mark', 'underline'))}" viewBox="0 0 500 180" aria-hidden="true">
            <path class="m-circle" d="M35 91C82 20 245 14 364 37c102 20 125 82 53 113-93 39-299 24-365-20-22-15-27-25-17-39Z"/>
            <path class="m-under" d="M20 105C126 75 284 132 480 91"/>
            <path class="m-arrow" d="M20 42C122 72 141 148 270 119"/>
            <path class="m-arrow-head" d="M238 91l40 30-47 24"/>
          </svg>
          <main>
            <h1>{nl(slide['headline'])}</h1>
            <p class="body">{nl(slide['body'])}</p>
            <ul class="notes">{notes}</ul>
          </main>
          <div class="visual">{visual(slide['visual'])}</div>
          <footer>
            <div class="swipe">SWIPE &lt;&lt;</div>
            <div class="identity">
              {'<img src="' + profile_src + '" alt="Profile">' if profile_src else ''}
              <span>Founder / Aethera</span>
            </div>
            <div class="page">{index}</div>
          </footer>
        </section>
        """
    )


html_doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Concession Trap - Aethera Carousel</title>
<style>
:root {{
  --ink: #101010;
  --grid: #e8e8e8;
  --paper: #fffef8;
  --yellow: #fff200;
  --muted: #565656;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0;
  background: #d8d8d8;
  color: var(--ink);
  font-family: "Aptos", "Helvetica Neue", Arial, sans-serif;
}}
.deck {{
  display: grid;
  grid-template-columns: repeat(auto-fit, 1080px);
  gap: 34px;
  align-items: start;
  padding: 34px;
}}
.slide {{
  position: relative;
  width: 1080px;
  height: 1350px;
  overflow: hidden;
  background-color: var(--paper);
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 88px 88px;
  box-shadow: 0 18px 48px rgba(0,0,0,.13);
}}
.slide::after {{
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 80% 15%, rgba(255,242,0,.12), transparent 24%);
}}
.rule {{
  position: absolute;
  left: 70px;
  right: 70px;
  height: 2px;
  background: var(--ink);
}}
.rule.top {{ top: 58px; }}
.rule.bottom {{ bottom: 68px; }}
.kicker, .author {{
  position: absolute;
  top: 38px;
  z-index: 4;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}}
.kicker {{ left: 70px; }}
.author {{ right: 70px; }}
main {{
  position: absolute;
  z-index: 3;
  left: 70px;
  right: 70px;
  top: 110px;
}}
h1 {{
  margin: 0;
  max-width: 830px;
  font-size: 68px;
  line-height: .98;
  font-weight: 520;
  letter-spacing: 0;
}}
.cover h1 {{
  margin-top: 34px;
  max-width: 940px;
  text-align: center;
  font-size: 96px;
}}
.body {{
  margin: 34px 0 0;
  max-width: 675px;
  font-size: 31px;
  line-height: 1.18;
  font-weight: 450;
}}
.cover .body {{
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  max-width: 760px;
}}
.notes {{
  position: absolute;
  left: 0;
  top: 650px;
  width: 565px;
  display: grid;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}}
.notes li {{
  width: fit-content;
  max-width: 560px;
  padding: 12px 18px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: rgba(255,254,248,.82);
  font-size: 27px;
  line-height: 1.08;
  font-weight: 650;
}}
.visual {{
  position: absolute;
  z-index: 1;
  right: 72px;
  bottom: 150px;
  width: 380px;
  height: 380px;
  opacity: .74;
  filter: grayscale(1);
}}
.visual svg {{
  width: 100%;
  height: 100%;
}}
.cover .visual {{
  left: 85px;
  right: auto;
  bottom: 145px;
  width: 470px;
  height: 470px;
  opacity: .62;
}}
.marker {{
  position: absolute;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}}
.marker path {{
  fill: none;
  stroke: var(--yellow);
  stroke-width: 15;
  stroke-linecap: round;
  stroke-linejoin: round;
}}
.marker .m-circle, .marker .m-under, .marker .m-arrow, .marker .m-arrow-head {{ display: none; }}
.marker.circle {{
  top: 174px;
  left: 210px;
  width: 620px;
  height: 220px;
}}
.marker.circle .m-circle {{ display: block; }}
.marker.circle-small {{
  top: 300px;
  left: 400px;
  width: 410px;
  height: 155px;
}}
.marker.circle-small .m-circle {{ display: block; }}
.marker.underline {{
  top: 263px;
  left: 240px;
  width: 610px;
  height: 130px;
}}
.marker.underline .m-under {{ display: block; }}
.marker.arrow {{
  top: 368px;
  right: 120px;
  width: 340px;
  height: 220px;
}}
.marker.arrow .m-arrow, .marker.arrow .m-arrow-head {{ display: block; }}
footer {{
  position: absolute;
  z-index: 4;
  left: 70px;
  right: 70px;
  bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}}
.swipe {{
  border: 2px solid var(--ink);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 14px;
  font-weight: 800;
}}
.identity {{
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 16px;
  font-weight: 700;
}}
.identity img {{
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
  filter: grayscale(1);
  border: 2px solid var(--ink);
}}
.page {{
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--yellow);
  font-size: 18px;
  font-weight: 900;
}}
.logo {{
  position: fixed;
  right: 22px;
  bottom: 18px;
  width: 1px;
  height: 1px;
  opacity: 0;
}}
@media print {{
  @page {{ size: 1080px 1350px; margin: 0; }}
  html, body {{ width: 1080px; margin: 0; }}
  body {{ background: #fff; }}
  .deck {{ display: block; padding: 0; }}
  .slide {{ box-shadow: none; page-break-after: always; }}
}}
</style>
</head>
<body>
  {'<img class="logo" src="' + logo_src + '" alt="Aethera logo">' if logo_src else ''}
  <div class="deck">
    {''.join(html_slides)}
  </div>
</body>
</html>
"""


OUT.write_text(html_doc, encoding="utf-8")
print(f"Wrote {OUT}")
