import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Generates placeholder scenario images so the demo runs end to end before real
 * staged photos exist. These are schematic illustrations, not photographs.
 * Replace them with staged synthetic photos before the keynote.
 *
 * No caption or watermark is drawn: the vision model reads any text in the
 * image and would report it as an observation on stage.
 */

const WIDTH = 1280;
const HEIGHT = 960;

function watermark(): string {
  return "";
}

function pickets(x: number, count: number, spacing: number, top: number, bottom: number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    out += `<rect x="${x + i * spacing}" y="${top}" width="7" height="${bottom - top}" fill="#1f2937"/>`;
  }
  return out;
}

function perspectivePickets(count: number): string {
  // Gate leaf swung open away from the fence line, drawn in perspective.
  const nearTop = { x: 470, y: 300 };
  const nearBottom = { x: 470, y: 630 };
  const farTop = { x: 742, y: 356 };
  const farBottom = { x: 742, y: 586 };
  let out = "";
  for (let i = 1; i < count; i += 1) {
    const t = i / count;
    const x1 = nearTop.x + (farTop.x - nearTop.x) * t;
    const y1 = nearTop.y + (farTop.y - nearTop.y) * t;
    const x2 = nearBottom.x + (farBottom.x - nearBottom.x) * t;
    const y2 = nearBottom.y + (farBottom.y - nearBottom.y) * t;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1f2937" stroke-width="6"/>`;
  }
  return out;
}

const poolGate = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bfdcf5"/><stop offset="100%" stop-color="#e8f1fa"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4aa3d8"/><stop offset="100%" stop-color="#1e6fa8"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>
  <rect x="0" y="330" width="${WIDTH}" height="180" fill="url(#water)"/>
  <rect x="0" y="500" width="${WIDTH}" height="${HEIGHT - 500}" fill="#cfd6dd"/>
  <rect x="0" y="500" width="${WIDTH}" height="14" fill="#b6bec7"/>

  <!-- fixed fence sections -->
  <rect x="60" y="300" width="14" height="330" fill="#111827"/>
  <rect x="60" y="312" width="400" height="9" fill="#111827"/>
  <rect x="60" y="600" width="400" height="9" fill="#111827"/>
  ${pickets(86, 13, 29, 312, 609)}

  <rect x="880" y="300" width="16" height="330" fill="#111827"/>
  <rect x="890" y="312" width="330" height="9" fill="#111827"/>
  <rect x="890" y="600" width="330" height="9" fill="#111827"/>
  ${pickets(912, 11, 29, 312, 609)}
  <rect x="1206" y="300" width="14" height="330" fill="#111827"/>

  <!-- open gate leaf: hinged at the left post, swung inward toward the pool deck -->
  <polygon points="470,300 742,356 742,586 470,630" fill="#e8f1fa" opacity="0.35"/>
  ${perspectivePickets(12)}
  <line x1="470" y1="300" x2="742" y2="356" stroke="#111827" stroke-width="10"/>
  <line x1="470" y1="630" x2="742" y2="586" stroke="#111827" stroke-width="10"/>
  <rect x="460" y="296" width="18" height="340" fill="#111827"/>
  <rect x="734" y="352" width="14" height="238" fill="#111827"/>
  <rect x="726" y="452" width="34" height="22" rx="5" fill="#6b7280"/>

  <!-- latch post the gate should be closed against, with an obvious open gap -->
  <rect x="862" y="300" width="18" height="330" fill="#111827"/>
  <rect x="846" y="446" width="34" height="30" rx="5" fill="#6b7280"/>

  <!-- pool rules sign -->
  <rect x="96" y="360" width="250" height="150" rx="10" fill="#ffffff" stroke="#1f2937" stroke-width="5"/>
  <text x="221" y="405" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="30" font-weight="700" fill="#0f172a">POOL</text>
  <text x="221" y="443" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="22" fill="#0f172a">RESIDENT ACCESS</text>
  <text x="221" y="475" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="22" fill="#0f172a">KEEP GATE CLOSED</text>

  ${watermark()}
</svg>`;

const irrigationLeak = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#dbe7d3"/>
  <rect x="0" y="0" width="${WIDTH}" height="330" fill="#7da96b"/>
  <rect x="0" y="330" width="${WIDTH}" height="230" fill="#8fbb7c"/>
  <!-- walking path -->
  <polygon points="0,560 ${WIDTH},470 ${WIDTH},700 0,820" fill="#cfcfc7"/>
  <polygon points="0,560 ${WIDTH},470 ${WIDTH},486 0,578" fill="#b9b9b1"/>
  <rect x="0" y="700" width="${WIDTH}" height="${HEIGHT - 700}" fill="#7da96b"/>
  <!-- sheet of water crossing the path -->
  <polygon points="430,520 640,506 980,640 620,700" fill="#5fa9d6" opacity="0.88"/>
  <polygon points="470,530 620,520 880,626 640,664" fill="#8ccbea" opacity="0.9"/>
  <ellipse cx="900" cy="672" rx="150" ry="36" fill="#5fa9d6" opacity="0.7"/>
  <!-- spray from a failed head -->
  <circle cx="440" cy="516" r="16" fill="#3f4a44"/>
  <path d="M440 510 C 400 440, 470 400, 520 452" stroke="#9fd4ef" stroke-width="12" fill="none" opacity="0.9"/>
  <path d="M442 512 C 470 430, 560 424, 596 486" stroke="#9fd4ef" stroke-width="10" fill="none" opacity="0.85"/>
  ${watermark()}
</svg>`;

const trailLight = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#22304a"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#night)"/>
  <rect x="0" y="640" width="${WIDTH}" height="${HEIGHT - 640}" fill="#1b2a1b"/>
  <polygon points="520,640 760,640 980,960 300,960" fill="#3a4250"/>
  <!-- unlit pole light in the foreground -->
  <rect x="392" y="250" width="22" height="420" fill="#0d1622"/>
  <rect x="330" y="232" width="150" height="26" rx="8" fill="#0d1622"/>
  <rect x="344" y="256" width="122" height="16" rx="6" fill="#141d2c"/>
  <!-- a lit fixture further down the trail for contrast -->
  <rect x="884" y="392" width="14" height="280" fill="#0d1622"/>
  <rect x="844" y="380" width="96" height="18" rx="6" fill="#0d1622"/>
  <ellipse cx="892" cy="410" rx="70" ry="26" fill="#f6e7b0" opacity="0.55"/>
  <polygon points="892,404 990,660 794,660" fill="#f6e7b0" opacity="0.16"/>
  ${watermark()}
</svg>`;

const outputs: Array<[string, string]> = [
  ["pool-gate-broken.jpg", poolGate],
  ["irrigation-leak.jpg", irrigationLeak],
  ["trail-light.jpg", trailLight],
];

async function main() {
  const dir = path.join(process.cwd(), "public", "demo-images");
  fs.mkdirSync(dir, { recursive: true });

  for (const [name, svg] of outputs) {
    const file = path.join(dir, name);
    await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(file);
    console.log(`Wrote ${file}`);
  }

  console.log(
    "Placeholder images generated. Replace with staged synthetic photos before the keynote.",
  );
}

void main();
