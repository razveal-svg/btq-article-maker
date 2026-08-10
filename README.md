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
| `scripts/validate-package.py` | Package consistency checks |
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

**License:** MIT (see `LICENSE`).

## Status / ownership

- **Current host:** personal GitHub (`razveal-svg/btq-article-maker`) until an org admin can move it under [`btq-ag`](https://github.com/btq-ag).
- **Intended home:** `btq-ag/btq-article-maker` (private), shared with marketing/content.
- **Primary use:** Cursor Agent skill for BTQ article and marketing prose cleanup.
