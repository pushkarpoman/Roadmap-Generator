const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(repoRoot, 'Frontend');
const backendPublic = path.join(repoRoot, 'Backend', 'public');

try {
  console.log('Installing frontend dependencies...');
  execSync('npm ci', { cwd: frontendDir, stdio: 'inherit' });

  console.log('Building frontend...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  const distDir = path.join(frontendDir, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('Frontend build did not produce a dist/ directory');
  }

  // Ensure backend public directory exists
  fs.mkdirSync(backendPublic, { recursive: true });

  console.log('Copying frontend build to Backend/public...');

  // Copy files from dist to Backend/public (recursive)
  const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyRecursiveSync(distDir, backendPublic);
  console.log('Frontend build copied successfully.');
} catch (err) {
  console.error('Error during frontend build-and-copy:', err);
  process.exit(1);
}
