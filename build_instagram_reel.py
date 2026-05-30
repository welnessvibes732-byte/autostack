import json
import sys
import base64
import os
from pathlib import Path

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    background: #000;
    font-family: 'Outfit', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    overflow: hidden;
    color: #fff;
}

#player-container {
    width: 1080px;
    height: 1920px;
    background: #030712;
    position: relative;
    overflow: hidden;
    /* Scale to fit modern monitors while keeping 9:16 aspect ratio */
    transform-origin: center center;
    transform: scale(0.45);
    box-shadow: 0 0 50px rgba(255,255,255,0.1);
}

/* Fullscreen mode scaling override */
:fullscreen #player-container {
    transform: scale(calc(var(--vh) / 1920));
}

.slide {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    opacity: 0;
    visibility: hidden;
    transition: opacity 1s ease-in-out;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 120px;
}

.slide.active {
    opacity: 1;
    visibility: visible;
}

/* Color Splashes */
.color-splash-1 {
    position: absolute; width: 1200px; height: 1200px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
    top: -300px; right: -400px; z-index: 1; filter: blur(80px);
}
.color-splash-2 {
    position: absolute; width: 1000px; height: 1000px;
    background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 70%);
    bottom: -200px; left: -200px; z-index: 1; filter: blur(100px);
}

/* Hero Image with Ken Burns Animation */
.hero-art {
    position: absolute;
    right: -10%; top: 40%; transform: translateY(-50%) scale(1);
    width: 1100px; height: 1100px;
    object-fit: contain; z-index: 2; opacity: 0.9;
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 75%);
}

.slide.active .hero-art {
    animation: kenburns 6s linear forwards;
}

@keyframes kenburns {
    0% { transform: translateY(-50%) scale(1); }
    100% { transform: translateY(-50%) scale(1.15); }
}

.text-protector {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(180deg, rgba(3,7,18,0.9) 0%, rgba(3,7,18,0.4) 50%, rgba(3,7,18,1) 100%);
    z-index: 3;
}

/* Typography (Adjusted for Vertical 1080x1920) */
.text-layer {
    position: relative; z-index: 10;
    width: 100%; margin-top: auto; margin-bottom: 200px;
    transform: translateY(50px);
    opacity: 0;
}

.slide.active .text-layer {
    animation: slideUpFade 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
}

