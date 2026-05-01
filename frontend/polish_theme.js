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

const srcAppDir = path.join(__dirname, 'src', 'app');
const files = walkSync(srcAppDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove all old glass classes
  content = content.replace(/className=["'].*?liquid-glass.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');
  content = content.replace(/className=["'].*?kinetic-card.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');
  content = content.replace(/className=["'].*?static-panel.*?["']/g, 'className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl"');

  // 2. Fix inline hovers
  content = content.replace(/onMouseEnter=\{e => [^}]+style\.background = ["']rgba\(255,255,255,0\.\d+\["'][^}]+\}/g, 'onMouseEnter={e => { e.currentTarget.style.background = "#FF5656"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#FF5656"; }}');
  content = content.replace(/onMouseLeave=\{e => [^}]+style\.background = ["'](rgba\(255,255,255,0\.\d+\)|transparent|#0D0D0D)["'][^}]+\}/g, 'onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; e.currentTarget.style.color = "#A1A1AA"; e.currentTarget.style.borderColor = "#1E1E1E"; }}');

  // 3. Fix colors
  content = content.replace(/background:\s*["']#0D0D0D["']/g, 'background: "#0D0D0D"');
  content = content.replace(/border(?:Top|Bottom|Left|Right)?:\s*["']1px solid rgba\(255,255,255,0\.\d+\)["']/g, 'border: "1px solid #1E1E1E"');
  content = content.replace(/color:\s*["']rgba\(255,255,255,0\.\d+\)["']/g, 'color: "#A1A1AA"');
  content = content.replace(/background:\s*["']rgba\(255,255,255,0\.\d+\)["']/g, 'background: "#0D0D0D"');

  // Fix buttons that should be the pink/orange gradient
  content = content.replace(/className=["']btn btn-primary["']/g, 'className="btn btn-primary bg-gradient-to-r from-pink-500 to-orange-500 text-white border-none"');
  content = content.replace(/className=["']btn["']/g, 'className="btn bg-[#0D0D0D] border border-[#1E1E1E] text-white hover:border-[#FF5656]"');

  // 4. Progress bars fix
  content = content.replace(/className="progress-fill-inner"[^>]+style=\{([^}]+)\}/g, (match, p1) => {
    let newStyle = p1.replace(/background:\s*["']#0D0D0D["']/, 'background: "#FF5656"');
    newStyle = newStyle.replace(/background:\s*["']rgba\([^)]+\)["']/, 'background: "#FF5656"');
    return `className="progress-fill-inner" style={${newStyle}}`;
  });
  // Also catch badges and checkboxes that should be active red
  content = content.replace(/background:\s*["']#0D0D0D["']/g, (match, offset, string) => {
    // If it's a badge or small dot, make it red instead of black
    const prefix = string.slice(Math.max(0, offset - 100), offset);
    if (prefix.includes('width: "6px"') || prefix.includes('width: "7px"') || prefix.includes('badge')) {
      return 'background: "#FF5656"';
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Polished theme in:', file);
  }
});
