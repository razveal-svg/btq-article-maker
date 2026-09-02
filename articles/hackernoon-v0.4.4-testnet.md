---
title: "BTQ Shipped v0.4.4-testnet. Dilithium Fits in a PSBT"
headline_chars: 52
tags:
  - bitcoin
  - bitcoin-quantum
  - cryptography
  - blockchain
  - quantum-computing
  - bitcoin-core
  - wallets
  - post-quantum
  - quantum-resistant
  - cybersecurity
meta_description: "Bitcoin Quantum (BTQ) shipped Core v0.4.4-testnet. The quantum-resistant Bitcoin fork can now pass Dilithium spends in a normal PSBT. Testnet only."
tldr: "BTQ is Bitcoin Quantum, a quantum-resistant Bitcoin Core fork: Dilithium (FIPS 204) on spends, SHA-256 proof of work, 21 million cap. v0.4.4-testnet landed 18 August 2026 with Linux and Windows zips. A PSBT can carry Dilithium P2MR leaves, control blocks, and partial signatures, so a quantum-safe 2-of-3 does not need a shared .btqms file. This tag does not change consensus. v0.4.3 was tagged the same day without binaries and did change consensus: LWMA window 144. Upgrade from 0.4.2 together. Testnet only. Mainnet is not launched."
original: true
editor_note: "Drafted from the published BTQ Core v0.4.4-testnet and v0.4.3-testnet release notes. Prose went through BTQ Article Maker, a local editorial skill based on Wikipedia's Signs of AI writing page. Please treat this as AI-assisted cleanup of sourced notes, not a generated explainer."
---

BTQ is Bitcoin Quantum. It is a quantum-resistant version of Bitcoin: a Bitcoin Core fork that keeps the 21 million cap and SHA-256 proof of work, and puts NIST Dilithium (FIPS 204) on the spends. If you already know how a Bitcoin node feels, the idea is that this one still feels like that, except the signatures are built to hold up when quantum computers get good at breaking ECDSA.

Ordinary Bitcoin custody already depends on passing a file between people so two of three can approve a payment without putting keys on the same laptop. That file is a PSBT. Until this release, Bitcoin Quantum's post-quantum signatures did not fit in it. You had to use a homemade JSON blob instead. The new testnet build is mostly about closing that gap.

## What shipped

BTQ Core [v0.4.4-testnet](https://github.com/btq-ag/btq-core/releases/tag/v0.4.4-testnet) was published 18 August 2026. There are two zips: `linux-x86_64.zip` (`btqd`, `btq-cli`, `btq-qt`) and `windows-x86_64.zip` (the `.exe` equivalents). Shut the node or wallet down, wait for a clean exit, then swap the binaries.

A PSBT can now carry Dilithium P2MR leaf scripts, control blocks, and partial signatures, so a quantum-safe 2-of-3 spend does not need a shared `.btqms` file. That is pull request #163.

This tag does not change consensus rules. Dilithium P2MR-only remains policy-ahead only on the live testnet. `nDilithiumP2MRHeight` is unscheduled. Mainnet is not launched. Bitcoin Quantum is still a testnet project.

## If you are still on v0.4.2

`v0.4.3-testnet` was tagged the same day. Binaries were not published. If you are upgrading from v0.4.2-testnet or earlier, these zips also contain that work. Read [the 0.4.3 notes](https://github.com/btq-ag/btq-core/blob/v0.4.4-testnet/doc/release-notes/release-notes-btq-0.4.3.md) before you upgrade.

The part that can fork you: 0.4.3 raises the LWMA averaging window from 45 blocks to 144 (#124, #143). That is a consensus change. Upgrade nodes together.

On the live testnet, legacy Dilithium outputs are still consensus-valid. P2MR-only activation is height-settable now (#128). The default remains unscheduled.

0.4.3 also backported a list of CVEs: CVE-2024-52911 (use-after-free in the script interpreter), CVE-2025-46597 (`-maxmempool` cap on 32-bit systems), CVE-2024-52919 (addrman entry id widened past 32 bits), CVE-2025-54604 and CVE-2025-54605 (rate-limit unconditional logging), and CVE-2025-46598 (detect witness stripping without re-running scripts). Peers are no longer punished for invalid transactions. Scripts are checked once (#149).

I am not going to recap every wallet fix from that tag. The operator-facing ones: Dilithium message signing is domain-separated from transaction signing (#126); `verifymessagewithdilithium` exists, and `verifydilithiumsignature` had its argument order fixed (#84); the node stopped issuing dead Dilithium addresses (#125). Placeholder fixed seeds are gone, so a bootstrap failure is explicit (#134). `-blocksonly=1` starts under BTQ's mempool floor (#157).

## Dilithium in the PSBT

Until this tag, a 2-of-3 Dilithium spend needed a shared `.btqms` file. In v0.4.4 the PSBT holds the P2MR leaf, the control block, and the partial signatures. Same file handoff Bitcoin treasuries already do, now with quantum-resistant signatures. That is the Bitcoin Quantum version of the handoff Bitcoin treasuries already do.

Decode is fail-closed. When the file is read, the loader rejects a forged Dilithium signature, an uncommitted leaf, a Merkle-root mismatch, or a sighash that is not `SIGHASH_ALL`. A leaf with no control block is rejected. Merge unions control blocks, so an empty entry cannot throw away a real one (#169).

Two new RPCs: `createdilithiummultisig` and `getdilithiumpubkey`. There is a wrapper at `contrib/btq/dilithium-psbt.sh`.

## What else is in the zip

Documentation: a live-chain proof one-pager for Dilithium PSBT (#160), PSBT Appendix A size units corrected to KB (#159), and the stale Bitcoin-inherited release notes with unowned download links removed (#158). The unused DilithiumWalletManager is gone (#164).

That is the 0.4.4 delta. The PSBT work is the reason to take the zip; the rest is cleanup.

## What this is not

This is a testnet tag for Bitcoin Quantum, not a mainnet coin, and it does not turn on P2MR-only. Hardware wallet transport is not in these notes.

If you want the binaries, they are on the [v0.4.4-testnet release](https://github.com/btq-ag/btq-core/releases/tag/v0.4.4-testnet). Bugs go to [the issue tracker](https://github.com/btq-ag/btq-core/issues). If you are jumping from v0.4.2, treat the LWMA window change as the thing that can split the network, and upgrade together.

## Sources

- [BTQ Core v0.4.4-testnet](https://github.com/btq-ag/btq-core/releases/tag/v0.4.4-testnet) (2026-08-18)
- [release-notes-btq-0.4.4.md](https://github.com/btq-ag/btq-core/blob/v0.4.4-testnet/doc/release-notes/release-notes-btq-0.4.4.md)
- [release-notes-btq-0.4.3.md](https://github.com/btq-ag/btq-core/blob/v0.4.4-testnet/doc/release-notes/release-notes-btq-0.4.3.md) (tagged the same day; binaries were not published)
