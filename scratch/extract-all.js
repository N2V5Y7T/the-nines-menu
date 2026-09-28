import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ffmpeg = 'C:\\Users\\evele\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';
const videosDir = 'assets/videos';
const outDir = 'public/frames';
const manifestPath = 'public/frames/manifest.json';

const videos = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
const manifest = {};
let totalSize = 0;

console.log(`Starting extraction of ${videos.length} videos at 12fps...`);

for (const video of videos) {
    const name = path.basename(video, '.mp4');
    console.log(`Processing ${name}...`);
    
    const frameDir = path.join(outDir, name);
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });
    
    // Extract frames at 12fps, 720px width, WebP q=82
    try {
        execSync(`"${ffmpeg}" -v warning -i "${path.join(videosDir, video)}" -vf "fps=12,scale=720:-1" -c:v libwebp -quality 82 -loop 0 -lossless 0 "${path.join(frameDir, 'frame%04d.webp')}" -y`);
    } catch (e) {
        console.error(`Error extracting ${name}`);
        continue;
    }
    
    // Count frames and calculate size
    const frames = fs.readdirSync(frameDir).filter(f => f.startsWith('frame'));
    const count = frames.length;
    if (count === 0) continue;
    
    let size = 0;
    for (const f of frames) size += fs.statSync(path.join(frameDir, f)).size;
    totalSize += size;
    
    // Middle frame for placeholder & holdFrame
    const midIdx = Math.floor(count / 2);
    const midFrame = `frame${String(midIdx).padStart(4, '0')}.webp`;
    
    // Generate 20px blur placeholder
    try {
        execSync(`"${ffmpeg}" -v warning -i "${path.join(frameDir, midFrame)}" -vf "scale=20:-1,boxblur=2:1" -c:v libwebp -quality 30 "${path.join(frameDir, 'placeholder.webp')}" -y`);
    } catch (e) {
        console.error(`Error creating placeholder for ${name}`);
    }
    
    const placeholderSize = fs.existsSync(path.join(frameDir, 'placeholder.webp')) 
        ? fs.statSync(path.join(frameDir, 'placeholder.webp')).size 
        : 0;
    
    manifest[name] = {
        frameCount: count,
        holdFrame: midIdx,
        sizeBytes: size,
        placeholderBytes: placeholderSize
    };
    console.log(`  -> ${count} frames, ${(size/1024/1024).toFixed(2)} MB`);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nAll done! Total compressed frames size: ${(totalSize/1024/1024).toFixed(2)} MB`);
