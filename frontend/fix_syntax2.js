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

  // Fix `style={{ , ` issue
  content = content.replace(/style=\{\{\s*,\s*/g, 'style={{ ');
  
  // Remove empty style={{  }} completely to be clean
  content = content.replace(/style=\{\{\s*\}\}/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax error in:', file);
  }
});

// also fix layout.tsx
const layoutPath = path.join(srcAppDir, 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  layoutContent = layoutContent.replace(/style=\{\{\s*,\s*/g, 'style={{ ');
  layoutContent = layoutContent.replace(/style=\{\{\s*\}\}/g, '');
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
}
