import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FILES = ["pool-gate-broken.jpg", "irrigation-leak.jpg", "trail-light.jpg"];

/**
 * Removes EXIF/XMP/ICC metadata (camera, timestamps, and any GPS location)
 * from the demo photos before they are committed to a public repository.
 * sharp omits metadata on output unless withMetadata() is called.
 */
async function main() {
  const dir = path.join(process.cwd(), "public", "demo-images");

  for (const name of FILES) {
    const file = path.join(dir, name);
    const input = fs.readFileSync(file);
    const before = await sharp(input).metadata();

    // rotate() applies any EXIF orientation to the pixels before the tag is dropped.
    const output = await sharp(input).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    fs.writeFileSync(file, output);

    const after = await sharp(output).metadata();
    console.log(
      `${name}: ${Math.round(input.length / 1024)} KB -> ${Math.round(output.length / 1024)} KB, ` +
        `exif ${before.exif?.length ?? 0} -> ${after.exif?.length ?? 0} bytes, ` +
        `${after.width}x${after.height}`,
    );
  }
}

void main();
