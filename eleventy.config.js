import Image from "@11ty/eleventy-img";
import { dateFilter } from './src/filters/date-filter.js';
import { w3DateFilter } from './src/filters/w3-date-filter.js';
import { wikiDateFilter } from './src/filters/wiki-date-filter.js';

function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export default function (eleventyConfig) {
    eleventyConfig.addFilter('dateFilter', dateFilter);
    eleventyConfig.addFilter('w3DateFilter', w3DateFilter);
    eleventyConfig.addFilter('wikiDateFilter', wikiDateFilter);

    eleventyConfig.addFilter("truncate", (value, length = 140) => {
        if (!value) return "";
        const stripped = String(value).trim();
        return stripped.length > length
            ? stripped.slice(0, length).trimEnd() + "..."
            : stripped;
    });

    eleventyConfig.setInputDirectory('src');
    eleventyConfig.setOutputDirectory('output');

    eleventyConfig.addPassthroughCopy("src/css");
    eleventyConfig.addPassthroughCopy("src/images");
    eleventyConfig.addPassthroughCopy("src/js");
    eleventyConfig.addPassthroughCopy('src/resume');

    eleventyConfig.addShortcode("image", async function (
        src,
        alt,
        sizes = "100vw",
        widths = [400, 800, 1200]
    ) {
        let metadata = await Image(`src${src}`, {
            widths,
            formats: ["webp", "jpeg"],
            outputDir: "./output/images/generated/",
            urlPath: "/images/generated/"
        });

        let imageAttributes = {
            alt,
            sizes,
            loading: "lazy",
            decoding: "async"
        };

        return Image.generateHTML(metadata, imageAttributes);
    });

    eleventyConfig.addShortcode("galleryImage", async function (
        src,
        alt,
        caption = "",
        sizes = "(min-width: 900px) 25vw, (min-width: 600px) 50vw, 100vw",
        widths = [500, 760, 1200]
    ) {
        let metadata = await Image(`src${src}`, {
            widths,
            formats: ["webp", "jpeg"],
            outputDir: "./output/images/generated/",
            urlPath: "/images/generated/"
        });

        let imageAttributes = {
            alt,
            sizes,
            loading: "lazy",
            decoding: "async"
        };

        const thumb = Image.generateHTML(metadata, imageAttributes);
        const fullImage = metadata.jpeg[metadata.jpeg.length - 1].url;
        const safeCaption = escapeHtml(caption || alt);

        return `
            <a
                href="${fullImage}"
                class="gallery__item"
                data-caption="${safeCaption}"
                aria-label="Open image: ${escapeHtml(alt)}"
            >
                ${thumb}
            </a>
        `;
    });

    eleventyConfig.addCollection('blog', (collection) => {
        return [...collection.getFilteredByGlob('./src/blog/*.md')].reverse();
    });

    eleventyConfig.addCollection('poems', (collection) => {
        return [...collection.getFilteredByGlob('./src/poems/*.md')].reverse();
    });

    eleventyConfig.addCollection('projects', (collection) => {
        return [...collection.getFilteredByGlob('./src/projects/*.md')].reverse();
    });

    eleventyConfig.addCollection('tagList', (collectionApi) => {
        const tagSet = new Set();
        const excluded = new Set(['all', 'nav', 'blog', 'poems', 'projects']);

        collectionApi.getAll().forEach((item) => {
            if (!item.data.tags) return;

            item.data.tags.forEach((tag) => {
                if (!excluded.has(tag)) {
                    tagSet.add(tag);
                }
            });
        });

        return [...tagSet].sort();
    });
}

export const config = {
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
};