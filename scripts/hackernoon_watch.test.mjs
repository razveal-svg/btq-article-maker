import test from "node:test";
import assert from "node:assert/strict";

import {
  applyHits,
  parseRssItems,
  renderTrackerMarkdown,
  storyMatchesFeedItem,
} from "./hackernoon_watch.mjs";

const RSS = `<?xml version="1.0"?>
<rss><channel>
<item>
  <title><![CDATA[Dilithium Didn't Fit in a PSBT. Two Testnet Spends Prove It Does Now]]></title>
  <link>https://hackernoon.com/dilithium-didnt-fit-in-a-psbt-two-testnet-spends-prove-it-does-now?source=rss</link>
</item>
<item>
  <title>Unrelated story</title>
  <link>https://hackernoon.com/unrelated</link>
</item>
</channel></rss>`;

test("parses rss titles and strips the source query", () => {
  const items = parseRssItems(RSS);
  assert.equal(items.length, 2);
  assert.equal(
    items[0].link,
    "https://hackernoon.com/dilithium-didnt-fit-in-a-psbt-two-testnet-spends-prove-it-does-now",
  );
});

test("matches on distinctive tokens when the editor rewrites the title", () => {
  const story = { title: "BTQ Shipped v0.4.4-testnet. Dilithium Fits in a PSBT", match: ["0.4.4", "psbt"] };
  assert.equal(
    storyMatchesFeedItem(story, {
      title: "Dilithium now fits in a PSBT on BTQ Core 0.4.4",
      link: "https://hackernoon.com/example",
    }),
    true,
  );
  assert.equal(
    storyMatchesFeedItem(story, { title: "Unrelated bitcoin post", link: "https://hackernoon.com/x" }),
    false,
  );
});

test("promotes a submitted story to posted and leaves unmatched ones", () => {
  const tracker = {
    feeds: ["https://hackernoon.com/feed"],
    stories: [
      {
        id: "psbt-dilithium",
        title: "Dilithium Didn't Fit in a PSBT. Two Testnet Spends Prove It Does Now",
        status: "submitted",
        match: ["dilithium", "psbt"],
      },
      {
        id: "v044-testnet",
        title: "BTQ Shipped v0.4.4-testnet. Dilithium Fits in a PSBT",
        status: "submitted",
        match: ["0.4.4", "psbt"],
      },
    ],
  };
  const { tracker: next, posted } = applyHits(tracker, parseRssItems(RSS), new Date("2026-09-03T12:00:00Z"));
  assert.equal(posted.length, 1);
  assert.equal(next.stories[0].status, "posted");
  assert.equal(
    next.stories[0].liveUrl,
    "https://hackernoon.com/dilithium-didnt-fit-in-a-psbt-two-testnet-spends-prove-it-does-now",
  );
  assert.equal(next.stories[1].status, "submitted");
  assert.match(renderTrackerMarkdown(next), /## Posted \(1\)/);
});