@keyframes slideUpFade {
    0% { transform: translateY(50px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.headline {
    font-size: 110px; font-weight: 900; line-height: 1.1;
    letter-spacing: -3px; margin-bottom: 60px; text-transform: uppercase;
    background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 4px 20px rgba(0,0,0,0.8));
}

.cover-headline { font-size: 140px; }

.body {
    font-size: 52px; font-weight: 400; line-height: 1.4; color: #e2e8f0;
    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px);
    padding: 40px 60px; border-left: 8px solid #38bdf8;
    border-radius: 0 24px 24px 0; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.highlight { color: #38bdf8; font-weight: 700; }

.brand-tag {
    position: absolute; top: 120px; left: 120px;
    font-size: 28px; font-weight: 900; color: #38bdf8;
    letter-spacing: 8px; text-transform: uppercase; z-index: 20;
}

/* Progress Bar at the top (Instagram/Snapchat style) */
.story-progress {
    position: absolute; top: 60px; left: 60px; width: calc(100% - 120px);
    display: flex; gap: 10px; z-index: 20;
}
.progress-segment {
    flex: 1; height: 6px; background: rgba(255,255,255,0.2);
    border-radius: 3px; overflow: hidden;
}
.progress-fill {
    height: 100%; width: 0%; background: #ffffff;
}
.slide.active .progress-fill {
    animation: fillProgress 6s linear forwards;
}
.slide.past .progress-fill { width: 100%; }

@keyframes fillProgress {
    0% { width: 0%; }
    100% { width: 100%; }
}

/* Controls */
#controls {
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
    z-index: 999; display: flex; gap: 20px;
}
.btn {
    background: #eab308; color: #000; font-family: 'Outfit', sans-serif;
    font-size: 18px; font-weight: 900; padding: 16px 32px;
    border: none; border-radius: 8px; cursor: pointer;
    text-transform: uppercase; letter-spacing: 2px;
}
"""

JS = """
<script>
    function setVh() {
        let vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    window.addEventListener('resize', setVh);
    setVh();

    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const segments = document.querySelectorAll('.progress-segment');
    let timer;

    function showSlide(index) {
        slides.forEach((s, i) => {
            s.classList.remove('active', 'past');
            if(i < index) s.classList.add('past');
        });
        
        slides[index].classList.add('active');
        
        if(index < slides.length - 1) {
            timer = setTimeout(() => {
                showSlide(index + 1);
            }, 6000); // 6 seconds per slide
        } else {
            setTimeout(() => {
                document.getElementById('play-btn').innerText = "REPLAY";
                document.getElementById('controls').style.display = "flex";
            }, 6000);
        }
    }

    function startReel() {
        document.getElementById('controls').style.display = "none";
        
        // Request fullscreen for perfect screen recording
        const container = document.getElementById('player-container');
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(err => console.log(err));
        }
        
        currentSlide = 0;
        clearTimeout(timer);
        slides.forEach(s => s.classList.remove('active', 'past'));
        setTimeout(() => showSlide(0), 500); // Start delay
    }
</script>
"""

def file_to_b64(filepath):
    if not filepath: return ""
    try:
        p = Path(filepath)
        if not p.exists(): return ""
        mime = "image/png"
        if p.suffix.lower() in [".jpg", ".jpeg"]: mime = "image/jpeg"
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"data:{mime};base64,{b64}"
    except Exception: return ""

def generate_html(spec_path, output_path):
    with open(spec_path, 'r', encoding='utf-8') as f: spec = json.load(f)
    slides = spec.get("slides", [])
    
    html = [f"<!DOCTYPE html><html><head><meta charset='UTF-8'><style>{CSS}</style></head><body>"]
    html.append('<div id="player-container">')
    
    # Story Progress Bar
    html.append('<div class="story-progress">')
    for _ in slides:
        html.append('<div class="progress-segment"><div class="progress-fill"></div></div>')
    html.append('</div>')

    for i, slide in enumerate(slides):
        stype = slide.get("type", "content")
        headline = slide.get("headline", "")
        body = slide.get("body", "")
        highlight = slide.get("highlight", "")
        img_b64 = file_to_b64(slide.get("img_path", ""))

        if highlight and highlight in headline:
            headline = headline.replace(highlight, f"<span class='highlight'>{highlight}</span>")
        if highlight and highlight in body:
            body = body.replace(highlight, f"<span class='highlight'>{highlight}</span>")

        # Initial slide has active class if we wanted, but we start blank
        html.append('<div class="slide">')
        html.append('<div class="color-splash-1"></div><div class="color-splash-2"></div>')
        
        if img_b64 and stype != "closing":
            html.append(f'<img class="hero-art" src="{img_b64}" />')
            
        html.append('<div class="text-protector"></div>')
        html.append('<div class="brand-tag">AETHERA_OS</div>')
        
        html.append('<div class="text-layer">')
        if stype == "cover":
            html.append(f'<h1 class="headline cover-headline">{headline}</h1>')
        else:
            html.append(f'<h1 class="headline">{headline}</h1>')
        if body:
            html.append(f'<p class="body">{body}</p>')
        html.append('</div>')
        html.append('</div>')
        
    html.append('</div>') # end player
    
    html.append('<div id="controls">')
    html.append('<button class="btn" id="play-btn" onclick="startReel()">▶ Play & Fullscreen</button>')
    html.append('</div>')
    
    html.append(JS)
    html.append("</body></html>")

    with open(output_path, 'w', encoding='utf-8') as f: f.write("\n".join(html))
    print(f"Instagram Reel Player generated: {output_path}")

if __name__ == "__main__":
    generate_html(sys.argv[1], sys.argv[2])
