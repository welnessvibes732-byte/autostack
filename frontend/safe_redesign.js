const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBUSY') {
        if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
          filelist.push(dirFile);
        }
      }
    }
  });
  return filelist;
};

const srcAppDir = path.join(__dirname, 'src', 'app', 'app');
const files = walkSync(srcAppDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove all glass classes
  content = content.replace(/className=["'].*?liquid-glass.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');
  content = content.replace(/className=["'].*?kinetic-card.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');
  content = content.replace(/className=["'].*?static-panel.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');

  // 2. Remove video background
  content = content.replace(/<video[^>]*src=\{VIDEO_SRC\}[^>]*\/>/g, '');
  content = content.replace(/background:\s*["']linear-gradient\(135deg,\s*rgba\(0,0,0,0\.55\).*?["']/g, 'background: "#000000"');

  // 3. Fix colors
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'background: "#0D0D0D"');
  content = content.replace(/border(?:Top|Bottom|Left|Right)?:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'border: "1px solid #1E1E1E"');
  content = content.replace(/color:\s*["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'color: "#A1A1AA"');
  content = content.replace(/color=["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'color="#A1A1AA"');
  
  // 4. Remove blur
  content = content.replace(/backdropFilter:\s*["']blur\([^)]+\)["']/g, '');
  content = content.replace(/WebkitBackdropFilter:\s*["']blur\([^)]+\)["']/g, '');

  // 5. Replace colored glass cards
  content = content.replace(/background:\s*`linear-gradient\(135deg,\$\{color\}12,\$\{color\}04\)`/g, 'background: "#0D0D0D"');
  content = content.replace(/border:\s*`1px solid \$\{color\}22`/g, 'border: "1px solid #1E1E1E"');
  content = content.replace(/background:\s*`\$\{color\}18`/g, 'background: "#1E1E1E"');
  content = content.replace(/border:\s*`1px solid \$\{color\}30`/g, 'border: "1px solid #333"');

  // 6. Replace Gradients
  content = content.replace(/linear-gradient\(135deg,#3b82f6,#6366f1\)/g, 'linear-gradient(to right, #ec4899, #f97316)');
  content = content.replace(/linear-gradient\(135deg,#3b82f6,#7c3aed\)/g, 'linear-gradient(to right, #ec4899, #f97316)');
  content = content.replace(/linear-gradient\(180deg,#3b82f6,#6366f1\)/g, 'linear-gradient(to bottom, #ec4899, #f97316)');
  content = content.replace(/rgba\(59,130,246,0\.35?\)/g, 'rgba(255,86,86,0.25)');

  // 7. Progress bars fill
  content = content.replace(/className="progress-fill-inner"[^>]+style=\{([^}]+)\}/g, (match, p1) => {
    let newStyle = p1.replace(/background:\s*["']rgba\([^)]+\)["']/, 'background: "#FF5656"');
    newStyle = newStyle.replace(/background:\s*["']#0D0D0D["']/, 'background: "#FF5656"');
    return `className="progress-fill-inner" style={${newStyle}}`;
  });

  // Safe comma cleanup (run multiple times just in case)
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*,/g, ',');

  // 8. Fix mouse hovers that override colors
  content = content.replace(/onMouseEnter=\{e => \[^}]*e\.currentTarget\.style\.background = ["']rgba\(255,255,255,0\.\d+\["'][^}]*\}/g, 'onMouseEnter={e => { e.currentTarget.style.background = "#FF5656"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#FF5656"; }}');
  content = content.replace(/onMouseLeave=\{e => \[^}]*e\.currentTarget\.style\.background = ["'](rgba\(255,255,255,0\.\d+\)|transparent|#0D0D0D)["'][^}]*\}/g, 'onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; e.currentTarget.style.color = "#A1A1AA"; e.currentTarget.style.borderColor = "#1E1E1E"; }}');

  // 9. Add click handlers safely to generic buttons
  content = content.replace(/<button /g, '<button onClick={() => alert("Action triggered successfully!")} ');
  content = content.replace(/onClick=\{\(\) => alert\("Action triggered successfully!"\)\}\s*onClick=/g, 'onClick=');

  // 10. Make specific Upload buttons open file dialog (replacing button with label)
  if (file.includes('invoices')) {
    content = content.replace(
      '><Plus size={14} /> Upload Invoice</button>',
      '><input type="file" hidden onChange={(e) => { if(e.target.files) alert("Invoice upload triggered for " + e.target.files[0].name) }} /><Plus size={14} /> Upload Invoice</label>'
    );
    content = content.replace(
      '<button onClick={() => alert("Action triggered successfully!")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)"',
      '<label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)"'
    );
  }

  if (file.includes('documents')) {
    content = content.replace(
      '><Upload size={14} /> Upload Document</button>',
      '><input type="file" hidden onChange={(e) => { if(e.target.files) alert("Document upload triggered for " + e.target.files[0].name) }} /><Upload size={14} /> Upload Document</label>'
    );
    content = content.replace(
      '<button onClick={() => alert("Action triggered successfully!")} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)"',
      '<label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)"'
    );
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Safe redesign applied to:', file);
  }
});
