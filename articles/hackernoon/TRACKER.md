# Hacker Noon tracker

Status is local. Hacker Noon is not polled. After an RSS import, mark the
story **In HN review**. When editors publish it, paste the live URL and mark
**Posted**.

Working board in Cursor: `hackernoon-article-tracker` canvas.

Import feed (use this URL, not GitHub raw):

https://cdn.jsdelivr.net/gh/razveal-svg/btq-article-maker@main/articles/hackernoon/feed.xml

Rebuild the pack with `node scripts/hackernoon_push.mjs`.

## In HN review (2)

Submitted 2 Sep 2026 via the jsDelivr RSS feed. Staff review is usually
within 3 business days.

| Article | Next step |
| --- | --- |
| Dilithium Didn't Fit in a PSBT. Two Testnet Spends Prove It Does Now | Wait for editors. When live, paste the URL and mark Posted. |
| BTQ Shipped v0.4.4-testnet. Dilithium Fits in a PSBT | Wait for editors. If they reject overlap with the PSBT piece, reshape and resubmit. |

Drafts: `articles/hackernoon-psbt-dilithium.md`, `articles/hackernoon-v0.4.4-testnet.md`.

## Posted

None yet.

## Needs review

None. Local sign-off happened before the RSS import.

## Suggested

| Article | Topic | Next step |
| --- | --- | --- |
| P2MR, or how to keep a public key out of the output | Protocol | Write in Article Maker, then humanize. |
| Reading a Dilithium witness stack, field by field | Explorer | Pick a real testnet spend, then draft. |
| Walking through a 2-of-3 Dilithium spend on regtest | Multisig | Run the flow on regtest, then draft. |
| Why QR codes are the wrong transport for a Dilithium PSBT | Multisig | Short explainer after the PSBT article is live. |
| How fees behave when your witness is large | Protocol | Needs byte counts from an engineer. |
| Where BTQ aligns with BIP 360, and where it goes further | Protocol | Engineer review of consensus scope first. |
| Hash time locked contracts, explained with two chains | HTLC | Draft once a real swap path exists. |
| How to decode a raw Bitcoin Quantum transaction yourself | Explorer | Use one explorer tx as the worked example. |
| Why there is no watch-only xpub for Dilithium accounts | Wallet | Confirm hardened-only HD derivation, then draft. |
| Reproducible builds, and why you should not trust our binaries | Node | Draft from the verify-release docs. |
