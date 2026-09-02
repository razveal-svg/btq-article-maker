import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  GITHUB_RAW,
  articleHtml,
  listArticles,
  loadArticle,
  mdToHtml,
  parseFrontmatter,
  rssXml,
} from "./hackernoon_push.mjs";

const SAMPLE = `---
title: "Dilithium in a PSBT"
tags:
  - bitcoin
  - cryptography
meta_description: "Typed Dilithium fields on BIP 174."
tldr: "A 2-of-3 spent on testnet."
original: true
featured_image: "assets/hero-dilithium-psbt.jpg"
---

Bitcoin treasuries already pass a [PSBT](https://github.com/bitcoin/bips).

## How a PSBT actually moves

Until this tag, a 2-of-3 needed a \`.btqms\` file.

- One input
- Two outputs

![Why Dilithium](assets/btq-dilithium-why.jpg)

That is **not** a consensus change.
`;

test("reads title, tags, and body from frontmatter", () => {
  const [meta, body] = parseFrontmatter(SAMPLE);
  assert.equal(meta.title, "Dilithium in a PSBT");
  assert.deepEqual(meta.tags, ["bitcoin", "cryptography"]);
  assert.equal(meta.original, true);
  assert.match(body, /Bitcoin treasuries/);
  assert.doesNotMatch(body, /meta_description/);
});

test("converts headings, links, lists, and images", () => {
  const html = mdToHtml(parseFrontmatter(SAMPLE)[1], "https://example.test");
  assert.match(html, /<h2>How a PSBT actually moves<\/h2>/);
  assert.match(html, /href="https:\/\/github.com\/bitcoin\/bips"/);
  assert.match(html, /<ul><li>One input<\/li>/);
  assert.match(html, /https:\/\/example.test\/articles\/assets\/btq-dilithium-why.jpg/);
  assert.match(html, /<strong>not<\/strong>/);
});

test("rss carries the full body in content:encoded", () => {
  const dir = mkdtempSync(join(tmpdir(), "hn-"));
  const path = join(dir, "hackernoon-psbt-dilithium.md");
  writeFileSync(path, SAMPLE);
  const article = loadArticle(path);
  const xml = rssXml([article], "https://example.test");
  assert.match(xml, /<content:encoded>/);
  assert.match(xml, /How a PSBT actually moves/);
  assert.match(xml, /xmlns:content=/);
  assert.match(xml, /https:\/\/example.test\/articles\/hackernoon\/hackernoon-psbt-dilithium.html/);
  assert.match(xml, /<category>bitcoin<\/category>/);
  assert.match(articleHtml(article, "https://example.test"), /<h1>Dilithium in a PSBT<\/h1>/);
});

test("real articles build a feed", () => {
  const articles = listArticles();
  assert.ok(articles.length >= 2);
  assert.ok(articles.some((article) => article.title.includes("PSBT")));
  const xml = rssXml(articles, GITHUB_RAW);
  assert.match(xml, /<content:encoded>/);
  for (const article of articles) {
    assert.ok(xml.includes(article.title));
  }
});
