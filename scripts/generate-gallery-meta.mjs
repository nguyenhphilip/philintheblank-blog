import fs from "node:fs";
import path from "node:path";
import * as exifr from "exifr";

const projectRoot = process.cwd();
const galleryDir = path.join(projectRoot, "src", "images", "gallery");
const dataDir = path.join(projectRoot, "src", "_data");
const outputFile = path.join(dataDir, "gallery-meta.json");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".tif",
  ".tiff"
]);

function toIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function getImageDate(fullPath) {
  try {
    const exif = await exifr.parse(fullPath, {
      tiff: true,
      exif: true,
      gps: false,
      xmp: false,
      icc: false,
      iptc: false
    });

    const exifDate =
      exif?.DateTimeOriginal ||
      exif?.CreateDate ||
      exif?.ModifyDate ||
      exif?.DateTimeDigitized;

    const iso = toIsoDate(exifDate);
    if (iso) return iso;
  } catch {
    // Ignore EXIF errors and fall back to file modified date
  }

  try {
    const stats = fs.statSync(fullPath);
    return toIsoDate(stats.mtime);
  } catch {
    return null;
  }
}

function readExistingJson(filepath) {
  if (!fs.existsSync(filepath)) return {};
  try {
    const raw = fs.readFileSync(filepath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not parse existing JSON file at ${filepath}: ${err.message}`);
  }
}

async function main() {
  if (!fs.existsSync(galleryDir)) {
    throw new Error(`Gallery folder not found: ${galleryDir}`);
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const existing = readExistingJson(outputFile);

  const files = fs
    .readdirSync(galleryDir)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    })
    .sort((a, b) => a.localeCompare(b));

  const result = {};

  for (const file of files) {
    const fullPath = path.join(galleryDir, file);
    const existingEntry = existing[file] || {};
    const detectedDate = await getImageDate(fullPath);

    result[file] = {
      caption: existingEntry.caption ?? "",
      location: existingEntry.location ?? "",
      tags: Array.isArray(existingEntry.tags) ? existingEntry.tags : [],
      date: existingEntry.date ?? detectedDate ?? ""
    };

    if ("alt" in existingEntry) {
      result[file].alt = existingEntry.alt;
    }
    if ("featured" in existingEntry) {
      result[file].featured = existingEntry.featured;
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`Wrote ${files.length} image entries to ${outputFile}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});