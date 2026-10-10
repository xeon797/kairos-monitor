// Render the DESIGN §9 SVG using locally installed Satoshi, never a font CDN.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const tokens = await readFile('src/styles/tokens.css', 'utf8');
const color = name => tokens.match(new RegExp(`--color-${name}:\\s*([^;]+);`))[1];
const font = await readFile('public/fonts/Satoshi-Bold.woff2');
const browser = await chromium.launch();
try {
  await mkdir('public/icons', { recursive: true });
  for (const size of [192, 512]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><style>@font-face{font-family:Satoshi;src:url(data:font/woff2;base64,${font.toString('base64')})}text{font-family:Satoshi;font-weight:700}</style><rect width="512" height="512" rx="96" fill="${color('indigo')}"/><text x="256" y="358" text-anchor="middle" font-size="300" fill="${color('lavender')}">K</text></svg>`;
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0}</style>${svg}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `public/icons/kairos-${size}.png`, omitBackground: true });
    // The font-bearing SVG is intentionally not redistributed.
    await page.close();
  }
  await writeFile('public/icons/README.md', '# Kairos Monitor icons\n\nOriginal DESIGN §9 rounded-square K artwork, rendered from SVG to PNG with locally installed Satoshi Bold using `node scripts/generate-icons.mjs`. Colors come from tokens.css. 192 and 512 px, purpose any (not maskable). The font is not embedded in these raster images. ITF FFL permits logos/images through normal font use; no font binary or font-bearing SVG is committed.\n');
} finally { await browser.close(); }
