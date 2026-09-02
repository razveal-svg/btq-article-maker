# AGENTS.md

Guidance for AI coding agents (Cursor, Claude Code, Codex, etc.) working in this repository.

## What this repo is

BTQ Article Maker — a Cursor-adapted fork of [blader/humanizer](https://github.com/blader/humanizer). The runtime artifact is a Markdown skill the agent reads at session time. There is no build step.

## Key files

- `SKILL.md` — editable source of truth for the humanizer skill (33 numbered patterns with before/after examples).
- `.cursor/skills/humanizer/SKILL.md` — Cursor runtime copy. **Keep in sync with root `SKILL.md`** after any skill edit.
- `README.md` — human docs: Cursor installation, usage, pattern table, version history.
- `articles/` — humanized article drafts (Hacker Noon, etc.).
- `scripts/hackernoon_push.mjs` — builds the RSS/HTML pack Hacker Noon’s importer accepts. There is no Hacker Noon publish API; do not scrape their CMS.
- `scripts/hackernoon_watch.mjs` — polls the public Hacker Noon RSS feed and marks submitted stories Posted when they appear. In-review/rejected are not public.
- `references/wikipedia-signs-of-ai-writing.md` — CC BY-SA snapshot of Wikipedia:Signs of AI writing. Not MIT-licensed.
- `.claude-plugin/` — optional upstream Claude Code plugin manifests (not required for Cursor).
- `scripts/validate-package.py` — dependency-free package checks.
- `.env` — local Gemini key (`GEMINI_API_KEY`). **Never commit it.** Copy from `.env.example`.
- `scripts/gemini.py` / `scripts/humanize.py` — optional Gemini backend for file-mode humanize. AQ. keys must use the native `generateContent` endpoint (`x-goog-api-key`), not OpenAI-compatible Bearer auth.

## Cursor workflow

1. Edit `SKILL.md` at the repo root.
2. Copy to `.cursor/skills/humanizer/SKILL.md`:
   ```powershell
   Copy-Item SKILL.md .cursor\skills\humanizer\SKILL.md
   ```
3. Start a new Agent chat in Cursor (or reload the window) so the updated skill loads.

To test: ask the agent to humanize a short AI-sounding paragraph, or point it at a markdown file.

## The maintenance contract

`SKILL.md`, `.cursor/skills/humanizer/SKILL.md`, and `README.md` must stay in sync.

- **Patterns:** the skill defines **33 numbered patterns**. If you add, remove, or renumber any, update the README pattern table, its "N Patterns Detected" heading, and every cross-reference in the same change.
- **Version:** bump `metadata.version` in `SKILL.md`, the README "Version History" section, and `.claude-plugin/plugin.json` together.
- **Cursor copy:** after editing `SKILL.md`, always recopy to `.cursor/skills/humanizer/SKILL.md`.
- **Validation:** run `python scripts/validate-package.py` before committing.

## Editing SKILL.md

- Preserve valid YAML frontmatter (`name`, `description`, `metadata.version`).
- The `description` must be third person and include trigger terms so Cursor discovers the skill when users ask to humanize text.
- The prompt below the frontmatter is the product. Edit it like a careful instruction document, not code.
