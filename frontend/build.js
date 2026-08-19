const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'build');

console.log('Building Hangman Pro static assets for Vercel deployment...');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Ignore build, node_modules, .git, src, etc.
    if (entry.isDirectory()) {
      if (!['build', 'node_modules', '.git', 'src'].includes(entry.name)) {
        copyDir(srcPath, destPath);
      }
    } else {
      if (!['package.json', 'package-lock.json', '.gitignore', '.env.production', 'vercel.json', 'build.js'].includes(entry.name)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

copyDir(srcDir, destDir);
console.log('✓ Hangman Pro static assets successfully packaged into frontend/build!');
