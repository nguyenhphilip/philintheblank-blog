import fs from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";
import galleryMeta from "./gallery-meta.json" with { type: "json" };

const GALLERY_DIR = path.join(process.cwd(), "src", "images", "gallery");
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".tif",
  ".tiff"
]);

function titleFromFilename(filename) {
  return filename
    .replace(path.extname(filename), "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDisplayDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

async function generateImageVariants(srcPath) {
  const stats = await Image(srcPath, {
    widths: [400, 1200],
    formats: ["webp", "jpeg"],
    outputDir: "./output/images/generated/gallery/",
    urlPath: "/images/generated/gallery/",
    filenameFormat: function (id, src, width, format) {
      const basename = path.basename(src, path.extname(src));
      return `${basename}-${width}w.${format}`;
    }
  });

  const thumb =
    stats.webp?.find((img) => img.width === 400)?.url ||
    stats.jpeg?.find((img) => img.width === 400)?.url ||
    stats.webp?.[0]?.url ||
    stats.jpeg?.[0]?.url;

  const full =
    stats.webp?.find((img) => img.width === 1200)?.url ||
    stats.jpeg?.find((img) => img.width === 1200)?.url ||
    stats.webp?.[stats.webp.length - 1]?.url ||
    stats.jpeg?.[stats.jpeg.length - 1]?.url;

  const width =
    stats.jpeg?.find((img) => img.width === 400)?.width ||
    stats.webp?.find((img) => img.width === 400)?.width ||
    null;

  const height =
    stats.jpeg?.find((img) => img.width === 400)?.height ||
    stats.webp?.find((img) => img.width === 400)?.height ||
    null;

  return { thumb, full, width, height };
}

export default async function () {
  if (!fs.existsSync(GALLERY_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(GALLERY_DIR)
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const images = await Promise.all(
    files.map(async (file) => {
      const meta = galleryMeta[file] || {};
      const fullPath = path.join(GALLERY_DIR, file);

      const generated = await generateImageVariants(fullPath);

      return {
        filename: file,
        src: generated.full,
        thumb: generated.thumb,
        alt: meta.alt || titleFromFilename(file),
        caption: meta.caption || "",
        date: meta.date || "",
        dateDisplay: formatDisplayDate(meta.date || ""),
        location: meta.location || "",
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        featured: meta.featured || false,
        width: generated.width,
        height: generated.height
      };
    })
  );

  images.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  return images;
}