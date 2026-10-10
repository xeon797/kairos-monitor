// Build-time installation only. Each deployment obtains its own official copy;
// restricted font binaries and downloaded license files remain outside Git.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const weights = ['Regular', 'Medium', 'Bold'];
const fontDirectory = path.join(projectRoot, 'public', 'fonts');
const downloadDirectory = path.join(projectRoot, '.local', 'satoshi-download');
const familyDirectory = path.join(downloadDirectory, 'Satoshi_Complete');

async function hasOfficialFontFiles() {
  for (const weight of weights) {
    try {
      const font = await readFile(path.join(fontDirectory, `Satoshi-${weight}.woff2`));
      if (font.subarray(0, 4).toString('ascii') !== 'wOF2') return false;
    } catch {
      return false;
    }
  }
  return true;
}

if (await hasOfficialFontFiles()) {
  console.log('Satoshi 400/500/700 webfonts are already installed locally.');
} else {
  await mkdir(downloadDirectory, { recursive: true });
  await mkdir(fontDirectory, { recursive: true });

  if (process.platform === 'win32') {
    execFileSync('powershell.exe', [
      '-NoProfile', '-File', path.join(projectRoot, 'scripts', 'install-satoshi.ps1'),
    ], { cwd: projectRoot, stdio: 'inherit' });
  } else {
    const response = await fetch('https://api.fontshare.com/v2/fonts/download/satoshi', {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Official Satoshi download failed (${response.status}).`);
    const archivePath = path.join(downloadDirectory, 'satoshi.zip');
    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));

    // Vercel's Linux builder provides unzip. Extract only the three unchanged
    // webfonts and their license, rather than publishing the vendor archive.
    execFileSync('unzip', [
      '-q', '-o', archivePath,
      ...weights.map(weight => `Satoshi_Complete/Fonts/WEB/fonts/Satoshi-${weight}.woff2`),
      'Satoshi_Complete/License/FFL.txt',
      '-d', downloadDirectory,
    ], { cwd: projectRoot, stdio: 'inherit' });

    const license = await readFile(path.join(familyDirectory, 'License', 'FFL.txt'), 'utf8');
    if (!license.includes('ITF Free Font License')) throw new Error('Official font license is missing.');
    for (const weight of weights) {
      await copyFile(
        path.join(familyDirectory, 'Fonts', 'WEB', 'fonts', `Satoshi-${weight}.woff2`),
        path.join(fontDirectory, `Satoshi-${weight}.woff2`),
      );
    }
  }

  if (!await hasOfficialFontFiles()) throw new Error('Satoshi installation did not produce all three WOFF2 files.');
  console.log('Installed official Satoshi 400/500/700 webfonts for this build.');
  console.log('License retained locally at .local/satoshi-download/Satoshi_Complete/License/FFL.txt.');
}
