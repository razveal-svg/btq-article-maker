#!/usr/bin/env node
/**
 * Build a Hacker Noon import pack from local article markdown.
 *
 * Hacker Noon has no public publish API. Stories still go through their editors.
 * This script does the part you can automate: turn markdown into the RSS /
 * Direct URL payload their importer already accepts.
 *
 *   node scripts/hackernoon_push.mjs
 *   node scripts/hackernoon_push.mjs --serve
 *   node scripts/hackernoon_push.mjs --serve --tunnel --open
 *
 * Then in https://app.hackernoon.com/new hover Import Story and paste the feed
 * URL (RSS) or an article HTML URL (Direct URL). Submit for review there.
 * Nothing here logs into Hacker Noon or posts on your behalf.
 */

import { execFileSync, spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const ARTICLES = join(ROOT, "articles");
export const OUT_DIR = join(ARTICLES, "hackernoon");
export const GITHUB_RAW = "https://raw.githubusercontent.com/razveal-svg/btq-article-maker/main";
export const IMPORT_PAGE = "https://app.hackernoon.com/new";
export const DEFAULT_PORT = 8787;

function openPage(url) {
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" })
      : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".xml": "application/rss+xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

export function parseFrontmatter(text) {
  if (!text.startsWith("---")) return [{}, text];
  const end = text.indexOf("\n---", 3);
  if (end < 0) return [{}, text];
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const data = {};
  let currentList = null;
  for (const line of raw.split(/\r?\n/)) {
    if (currentList && /^  - /.test(line)) {
      let item = line.slice(4).trim();
      if (
        (item.startsWith('"') && item.endsWith('"')) ||
        (item.startsWith("'") && item.endsWith("'"))
      ) {
        item = item.slice(1, -1);
      }
      data[currentList].push(item);
      continue;
    }
    currentList = null;
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (value === "") {
      currentList = key;
      data[key] = [];
      continue;
    }
    if (value === "true" || value === "false") {
      data[key] = value === "true";
      continue;
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      data[key] = value.slice(1, -1);
      continue;
    }
    data[key] = value;
  }
  return [data, body];
}

export function loadArticle(path) {
  const [meta, body] = parseFrontmatter(readFileSync(path, "utf8"));
  const slug = path.split(/[/\\]/).pop().replace(/\.md$/i, "");
  const featured = String(meta.featured_image || "").split(" (from ")[0].trim();
  const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : meta.tags ? [String(meta.tags)] : [];
  return {
    slug,
    path,
    title: String(meta.title || slug.replace(/-/g, " ")),
    body,
    tags,
    description: String(meta.meta_description || meta.tldr || ""),
    tldr: String(meta.tldr || ""),
    original: meta.original !== false,
    featuredImage: featured,
  };
}

export function listArticles() {
  return readdirSync(ARTICLES)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => loadArticle(join(ARTICLES, name)));
}

export function rewriteMedia(url, baseUrl) {
  if (!url || /^(https?:|data:)/i.test(url)) return url;
  const relativePath = url.replace(/^\.\//, "");
  const path = `articles/${relativePath}`;
  if (!baseUrl) {
    return relativePath.startsWith("assets/") ? `../${relativePath}` : relativePath;
  }
  return `${baseUrl.replace(/\/$/, "")}/${path}`;
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(text) {
  const placeholders = [];
  const hold = (chunk) => {
    placeholders.push(chunk);
    return `\0${placeholders.length - 1}\0`;
  };
  let out = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    hold(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`),
  );
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
    hold(`<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`),
  );
  out = escapeHtml(out);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out.replace(/\0(\d+)\0/g, (_, index) => placeholders[Number(index)]);
}

export function mdToHtml(markdown, baseUrl) {
  markdown = markdown.replaceAll("\r\n", "\n");
  const fences = [];
  markdown = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    fences.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
    return `\n\n@@FENCE${fences.length - 1}@@\n\n`;
  });
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `![${alt}](${rewriteMedia(src, baseUrl)})`;
  });

  const blocks = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const fence = line.trim().match(/^@@FENCE(\d+)@@$/);
    if (fence) {
      flushParagraph();
      flushList();
      blocks.push(fences[Number(fence[1])]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks.join("\n");
}

function featuredImg(article, baseUrl) {
  if (!article.featuredImage) return "";
  const filename = article.featuredImage.split("/").pop();
  if (article.body.includes(article.featuredImage) || (filename && article.body.includes(filename))) {
    return "";
  }
  const src = rewriteMedia(article.featuredImage, baseUrl);
  return `<p><img src="${escapeHtml(src)}" alt="${escapeHtml(article.title)}"></p>\n`;
}

export function articleHtml(article, baseUrl) {
  const body = mdToHtml(article.body, baseUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(article.title)}</title>
  <meta name="description" content="${escapeHtml(article.description)}">
</head>
<body>
<article>
<h1>${escapeHtml(article.title)}</h1>
${featuredImg(article, baseUrl)}${body}
</article>
</body>
</html>
`;
}

export function rssXml(articles, baseUrl) {
  const channelLink = baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "";
  const feedHref = baseUrl ? `${channelLink}articles/hackernoon/feed.xml` : "feed.xml";
  const items = articles.map((article) => {
    const link = baseUrl
      ? `${channelLink}articles/hackernoon/${article.slug}.html`
      : `${article.slug}.html`;
    const categories = article.tags.slice(0, 8).map((tag) => `<category>${escapeHtml(tag)}</category>`).join("");
    let body = mdToHtml(article.body, baseUrl);
    const lead = featuredImg(article, baseUrl);
    if (lead) body = `${lead}${body}`;
    return `    <item>
      <title>${escapeHtml(article.title)}</title>
      <link>${escapeHtml(link)}</link>
      <guid isPermaLink="true">${escapeHtml(link)}</guid>
      <description><![CDATA[${article.description}]]></description>
      <content:encoded><![CDATA[${body}]]></content:encoded>
      ${categories}
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>BTQ Hacker Noon drafts</title>
    <link>${escapeHtml(channelLink)}</link>
    <description>Full-text Bitcoin Quantum stories for the Hacker Noon RSS importer.</description>
    <atom:link href="${escapeHtml(feedHref)}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}

export function writePack(articles, baseUrl) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const article of articles) {
    writeFileSync(join(OUT_DIR, `${article.slug}.html`), articleHtml(article, baseUrl), "utf8");
  }
  const feedPath = join(OUT_DIR, "feed.xml");
  writeFileSync(feedPath, rssXml(articles, baseUrl), "utf8");
  writeFileSync(
    join(OUT_DIR, "README.md"),
    "Generated by `node scripts/hackernoon_push.mjs`. Do not edit by hand.\nImport this feed in https://app.hackernoon.com/new (Import Story → RSS Feed).\n",
    "utf8",
  );
  return feedPath;
}

export function githubFeedUrl() {
  return `${GITHUB_RAW}/articles/hackernoon/feed.xml`;
}

function startServer(port) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const filePath = join(ROOT, urlPath.replace(/^[/\\]+/, ""));
    const rel = relative(ROOT, filePath);
    if (rel.startsWith("..") || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function which(bin) {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    return execFileSync(cmd, [bin], { encoding: "utf8" }).split(/\r?\n/)[0];
  } catch {
    return "";
  }
}

function startTunnel(port) {
  const cloudflared = which("cloudflared");
  if (!cloudflared) {
    throw new Error(
      "cloudflared is not on PATH. Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ or skip --tunnel, git push the generated feed, and import the GitHub raw URL.",
    );
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(cloudflared, ["tunnel", "--url", `http://127.0.0.1:${port}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const onData = (chunk) => {
      const line = String(chunk);
      process.stderr.write(line);
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        proc.stdout.off("data", onData);
        proc.stderr.off("data", onData);
        proc.stdout.on("data", (more) => process.stderr.write(more));
        proc.stderr.on("data", (more) => process.stderr.write(more));
        resolve(match[0]);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code) reject(new Error(`cloudflared exited ${code}`));
    });
  });
}

function parseArgs(argv) {
  const args = { serve: false, tunnel: false, open: false, port: DEFAULT_PORT, baseUrl: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--serve") args.serve = true;
    else if (flag === "--tunnel") args.tunnel = true;
    else if (flag === "--open") args.open = true;
    else if (flag === "--port") args.port = Number(argv[++i]);
    else if (flag === "--base-url") args.baseUrl = argv[++i];
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const articles = listArticles();
  if (!articles.length) {
    throw new Error(`No markdown articles in ${ARTICLES}`);
  }
  const baseUrl = args.baseUrl || GITHUB_RAW;
  const feedPath = writePack(articles, baseUrl);
  console.log(`Wrote ${articles.length} stories to ${OUT_DIR}`);
  console.log(`Feed: ${feedPath}`);
  for (const article of articles) console.log(`  - ${article.title}`);

  if (args.tunnel) args.serve = true;

  if (!args.serve) {
    console.log("");
    console.log("Hacker Noon has no publish API. Import this pack:");
    console.log("  1. git add articles/hackernoon && git commit && git push");
    console.log(`  2. Open ${IMPORT_PAGE}`);
    console.log("  3. Import Story → RSS Feed → paste:");
    console.log(`     ${githubFeedUrl()}`);
    console.log("  4. Pick the stories, save, then Submit Story for Review.");
    if (args.open) openPage(IMPORT_PAGE);
    return;
  }

  const server = await startServer(args.port);
  console.log(`Local feed: http://127.0.0.1:${args.port}/articles/hackernoon/feed.xml`);

  if (args.tunnel) {
    const publicUrl = await startTunnel(args.port);
    writePack(articles, publicUrl);
    console.log("");
    console.log(`Public feed: ${publicUrl}/articles/hackernoon/feed.xml`);
    console.log(`Import UI:   ${IMPORT_PAGE}`);
    console.log("Import Story → RSS Feed → paste the public feed URL, then Submit Story for Review.");
    if (args.open) openPage(IMPORT_PAGE);
  } else {
    console.log("Hacker Noon cannot fetch localhost. Re-run with --tunnel, or git push and import:");
    console.log(`  ${githubFeedUrl()}`);
    console.log(`Import UI: ${IMPORT_PAGE}`);
    if (args.open) openPage(IMPORT_PAGE);
  }

  await new Promise(() => {
    /* keep serving until Ctrl+C */
  });
  server.close();
}

const ranDirectly = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ranDirectly) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
