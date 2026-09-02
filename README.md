# BTQ Article Maker

A Cursor skill for BTQ marketing and content work. It rewrites AI-sounding drafts so articles, blog posts, and campaign copy read like a person wrote them — without inventing facts or changing the underlying claims.

This repo is a BTQ-adapted fork of [blader/humanizer](https://github.com/blader/humanizer), packaged for Cursor under `.cursor/skills/humanizer/`.

## Why this exists

BTQ content often starts as notes, research dumps, or AI-assisted drafts. Those drafts are useful for speed, but they tend to pick up familiar LLM tells: inflated significance, promotional filler, synonym cycling, em-dash stacking, and generic conclusions.

**BTQ Article Maker** is the editorial pass we run in Cursor before publish. Marketing and content can:

- Drop a draft paragraph or full markdown article into Agent chat
- Ask the agent to humanize it (optionally with a BTQ voice sample)
- Get a rewrite that keeps the facts and cuts the AI gloss

It is not a CMS, a CMS plug-in, or a fact-checker. It only improves how the prose sounds.

## How we use it at BTQ

| Use case | What to do |
|----------|------------|
| Blog / article draft | Open this folder in Cursor, point Agent at the draft file, ask to humanize the prose |
| Short social / email copy | Paste the draft into chat and ask to humanize |
| Match BTQ voice | Paste 2–3 paragraphs of approved BTQ writing first, then the draft |
| Keep structure intact | Ask for file mode: rewrite prose only; leave code, frontmatter, links, and data alone |

**Suggested prompt:**

```
Humanize the prose in drafts/post.md so it sounds like BTQ marketing wrote it.
Keep every factual claim. Do not invent product details, dates, or citations.
```

**With voice matching:**

```
Here is a sample of approved BTQ writing:
[paste 2–3 paragraphs]

Now humanize this draft the same way:
[paste draft]
```

## Setup (Cursor)

1. Clone this repo (or open the existing `btq-article-maker` folder).
2. In Cursor: **File → Open Folder** → select `btq-article-maker`.
3. Start a new Agent chat.
4. Ask the agent to humanize text or a file.

The runtime skill lives at `.cursor/skills/humanizer/SKILL.md`. Root `SKILL.md` is the editable source of truth — keep them in sync after edits.

**Optional: install the skill globally** (available in every Cursor project):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cursor\skills\humanizer"
Copy-Item ".cursor\skills\humanizer\SKILL.md" "$env:USERPROFILE\.cursor\skills\humanizer\"
```

Restart Cursor or start a new Agent session after copying.

**Optional: Gemini API** (batch humanize without using Cursor's model):

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` (AI Studio keys start with `AQ.`).
2. Ping the key, then humanize a file:

```powershell
python scripts/gemini.py --ping
python scripts/humanize.py articles\draft.md
python scripts/humanize.py articles\draft.md -o articles\draft.humanized.md
```

`.env` is gitignored. Do not paste the key into `SKILL.md` or commit it.

## Hacker Noon import

Hacker Noon has no public API that can publish a story. Their editors still review every submission. What you can skip is the copy-paste into their editor: they already import from an RSS feed or a Direct URL.

From this folder:

```powershell
node scripts/hackernoon_push.mjs
```

That writes `articles/hackernoon/feed.xml` plus one HTML file per story, with the full body in `content:encoded` (the importer ignores a description-only feed). Then:

1. Commit and push `articles/hackernoon/`.
2. Open [app.hackernoon.com/new](https://app.hackernoon.com/new).
3. **Import Story → RSS Feed** and paste:

   `https://cdn.jsdelivr.net/gh/razveal-svg/btq-article-maker@main/articles/hackernoon/feed.xml`

   GitHub raw serves `text/plain`; the importer rejects it. jsDelivr serves `application/xml`.
4. Pick the stories, save, then **Submit Story for Review**.
5. Mark them **In HN review** on [`articles/hackernoon/TRACKER.md`](articles/hackernoon/TRACKER.md). A GitHub Action polls Hacker Noon’s public RSS every hour and marks a story **Posted** when it goes live (in-review and rejected are not public; those still arrive by email). You can also run `node scripts/hackernoon_watch.mjs` locally. Optional repo variable `HACKERNOON_HANDLE` adds your author feed.

To preview locally: `node scripts/hackernoon_push.mjs --serve`. Hacker Noon cannot fetch `localhost`. If you have [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed, `--serve --tunnel --open` exposes the pack for one import session and opens the import page. Featured images only import if they are public URLs (commit them under `articles/assets/` or host them first).

## What it catches

The skill follows [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) and applies **33 patterns**, including:

- Significance inflation and promotional language
- Vague “experts say” attributions
- Overused AI vocabulary (`delve`, `landscape`, `testament`, `showcase`, …)
- Em/en dashes, rule-of-three lists, synonym cycling
- Chatbot leftovers (“I hope this helps!”, “Let’s dive in”)
- Generic upbeat conclusions

Full pattern list with before/after examples: see `SKILL.md`.

## Guardrails

- **No fabrication.** Rewrites must not add facts, names, dates, product claims, or citations that are not in the source. If a sentence needs a real detail, the skill should ask or keep the plain version.
- **Information over shape.** Claims survive; paragraph structure can change.
- **Voice sample wins.** If you provide BTQ writing samples, matching that voice beats scrubbing every style preference.
- **Prose only in file mode.** Code blocks, YAML frontmatter, tables of data, and link URLs stay untouched.

## Repo layout

| Path | Role |
|------|------|
| `SKILL.md` | Editable skill source (patterns + process) |
| `.cursor/skills/humanizer/SKILL.md` | Cursor runtime copy — keep in sync with root |
| `AGENTS.md` | Notes for AI agents maintaining this repo |
| `articles/` | Humanized drafts for Hacker Noon (markdown source) |
| `articles/hackernoon/` | Generated RSS + HTML import pack (`scripts/hackernoon_push.mjs`) |
| `articles/hackernoon/TRACKER.md` | Posted / in review / suggested board (does not poll Hacker Noon) |
| `references/wikipedia-signs-of-ai-writing.md` | Dated CC BY-SA snapshot of Wikipedia:Signs of AI writing (not MIT) |
| `scripts/validate-package.py` | Package consistency checks |
| `.env.example` | Gemini key placeholder (`GEMINI_API_KEY`) |
| `scripts/gemini.py` | Native Gemini generateContent client |
| `scripts/humanize.py` | File-mode humanize via Gemini + `SKILL.md` |
| `scripts/hackernoon_watch.mjs` | Hourly public RSS poll; marks stories Posted when they go live |
| `.claude-plugin/` | Optional upstream Claude Code packaging (not required for Cursor) |

## Maintaining the skill

1. Edit root `SKILL.md`.
2. Copy to Cursor:

```powershell
Copy-Item SKILL.md .cursor\skills\humanizer\SKILL.md
```

3. Bump `metadata.version` in `SKILL.md` and note the change in git history.
4. Run validation before committing:

```bash
python scripts/validate-package.py
```

5. Start a new Agent chat so Cursor reloads the skill.

## Origin and license

Adapted from [blader/humanizer](https://github.com/blader/humanizer) (MIT). Pattern guidance is based on Wikipedia’s AI-writing cleanup work.

**License:** MIT (see `LICENSE`). The Wikipedia snapshot in `references/` is CC BY-SA 4.0 and is not MIT-licensed.

## Pattern table (33)

| # | Pattern |
|---|---------|
| 1 | Undue emphasis on significance, legacy, and broader trends |
| 2 | Undue emphasis on notability and media coverage |
| 3 | Superficial analyses with -ing endings |
| 4 | Promotional and advertisement-like language |
| 5 | Vague attributions and weasel words |
| 6 | Outline-like "challenges and future prospects" sections |
| 7 | Overused AI vocabulary words |
| 8 | Avoidance of is/are (copula avoidance) |
| 9 | Negative parallelisms and tailing negations |
| 10 | Rule of three overuse |
| 11 | Elegant variation (synonym cycling) |
| 12 | False ranges |
| 13 | Passive voice and subjectless fragments |
| 14 | Em dashes and en dashes |
| 15 | Overuse of boldface |
| 16 | Inline-header vertical lists |
| 17 | Title case in headings |
| 18 | Emojis |
| 19 | Curly quotation marks |
| 20 | Collaborative communication artifacts |
| 21 | Knowledge-cutoff disclaimers and speculative gap-filling |
| 22 | Sycophantic/servile tone |
| 23 | Filler phrases |
| 24 | Excessive hedging |
| 25 | Generic positive conclusions |
| 26 | Hyphenated word pair overuse |
| 27 | Persuasive authority tropes |
| 28 | Signposting and announcements |
| 29 | Fragmented headers |
| 30 | Diff-anchored writing |
| 31 | Manufactured punchlines and staccato drama |
| 32 | Aphorism formulas |
| 33 | Conversational rhetorical openers |

## Version history

- **2.9.3** — Added a local Wikipedia:Signs of AI writing snapshot (retrieved 17 August 2026) and a human-readable syntax preserve-list so article passes keep is/has, plain verbs, and specific detail instead of over-smoothing.
- **2.9.2** — Prior packaged skill (33 patterns).

## Status / ownership

- **Current host:** personal GitHub (`razveal-svg/btq-article-maker`) until an org admin can move it under [`btq-ag`](https://github.com/btq-ag).
- **Intended home:** `btq-ag/btq-article-maker` (private), shared with marketing/content.
- **Primary use:** Cursor Agent skill for BTQ article and marketing prose cleanup.
