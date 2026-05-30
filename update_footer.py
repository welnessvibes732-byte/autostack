import re

with open('build_carousel_v4.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace CSS
css_old = """/* ── FOOTER ── */
.footer {{
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,.1);
  padding-top: 30px;
  display: flex; justify-content: space-between; align-items: center;
}}
.footer-brand {{
  font-size: 28px; font-weight: 900; letter-spacing: -1px;
  display: flex; align-items: center; gap: 16px;
}}
.footer-logo {{ width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--cyan); }}
.footer-profile {{ width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,.2); }}
.footer-right {{ display: flex; align-items: center; gap: 20px; }}
.footer-name {{ font-size: 20px; font-weight: 700; color: var(--white); letter-spacing: -.3px; }}
.footer-role {{ font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--muted); letter-spacing: 1px; }}
.page-num {{ font-family: 'JetBrains Mono', monospace; font-size: 18px; color: var(--muted); font-weight: 700; }}"""

css_new = """/* ── FOOTER ── */
.footer {{
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,.1);
  padding-top: 30px;
  display: flex; justify-content: space-between; align-items: center;
}}
.footer-author {{
  display: flex; align-items: center; gap: 20px;
}}
.footer-profile {{ width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 3px solid var(--cyan); }}
.footer-name {{ font-size: 24px; font-weight: 800; color: var(--white); letter-spacing: -.5px; line-height: 1.2; }}
.footer-role {{ font-family: 'JetBrains Mono', monospace; font-size: 15px; color: var(--cyan); letter-spacing: 1px; margin-top: 4px; }}

.footer-right {{
  display: flex; align-items: center; gap: 24px;
}}
.footer-brand {{
  font-size: 24px; font-weight: 900; letter-spacing: -1px; color: var(--muted);
  display: flex; align-items: center; gap: 12px;
}}
.footer-logo {{ width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,.1); opacity: 0.8; }}
.page-num {{ font-family: 'JetBrains Mono', monospace; font-size: 20px; color: var(--white); font-weight: 800; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; }}"""

content = content.replace(css_old, css_new)

# Replace slide 1 footer
s1_old = """    <div class="footer">
      <div class="footer-brand">
        <img class="footer-logo" src="{LOGO}" alt="Aethera"> Aethera
      </div>
      <div class="footer-right">
        <img class="footer-profile" src="{PROFILE}" alt="Nithesh">
        <div>
          <div class="footer-name">Nithesh Devarla</div>
          <div class="footer-role">FOUNDER · AETHERA</div>
        </div>
        <div class="page-num">01 / 07</div>
      </div>
    </div>"""

s1_new = """    <div class="footer">
      <div class="footer-author">
        <img class="footer-profile" src="{PROFILE}" alt="Nithesh">
        <div>
          <div class="footer-name">Nithesh Devarla</div>
          <div class="footer-role">FOUNDER · AETHERA</div>
        </div>
      </div>
      <div class="footer-right">
        <div class="footer-brand">Aethera <img class="footer-logo" src="{LOGO}" alt="Aethera"></div>
        <div class="page-num">01 / 07</div>
      </div>
    </div>"""
content = content.replace(s1_old, s1_new)

# Replace other slides
for i in range(2, 8):
    old_f = f"""    <div class="footer">
      <div class="footer-brand"><img class="footer-logo" src="{{LOGO}}" alt="Aethera"> Aethera</div>
      <div class="footer-right">
        <img class="footer-profile" src="{{PROFILE}}" alt="Nithesh">
        <div><div class="footer-name">Nithesh Devarla</div><div class="footer-role">FOUNDER · AETHERA</div></div>
        <div class="page-num">0{i} / 07</div>
      </div>
    </div>"""
    new_f = f"""    <div class="footer">
      <div class="footer-author">
        <img class="footer-profile" src="{{PROFILE}}" alt="Nithesh">
        <div>
          <div class="footer-name">Nithesh Devarla</div>
          <div class="footer-role">FOUNDER · AETHERA</div>
        </div>
      </div>
      <div class="footer-right">
        <div class="footer-brand">Aethera <img class="footer-logo" src="{{LOGO}}" alt="Aethera"></div>
        <div class="page-num">0{i} / 07</div>
      </div>
    </div>"""
    content = content.replace(old_f, new_f)

with open('build_carousel_v4.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated footers successfully.")
