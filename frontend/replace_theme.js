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

  // Replace glassmorphism inline styles
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'background: "#0D0D0D"');
  content = content.replace(/border(?:Top|Bottom|Left|Right)?:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'border: "1px solid #1E1E1E"');
  content = content.replace(/borderBottom:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'borderBottom: "1px solid #1E1E1E"');
  content = content.replace(/borderTop:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'borderTop: "1px solid #1E1E1E"');
  
  // Replace colors
  content = content.replace(/color:\s*["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'color: "#A1A1AA"');
  content = content.replace(/color=["']rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/g, 'color="#A1A1AA"');

  // Replace backdrop filter
  content = content.replace(/backdropFilter:\s*["']blur\([^)]+\)["']/g, '');
  content = content.replace(/WebkitBackdropFilter:\s*["']blur\([^)]+\)["']/g, '');

  // Replace ripples/glows with solid accents
  content = content.replace(/background:\s*["']radial-gradient\([^)]+\)["']/g, 'background: "transparent"');

  // Replace progress bars fill
  content = content.replace(/background:\s*["']rgba\(255,\s*255,\s*255,\s*0\.65\)["']/g, 'background: "#FF5656"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
