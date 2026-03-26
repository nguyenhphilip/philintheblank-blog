import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://poets.org/poem-a-day";
const DATA_OUTPUT_PATH = path.join(__dirname, "..", "src", "_data", "poemaday.json");
const CACHE_DIR = path.join(__dirname, "..", ".cache", "poemaday");
const CACHE_INDEX_PATH = path.join(CACHE_DIR, "index.json");

const USER_AGENT = "Mozilla/5.0 (compatible; eleventy-poemaday-fetcher/1.0)";
const REQUEST_DELAY_MS = 500;
const CACHE_TTL_HOURS = 24 * 30; // 30 days
const MAX_EMPTY_PAGES_IN_A_ROW = 5;

// Keep only poems from 2017 onward
const START_DATE = "2017-01-01";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function toIsoDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, m, d, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function hashString(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function isOnOrAfterStartDate(isoDate) {
  return isoDate >= START_DATE;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = {}) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function isCacheFresh(cachedAtIso) {
  if (!cachedAtIso) return false;

  const cachedAt = new Date(cachedAtIso).getTime();
  const now = Date.now();
  const ageMs = now - cachedAt;
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000;

  return ageMs < ttlMs;
}

async function getCachedHtml(url) {
  const index = await readJson(CACHE_INDEX_PATH, {});
  const key = hashString(url);
  const entry = index[key];

  if (!entry || !entry.file || !isCacheFresh(entry.cachedAt)) {
    return null;
  }

  const htmlPath = path.join(CACHE_DIR, entry.file);
  if (!(await fileExists(htmlPath))) {
    return null;
  }

  return await fs.readFile(htmlPath, "utf8");
}

async function setCachedHtml(url, html) {
  const index = await readJson(CACHE_INDEX_PATH, {});
  const key = hashString(url);
  const fileName = `${key}.html`;
  const htmlPath = path.join(CACHE_DIR, fileName);

  await ensureDir(CACHE_DIR);
  await fs.writeFile(htmlPath, html, "utf8");

  index[key] = {
    url,
    file: fileName,
    cachedAt: new Date().toISOString()
  };

  await writeJson(CACHE_INDEX_PATH, index);
}

async function fetchHtml(url, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = await getCachedHtml(url);
    if (cached) {
      console.log(`Using cache: ${url}`);
      return cached;
    }
  }

  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  const html = await res.text();
  await setCachedHtml(url, html);
  await sleep(REQUEST_DELAY_MS);

  return html;
}

function extractArchiveRows(html, pageNum) {
  const $ = cheerio.load(html);
  const records = [];

  const headings = $("h1, h2, h3, h4").filter((_, el) =>
    cleanText($(el).text()).toLowerCase().includes("previous poems")
  );

  if (!headings.length) {
    return records;
  }

  let node = headings.first().next();

  while (node.length) {
    const tagName = (node.get(0)?.tagName || "").toLowerCase();
    const nodeText = cleanText(node.text());

    if (["h1", "h2", "h3", "h4"].includes(tagName) && nodeText) {
      break;
    }

    const links = node.find("a[href]").toArray();
    const dateMatch = nodeText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);

    if (dateMatch && links.length >= 2) {
      const titleLink = links[0];
      const authorLink = links[1];

      const title = cleanText($(titleLink).text());
      const author = cleanText($(authorLink).text());
      const href = $(titleLink).attr("href");
      const displayDate = dateMatch[0];
      const isoDate = toIsoDate(displayDate);

      if (title && author && href && isoDate) {
        records.push({
          date: isoDate,
          displayDate,
          title,
          author,
          url: new URL(href, BASE_URL).toString(),
          archivePage: pageNum
        });
      }
    }

    node = node.next();
  }

  return records;
}

function buildLookup(records) {
  const lookup = {};

  for (const record of records) {
    lookup[record.date] = {
      title: record.title,
      author: record.author,
      url: record.url
    };
  }

  return lookup;
}

async function scrapePoemADay({ forceRefresh = false } = {}) {
  const results = [];
  const seen = new Set();

  let page = 0;
  let emptyPagesInARow = 0;
  let pastRangePagesInARow = 0;
  const MAX_PAST_RANGE_PAGES = 3;

  while (true) {
    const url = `${BASE_URL}?page=${page}`;

    try {
      const html = await fetchHtml(url, { forceRefresh });
      const rows = extractArchiveRows(html, page);

      if (!rows.length) {
        emptyPagesInARow += 1;
      } else {
        emptyPagesInARow = 0;
      }

      let newCount = 0;
      let pageHasWantedDates = false;

      for (const row of rows) {
        if (isOnOrAfterStartDate(row.date)) {
          pageHasWantedDates = true;

          const key = `${row.date}|||${row.title}|||${row.url}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(row);
            newCount += 1;
          }
        }
      }

      // Once pages are entirely older than 2017 for several pages in a row, stop.
      if (rows.length > 0 && !pageHasWantedDates) {
        pastRangePagesInARow += 1;
      } else {
        pastRangePagesInARow = 0;
      }

      console.log(
        `Page ${page}: ${rows.length} rows, ${newCount} kept (>= ${START_DATE})`
      );

      if (emptyPagesInARow >= MAX_EMPTY_PAGES_IN_A_ROW) {
        console.log("Stopping after repeated empty pages.");
        break;
      }

      if (pastRangePagesInARow >= MAX_PAST_RANGE_PAGES) {
        console.log(`Stopping after passing before ${START_DATE}.`);
        break;
      }

      page += 1;
    } catch (error) {
      console.warn(`Stopped on page ${page}: ${error.message}`);
      break;
    }
  }

  return results;
}

async function main() {
  const forceRefresh = process.argv.includes("--refresh");

  const records = await scrapePoemADay({ forceRefresh });
  const lookup = buildLookup(records);

  await writeJson(DATA_OUTPUT_PATH, lookup);

  console.log(`Wrote ${Object.keys(lookup).length} entries to ${DATA_OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});