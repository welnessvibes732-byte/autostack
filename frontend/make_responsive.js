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

  // 1. Fix grid 4
  content = content.replace(
    /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']repeat\(4,\s*1fr\)["'],\s*gap:\s*["']([^"']+)["'][^}]*\}\}/g,
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "$1" }}'
  );

  // 2. Fix grid 3
  content = content.replace(
    /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']repeat\(3,\s*1fr\)["'],\s*gap:\s*["']([^"']+)["'][^}]*\}\}/g,
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "$1" }}'
  );

  // 3. Fix grid 2
  content = content.replace(
    /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 1fr["'],\s*gap:\s*["']([^"']+)["'][^}]*\}\}/g,
    'className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "$1" }}'
  );

  // 4. Fix dashboard specific grid "1fr 310px"
  content = content.replace(
    /style=\{\{\s*display:\s*["']grid["'],\s*gridTemplateColumns:\s*["']1fr 310px["'],\s*gap:\s*["']([^"']+)["'][^}]*\}\}/g,
    'className="grid grid-cols-1 lg:grid-cols-[1fr_310px]" style={{ gap: "$1" }}'
  );

  // 5. Wrap tables to prevent overflow
  // Look for `<table ` and ensure parent has overflowX: auto
  content = content.replace(
    /<div style=\{\{\s*borderRadius:\s*["']16px["'],\s*background:\s*["']var\(--surface\)["'],\s*border:\s*["']1px solid var\(--border\)["'],\s*overflow:\s*["']hidden["']\s*\}\}>\s*<table/g,
    '<div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>\n        <table'
  );
  content = content.replace(
    /<div style=\{\{\s*borderRadius:\s*["']16px["'],\s*border:\s*["']1px solid var\(--border\)["'],\s*overflow:\s*["']hidden["']\s*\}\}>\s*<table/g,
    '<div style={{ borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>\n        <table'
  );

  // 6. Fix header flex overlaps on mobile
  content = content.replace(
    /style=\{\{\s*display:\s*["']flex["'],\s*justifyContent:\s*["']space-between["'],\s*alignItems:\s*["']flex-end["'](.*?)\}\}/g,
    'className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ $1 }}'
  );

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Made responsive:', file);
  }
});

// Fix layout.tsx specifically for the sidebar
const layoutPath = path.join(srcAppDir, 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  // Add tailwind class to main container
  layoutContent = layoutContent.replace(
    /<div style=\{\{\s*display:\s*["']flex["'],\s*height:\s*["']100dvh["']/,
    '<div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden relative bg-black text-white font-[Poppins,system-ui,sans-serif]" style={{'
  );
  layoutContent = layoutContent.replace(
    /display: "flex", height: "100dvh", overflow: "hidden",\s*background: "#000", color: "#fff",\s*fontFamily: "'Poppins', system-ui, sans-serif",\s*position: "relative",/,
    ''
  );

  // Make sidebar hidden on mobile unless toggled, and absolute overlay
  // The sidebar currently has `display: "flex"`
  // We can add responsive classes: `hidden md:flex`
  // Actually, let's inject a CSS media query block for the sidebar into globals.css instead to be safer
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
  console.log('Fixed layout container');
}

// Add responsive sidebar CSS to globals.css
const globalsPath = path.join(__dirname, 'src', 'app', 'globals.css');
if (fs.existsSync(globalsPath)) {
  let globalsContent = fs.readFileSync(globalsPath, 'utf8');
  if (!globalsContent.includes('@media (max-width: 768px) {')) {
    globalsContent += `\n
@media (max-width: 768px) {
  /* Hide sidebar on mobile unless we have a specific mobile nav, but for now just let it stack if it's flex-col */
  aside {
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    z-index: 50;
    position: fixed !important;
    bottom: 0;
    left: 0;
    right: 0;
    flex-direction: row !important;
    overflow-x: auto;
    padding: 10px;
    background: #000 !important;
    border-top: 1px solid #1E1E1E !important;
  }
  aside > div { display: none !important; } /* hide logo etc */
  aside > nav { display: flex !important; flex-direction: row !important; gap: 8px; }
  aside > nav > a { flex-direction: column !important; padding: 8px !important; font-size: 10px !important; text-align: center; justify-content: center; min-width: 60px; }
  aside > nav > a > svg { margin: 0 auto; }
  aside > button { display: none !important; } /* hide collapse btn */
  
  main {
    padding-bottom: 80px !important; /* space for bottom nav */
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
  
  .page-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px; }
  .anim-filter { flex-direction: column !important; width: 100%; align-items: stretch !important; }
  .anim-filter > div { max-width: 100% !important; }
  
  /* Modal fixes */
  .fixed > div { width: 95% !important; max-width: 95% !important; }
}
`;
    fs.writeFileSync(globalsPath, globalsContent, 'utf8');
    console.log('Injected mobile CSS into globals.css');
  }
}
