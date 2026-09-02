#!/usr/bin/env node
/**
 * Poll public Hacker Noon RSS for published BTQ stories and update the tracker.
 *
 * In-review and rejected states are not public. This only detects a story once
 * it is live. Hacker Noon emails you on publish or feedback; this catches the
 * publish side so you do not have to refresh the dashboard.
 *
 *   node scripts/hackernoon_watch.mjs
 *   node scripts/hackernoon_watch.mjs --dry-run
 *
 * Optional: set HACKERNOON_HANDLE to also fetch /feed/u/<handle> if that feed
 * is reachable for your account. The site-wide feed is always checked.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const TRACKER_JSON = join(ROOT, "articles", "hackernoon", "tracker.json");
export const TRACKER_MD = join(ROOT, "articles", "hackernoon", "TRACKER.md");
export const SITE_FEED = "https://hackernoon.com/feed";
const UA = "BTQ-HN-watch/1.0 (+https://github.com/razveal-svg/btq-article-maker)";

export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function storyMatchesFeedItem(story, item) {
  const haystack = normalize(`${item.title} ${item.link}`);
  if (!haystack) return false;
  const title = normalize(story.title);
  if (title && (haystack.includes(title) || title.includes(haystack))) return true;
  const tokens = (story.match || []).map(normalize).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => haystack.includes(token));
}

export function parseRssItems(xml) {
  const items = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = textOf(block, "title");
    const link = (textOf(block, "link") || textOf(block, "guid")).replace(/\?source=rss.*$/, "");
    if (title || link) items.push({ title, link });
  }
  return items;
}

function textOf(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return parseRssItems(await response.text());
}

export function applyHits(tracker, items, now = new Date()) {
  const posted = [];
  const day = now.toISOString().slice(0, 10);
  const stories = tracker.stories.map((story) => {
    if (story.status === "posted" && story.liveUrl) return story;
    const hit = items.find((item) => storyMatchesFeedItem(story, item));
    if (!hit?.link) return story;
    posted.push({ ...story, liveUrl: hit.link, feedTitle: hit.title });
    return {
      ...story,
      status: "posted",
      liveUrl: hit.link,
      postedAt: story.postedAt || day,
      nextStep: "Live. Share the URL.",
      notes: [story.notes, `Detected live on Hacker Noon ${day}.`].filter(Boolean).join(" "),
    };
  });
  return {
    tracker: { ...tracker, checkedAt: now.toISOString(), stories },
    posted,
  };
}

function section(stories, status) {
  return stories.filter((story) => story.status === status);
}

export function renderTrackerMarkdown(tracker) {
  const submitted = section(tracker.stories, "submitted");
  const posted = section(tracker.stories, "posted");
  const review = section(tracker.stories, "needs_review");
  const suggested = section(tracker.stories, "suggested");
  const checked = tracker.checkedAt
    ? `Last public-feed check: ${tracker.checkedAt}.`
    : "Not checked against the public feed yet.";

  const rows = (stories, cols) => {
    if (stories.length === 0) return "None.\n";
    const header = `| ${cols.map((col) => col.label).join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |\n`;
    const body = stories
      .map((story) => `| ${cols.map((col) => col.value(story)).join(" | ")} |`)
      .join("\n");
    return `${header}${body}\n`;
  };

  let postedBlock = "None yet.\n";
  if (posted.length) {
    postedBlock = rows(posted, [
      { label: "Article", value: (s) => s.title },
      { label: "Live URL", value: (s) => (s.liveUrl ? `[live](${s.liveUrl})` : "—") },
      { label: "Posted", value: (s) => s.postedAt || "—" },
    ]);
  }

  return `# Hacker Noon tracker

${checked}

In-review status is not public. A GitHub Action polls Hacker Noon's public RSS
hourly and marks a story **Posted** when the title appears. Rejection still
arrives by email from Hacker Noon.

Import feed: https://cdn.jsdelivr.net/gh/razveal-svg/btq-article-maker@main/articles/hackernoon/feed.xml

## In HN review (${submitted.length})

${rows(submitted, [
    { label: "Article", value: (s) => s.title },
    { label: "Next step", value: (s) => s.nextStep || "—" },
  ])}
## Posted (${posted.length})

${postedBlock}
## Needs review (${review.length})

${review.length ? rows(review, [
    { label: "Article", value: (s) => s.title },
    { label: "Next step", value: (s) => s.nextStep || "—" },
  ]) : "None.\n"}
## Suggested (${suggested.length})

${rows(suggested, [
    { label: "Article", value: (s) => s.title },
    { label: "Topic", value: (s) => s.topic || "—" },
    { label: "Next step", value: (s) => s.nextStep || "—" },
  ])}`;
}

export async function watch(options = {}) {
  const tracker = JSON.parse(readFileSync(TRACKER_JSON, "utf8"));
  const handle = options.handle || process.env.HACKERNOON_HANDLE || "";
  const feeds = [...(tracker.feeds || [SITE_FEED])];
  if (handle) feeds.push(`https://hackernoon.com/feed/u/${handle}`);

  const items = [];
  const errors = [];
  for (const url of [...new Set(feeds)]) {
    try {
      items.push(...(await fetchFeed(url)));
    } catch (error) {
      errors.push(String(error.message || error));
    }
  }

  if (items.length === 0 && errors.length) {
    throw new Error(errors.join("; "));
  }

  const { tracker: next, posted } = applyHits(tracker, items, options.now);
  const inCi = Boolean(process.env.CI);
  const shouldWrite = !options.dryRun && (posted.length > 0 || !inCi);
  if (shouldWrite) {
    writeFileSync(TRACKER_JSON, `${JSON.stringify(next, null, 2)}\n`);
    writeFileSync(TRACKER_MD, renderTrackerMarkdown(next));
  }
  return { tracker: next, posted, errors, itemCount: items.length };
}

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

const ranDirectly =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ranDirectly) {
  watch(parseArgs(process.argv.slice(2)))
    .then((result) => {
      console.log(`Checked ${result.itemCount} public feed items.`);
      if (result.errors.length) console.warn(result.errors.join("\n"));
      if (result.posted.length === 0) {
        console.log("No submitted stories are live yet.");
        return;
      }
      for (const story of result.posted) {
        console.log(`Posted: ${story.title}`);
        console.log(`  ${story.liveUrl}`);
      }
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}
