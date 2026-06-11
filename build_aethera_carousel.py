import os

def create_carousel():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aethera Carousel</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  
  :root {
    --bg: #07090F;
    --card: #0D111A;
    --cyan: #00F0FF;
    --indigo: #6366F1;
    --emerald: #10B981;
    --amber: #F59E0B;
    --crimson: #FF3366;
    --text-main: #FFFFFF;
    --text-muted: #8B949E;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    background-color: #111;
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    padding: 40px;
    font-family: 'Inter', sans-serif;
  }
  
  .slide-container {
    width: 1080px;
    height: 1350px;
    background-color: var(--bg);
    position: relative;
    overflow: hidden;
    /* Scale down for preview, scale to 1 before capturing */
    transform-origin: top left;
    transform: scale(0.45);
    margin-bottom: -740px; /* offset the scale */
    margin-right: -590px;
  }
  
  /* Background grid */
  .grid-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-size: 50px 50px;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
    z-index: 0;
  }
  
  .glow {
    position: absolute;
    width: 800px; height: 800px;
    background: radial-gradient(circle, rgba(255,51,102,0.15) 0%, transparent 70%);
    top: -400px; right: -400px;
    border-radius: 50%;
    z-index: 1;
  }
  
  .glow.cyan {
    background: radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%);
    bottom: -400px; left: -400px; top: auto; right: auto;
  }
  
  .bg-num {
    position: absolute;
    bottom: 50px; right: 50px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 400px;
    font-weight: 700;
    color: rgba(255,255,255,0.02);
    z-index: 1;
    line-height: 0.8;
  }
  
  .content-wrapper {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 80px;
  }
  
  .hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: auto;
  }
  
  .logo {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 4px;
    color: var(--text-main);
  }
  
  .sys-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    color: var(--text-muted);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 16px;
    border-radius: 4px;
    background: rgba(0,0,0,0.5);
  }
  
  .main-content {
    margin-bottom: auto;
  }
  
  .title {
    font-size: 96px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -2px;
    color: var(--text-main);
    margin-bottom: 40px;
  }
  
  .title span.red { color: var(--crimson); }
  .title span.cyan { color: var(--cyan); }
  
  .subtitle {
    font-size: 36px;
    line-height: 1.4;
    color: var(--text-muted);
  }
  
  .list-item {
    background: var(--card);
    padding: 40px;
    border-left: 8px solid var(--crimson);
    margin-bottom: 30px;
    font-size: 32px;
    color: var(--text-main);
    line-height: 1.4;
  }
  
  .list-item.cyan-border { border-left-color: var(--cyan); }
  
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 40px;
  }
  
  .author {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .avatar {
    width: 80px; height: 80px;
    background: var(--card);
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.1);
  }
  
  .author-text {
    display: flex;
    flex-direction: column;
  }
  
  .author-name { font-size: 28px; font-weight: 600; color: var(--text-main); }
  .author-role { font-size: 20px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
  
  .page-num {
    font-size: 28px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
  }
  
  .controls {
    position: fixed;
    bottom: 20px; right: 20px;
    z-index: 100;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  
  button {
    background: #000; color: #fff; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 4px;
  }
</style>
</head>
<body>

<!-- SLIDE 1 -->
<div class="slide-container" id="slide1">
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="bg-num">01</div>
  <div class="content-wrapper">
    <div class="hdr">
      <div class="logo">AETHERA</div>
      <div class="sys-id">SYS.DIAGNOSTIC</div>
    </div>
    <div class="main-content">
      <div class="title">Why your Net Operating Income is <span class="red">bleeding</span> right now.</div>
      <div class="subtitle">(And no, it's not your team's fault. It's a structural failure in how your software operates.)</div>
    </div>
    <div class="footer">
      <div class="author">
        <div class="avatar"></div>
        <div class="author-text">
          <span class="author-name">Operator</span>
          <span class="author-role">FOUNDER &middot; AETHERA</span>
        </div>
      </div>
      <div class="page-num">01 / 05</div>
    </div>
  </div>
</div>

<!-- SLIDE 2 -->
<div class="slide-container" id="slide2">
  <div class="grid-bg"></div>
  <div class="glow cyan"></div>
  <div class="bg-num">02</div>
  <div class="content-wrapper">
    <div class="hdr">
      <div class="logo">AETHERA</div>
      <div class="sys-id">THE.INVISIBLE.TAX</div>
    </div>
    <div class="main-content">
      <div class="title">You are paying 3 <span class="red">"Invisible Taxes"</span> to broken software.</div>
      <div class="list-item">
        <strong>1. The 30-Day Blind Spot:</strong><br>
        Your software is great at leasing, but disappears for the next 30 days of operations. Cash gets lost in WhatsApp chats and Excel trackers.
      </div>
    </div>
    <div class="footer">
      <div class="author">
        <div class="avatar"></div>
        <div class="author-text">
          <span class="author-name">Operator</span>
          <span class="author-role">FOUNDER &middot; AETHERA</span>
        </div>
      </div>
      <div class="page-num">02 / 05</div>
    </div>
  </div>
</div>

<!-- SLIDE 3 -->
<div class="slide-container" id="slide3">
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="bg-num">03</div>
  <div class="content-wrapper">
    <div class="hdr">
      <div class="logo">AETHERA</div>
      <div class="sys-id">THE.INVISIBLE.TAX</div>
    </div>
    <div class="main-content">
      <div class="title">The taxes continue...</div>
      <div class="list-item">
        <strong>2. The Human API Tax:</strong><br>
        Highly-paid asset managers acting as human routers for PDFs&mdash;downloading, uploading, and begging for approvals across 4 platforms.
      </div>
      <div class="list-item">
        <strong>3. Invoice Entropy:</strong><br>
        Duplicate vendor payments because your ledger doesn't talk to your maintenance system.
      </div>
    </div>
    <div class="footer">
      <div class="author">
        <div class="avatar"></div>
        <div class="author-text">
          <span class="author-name">Operator</span>
          <span class="author-role">FOUNDER &middot; AETHERA</span>
        </div>
      </div>
      <div class="page-num">03 / 05</div>
    </div>
  </div>
</div>

<!-- SLIDE 4 -->
<div class="slide-container" id="slide4">
  <div class="grid-bg"></div>
  <div class="glow cyan"></div>
  <div class="bg-num">04</div>
  <div class="content-wrapper">
    <div class="hdr">
      <div class="logo">AETHERA</div>
      <div class="sys-id">SYS.RESOLUTION</div>
    </div>
    <div class="main-content">
      <div class="title">Aethera is not a management tool. It's an <span class="cyan">autonomous nervous system</span>.</div>
      <div class="list-item cyan-border">
        <strong>📉 Maintenance closed?</strong><br>The vendor invoice is auto-generated.
      </div>
      <div class="list-item cyan-border">
        <strong>📈 Lease signed?</strong><br>All 12 monthly rent bills are instantly booked to the ledger.
      </div>
      <div class="list-item cyan-border">
        <strong>🛡️ Invoice approved?</strong><br>Paid and synced to cash flow instantly.
      </div>
    </div>
    <div class="footer">
      <div class="author">
        <div class="avatar"></div>
        <div class="author-text">
          <span class="author-name">Operator</span>
          <span class="author-role">FOUNDER &middot; AETHERA</span>
        </div>
      </div>
      <div class="page-num">04 / 05</div>
    </div>
  </div>
</div>

<!-- SLIDE 5 -->
<div class="slide-container" id="slide5">
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="bg-num">05</div>
  <div class="content-wrapper">
    <div class="hdr">
      <div class="logo">AETHERA</div>
      <div class="sys-id">EXECUTE</div>
    </div>
    <div class="main-content" style="margin: auto 0;">
      <div class="title" style="font-size: 110px;">Stop acting as a human router.</div>
      <div class="title" style="font-size: 110px;"><span class="cyan">Stop bleeding yield.</span></div>
      <div class="subtitle" style="margin-top: 60px; font-family: 'JetBrains Mono', monospace; color: var(--cyan);">
        propiq.in / aethera
      </div>
    </div>
    <div class="footer">
      <div class="author">
        <div class="avatar"></div>
        <div class="author-text">
          <span class="author-name">Operator</span>
          <span class="author-role">FOUNDER &middot; AETHERA</span>
        </div>
      </div>
      <div class="page-num">05 / 05</div>
    </div>
  </div>
</div>

<div class="controls">
  <p style="margin-bottom:10px;">Export to PDF</p>
  <button id="downloadBtn">Download Slides</button>
</div>

<script>
  document.getElementById('downloadBtn').addEventListener('click', async () => {
    const btn = document.getElementById('downloadBtn');
    btn.innerText = 'Generating PDF...';
    btn.disabled = true;
    
    try {
      const slides = document.querySelectorAll('.slide-container');
      const { jsPDF } = window.jspdf;
      
      // Aethera 1080x1350 is roughly 4:5 ratio. In pt, 1080px = ~810pt, 1350px = ~1012.5pt
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [1080, 1350]
      });
      
      for(let i=0; i < slides.length; i++) {
        const slide = slides[i];
        // Temporarily reset transform to get full resolution
        slide.style.transform = 'scale(1)';
        
        const canvas = await html2canvas(slide, {
          scale: 2, // High res
          backgroundColor: '#07090F',
          width: 1080,
          height: 1350,
          windowWidth: 1080,
          windowHeight: 1350
        });
        
        slide.style.transform = 'scale(0.45)'; // restore
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
      }
      
      doc.save('Aethera_Carousel_Invisible_Taxes.pdf');
    } catch(err) {
      console.error(err);
      alert('Error generating PDF');
    }
    
    btn.innerText = 'Download Slides';
    btn.disabled = false;
  });
</script>

</body>
</html>
"""
    with open("aethera_carousel.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print("Successfully generated aethera_carousel.html. Open it in your browser and click Download Slides.")

if __name__ == "__main__":
    create_carousel()
