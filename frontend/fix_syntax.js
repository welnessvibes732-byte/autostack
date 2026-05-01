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

  // Replace }}} with }} for the mouseLeave handlers
  content = content.replace(/borderColor = "#1E1E1E";\s*\}\}\s*\}/g, 'borderColor = "#1E1E1E"; }}');
  
  // Fix layout.tsx dangling comma
  content = content.replace(/borderRadius:\s*"50%",\s*,\s*border:\s*"1px solid #1E1E1E"/g, 'borderRadius: "50%", border: "1px solid #1E1E1E"');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in:', file);
  }
});
