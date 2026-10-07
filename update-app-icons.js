import fs from 'fs';
import path from 'path';

const sourceIcon = 'C:/Users/NACETEM060/.gemini/antigravity/brain/0fb7df47-6809-40ac-97e4-cbb8fba6c652/nacetem_psr_championship_icon_1791398275808.jpg';
const rootDir = 'C:/Users/NACETEM060/.gemini/antigravity/scratch/psr-gamification-app';

const androidMipmapDirs = [
  'android/app/src/main/res/mipmap-hdpi',
  'android/app/src/main/res/mipmap-mdpi',
  'android/app/src/main/res/mipmap-xhdpi',
  'android/app/src/main/res/mipmap-xxhdpi',
  'android/app/src/main/res/mipmap-xxxhdpi'
];

const iconNames = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];

console.log('--- Updating Android Mipmap App Icons ---');
for (const dir of androidMipmapDirs) {
  const fullDir = path.join(rootDir, dir);
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  for (const name of iconNames) {
    const dest = path.join(fullDir, name);
    fs.copyFileSync(sourceIcon, dest);
    console.log(`Updated: ${dest}`);
  }
}

console.log('--- Updating Web App Icons ---');
const webPublicDir = path.join(rootDir, 'public');
if (!fs.existsSync(webPublicDir)) fs.mkdirSync(webPublicDir, { recursive: true });

fs.copyFileSync(sourceIcon, path.join(webPublicDir, 'icon.png'));
fs.copyFileSync(sourceIcon, path.join(webPublicDir, 'apple-touch-icon.png'));
console.log('Updated public/icon.png and public/apple-touch-icon.png');
