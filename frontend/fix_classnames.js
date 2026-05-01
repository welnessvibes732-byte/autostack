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

  // Combine double classNames into one:
  // Since it can be `<header className="page-header" className="flex..."`
  // we do a regex replace while it matches.
  while (/className="([^"]+)"\s*className="([^"]+)"/g.test(content)) {
    content = content.replace(/className="([^"]+)"\s*className="([^"]+)"/g, 'className="$1 $2"');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed double className in:', file);
  }
});
