---
title: "Dilithium Didn't Fit in a PSBT. Two Testnet Spends Prove It Does Now"
headline_chars: 68
tags:
  - bitcoin
  - cryptography
  - blockchain
  - quantum-computing
  - bitcoin-core
  - wallets
  - post-quantum
  - cybersecurity
meta_description: "Dilithium2 is 2,421 bytes. BIP 174's partial-sig slot is not. BTQ added typed PSBT fields; a 2-of-3 spent twice on public testnet."
tldr: "Bitcoin custody already depends on passing a PSBT between signers. BTQ needed that file to carry Dilithium2 (2,421 bytes with the sighash byte). Consensus already accepted Dilithium P2MR spends; the wallet dropped the material at the PSBT boundary, so an interim .btqms JSON format existed. Core now has typed fields for the leaf, Merkle path, and partial sigs. Two 2-of-3 spends landed on public testnet. Independent miners built on top. Testnet proof, not a mainnet feature."
featured_image: "assets/hero-dilithium-psbt.jpg (from BTQ LOGO/f0af1545-817d-4318-bdd6-156583f5fb69.jpg). Upload that file as the Hacker Noon featured image."
in_article_infographic: "assets/btq-dilithium-why.jpg (from BTQ LOGO/1c71c83e-8975-4d9d-8766-5067139afb23.jpg)."
original: true
editor_note: "Drafted from BTQ Core design docs, a wallet functional test, and public explorer records. Prose went through BTQ Article Maker, a local editorial skill based on Wikipedia's Signs of AI writing page. Please treat this as AI-assisted cleanup of sourced notes, not a generated explainer."
---

![Dilithium didn't fit in a PSBT. Two testnet spends prove it does now.](assets/hero-dilithium-psbt.jpg)

*Typed Dilithium fields on BIP 174. P2MR keeps keys behind a Merkle root until spend.*

Bitcoin treasuries already pass a file around so two of three people can approve a payment without putting keys on the same laptop. That file is a PSBT, a Partially Signed Bitcoin Transaction, defined in [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki). It is the custody primitive. Hardware wallets and air-gapped signers already speak it. If quantum-safe spends could not ride in that same file, Dilithium on BTQ would be a chain feature with no way for two of three people to approve a payment the way Bitcoin already does.

BTQ needed that handoff with CRYSTALS-Dilithium2 (NIST FIPS 204). One signature is 2,420 bytes, plus a sighash byte, so 2,421 on the wire. A secp256k1 ECDSA signature in DER is about 72. BIP 174's partial-sig slot was built for the small one. You cannot cram Dilithium into it without breaking parsers and mixing algorithms.

Consensus on BTQ already knew how to check those Dilithium spends. They live on P2MR, Pay-to-Merkle-Root, a witness-v2 output in the BIP 360 style. The pubkey stays behind a 32-byte Merkle root until you spend. The broken part was the file. `btq-core`'s PSBT stack still round-tripped ECDSA `partial_sigs` and the usual Taproot fields. Dilithium material sat in wallet memory and got dropped at the serialization boundary. That is why `btq-multisig` still ships a `.btqms` JSON container. It is an analogue of a PSBT, used because the real PSBT could not carry a Dilithium partial signature.

So they extended the file. Not the chain. BTQ-PSBT keeps BIP 174's envelope (`psbt\xff`) and gives Dilithium its own typed fields, fail-closed parsing, and a finalizer that knows the accumulator leaf. Quantum-safe signatures now travel in the same interchange format treasuries already pass around. That ran on public testnet as a 2-of-3. Three wallets, two spends, 816 sat fees, and miners who were not in the room built on top of both. It shipped in `v0.4.4-testnet` on 18 August 2026. Mainnet is not launched. Calling it a product launch would be dishonest.

## How a PSBT actually moves

If you have ever done Bitcoin multisig, you already know the play. A creator builds an unsigned transaction. An updater stuffs in UTXOs, scripts, and pubkeys. Signers inspect the fee and the outputs, then attach a partial signature for the keys they hold. A combiner merges copies if people signed in parallel. A finalizer turns those partials into a witness. An extractor emits a raw transaction you can broadcast.

None of that is a consensus change. The chain never sees a PSBT. It sees a finished transaction, or it sees nothing.

That is the custody path people mean when they say "we pass a PSBT around." A hardware wallet in a drawer, or a signer on another continent. BTQ could not borrow it until Dilithium fit in the envelope.

## Why the old slot was the wrong hole

BIP 174's `PSBT_IN_PARTIAL_SIG` key is a secp256k1 pubkey, 33 or 65 bytes. The value is a DER signature, roughly 72 bytes. Dilithium2 is a 1,312-byte public key and a 2,421-byte value (raw sig plus sighash type). Reusing the ECDSA slot would blow past parser key-length checks and mix two algorithms in one map.

![Why Dilithium, specifically: 2,420-byte signatures, 1,312-byte pubkeys, FIPS 204](assets/btq-dilithium-why.jpg)

*Those sizes are why the old PSBT partial-sig slot could not hold the spend.*

BTQ-PSBT follows the BIP 371 precedent (Taproot got its own typed fields) instead of stuffing Dilithium into a proprietary `"btq.org"` blob. Early prototypes did use proprietary fields. Those are out of v1 production. The typed input types are `0x19` through `0x1D`: leaf script plus control block, Merkle root, the Dilithium script-path signature, BIP32 derivation, and a pubkey hint. Magic bytes stay `psbt\xff`. An old BIP 174 parser should preserve unknown fields rather than explode.

The production m-of-n leaf is not `OP_CHECKMULTISIGDILITHIUM`. `btq-multisig` uses a threshold accumulator: start at zero, run `OP_CHECKSIGDILITHIUM` for each key, add the 0/1 results, then check the sum against `m`. Unsigned keys contribute an empty witness slot. Signatures that did happen are 2,421 bytes. On finalize, slots are pushed in reverse key order so key 0 ends up on top of the stack.

I am not going to paste the C++ maps. The design doc is in `btq-core/doc-btq/DILITHIUM_PSBT_DESIGN.md` if you want the sighash transcript. Short version: Dilithium P2MR script-path signatures use the BIP 341 TapSighash with `SigVersion::P2MR_TAPSCRIPT`. There is no separate Dilithium hash function. Parse is fail-closed. A malformed key, a bad Merkle path, an unauthorized pubkey, or a signature that does not verify rejects the whole PSBT. You do not get a half-loaded file with a shrug.

QR is a bad idea for these. The spec forbids fragmented QR for multisig PSBTs. Pass a file.

## A wallet bug that made the gap feel smaller than it was

`walletprocesspsbt` used to skip P2MR inputs and return `complete=false` with an empty errors list. `signrawtransactionwithwallet` would sign the same outpoint. The functional test in `test/functional/wallet_dilithium_psbt.py` calls this issue #79. P2MR scriptPubKeys were tracked in wallet metadata rather than by a `ScriptPubKeyMan`, and `CWallet::FillPSBT` only asked the ScriptPubKeyMans.

That is a boring bug. It is also the kind of boring that blocks a custody demo. The test now funds a P2MR address, builds a PSBT, processes it, finalizes, and mines. It also mixes a P2MR input with an ordinary one in the same PSBT, which the design doc lists as a requirement.

I like that test more than a slide. It says the wallet has to produce a transaction the mempool will take, not a PSBT that merely claims it is complete.

## Two spends you can click

Campaign notes describe the public proof as Alice, Bob, and Carol: three wallets, one 2-of-3 Dilithium address, PSBT files passed between machines, two spends, independent miners on top. I cannot map those names onto specific keys from the explorer. I can look at the transactions.

Both are 8,930 bytes, 665 virtual bytes, one input, two outputs, fee `0.00000816` BTQ (816 sats):

- [6fc71b6259d6f79a041e592e848e2e125940e55ad9e642e1fcdba80a2e1e0bc9](https://explorer.bitcoinquantum.com/tx/6fc71b6259d6f79a041e592e848e2e125940e55ad9e642e1fcdba80a2e1e0bc9)
- [8d31a6cf96ed98967f38debccfe04bc11c5b75e1f0e4ec66b975c37175632ff5](https://explorer.bitcoinquantum.com/tx/8d31a6cf96ed98967f38debccfe04bc11c5b75e1f0e4ec66b975c37175632ff5)

The witness is the tell. Each spend has two fat signature elements and one empty slot, then the leaf script and a control block. On the first tx the empty slot is first. On the second it is in the middle. That is what you want from a 2-of-3 accumulator: a different pair can satisfy `m` without the third key showing up.

Outputs are small. `0.0005` BTQ and `0.00049184` BTQ. Nobody is moving a treasury here. The point was to put a real witness on a public chain and let someone else's miner extend the tip.

If you flip a byte in a Dilithium signature, verification fails. The design doc's negative vectors cover the unglamorous cases: duplicate keys, a Merkle path that does not commit, sighash `NONE`, a pubkey that is not in the leaf. Fail-closed means the loader refuses the file. It does not mean the chain forks.

PSBT never enters consensus, so there is no activation height and no flag day. If the interchange format is wrong, you have a bad file. If it is right, you have a transaction that existing Dilithium P2MR rules already know how to check.

## What this is not

`.btqms` is still in the repos. The CLI README still says PSBT cannot serialize Dilithium partial signatures, because that was true when the tool was written and the JSON path still works. The Core design treats BTQ-PSBT as the thing that subsumes `.btqms`, with a converter (`btqconvertpsbt`) on the migration list. Shipping that as the default is a later phase.

Hardware wallet transport is backlog. In-place fee bump that keeps existing Dilithium partials is not in v1; a bump changes the sighash, so everyone re-signs. Falcon and SPHINCS+ fields are future work. Dilithium5 sizes are rejected in v1.

The design is v1 in `btq-core` as of 6 August 2026, and it shipped in the `v0.4.4-testnet` tag on 18 August 2026. It is not a tagged mainnet feature. Testnet is the place this ran. Some consensus and mempool-policy work is still marked partial in Core docs. Mainnet is ahead of us.

If you want to poke the stack anyway: [docs.bitcoinquantum.com](https://docs.bitcoinquantum.com), [explorer.bitcoinquantum.com](https://explorer.bitcoinquantum.com), and the two txids above. I would start with the empty witness slot. That is the part that looks like Bitcoin multisig, except the signatures are huge.

## Sources

- [BIP 174](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki) (PSBT)
- [BTQ Core v0.4.4-testnet](https://github.com/btq-ag/btq-core/releases/tag/v0.4.4-testnet) (2026-08-18)
- BTQ Core, `doc-btq/DILITHIUM_PSBT_DESIGN.md` (v1 implemented, 2026-08-06)
- BTQ Core, `design/DILITHIUM_PSBT_PROOF.md` (live 2-of-3 spends)
- BTQ Core, `test/functional/wallet_dilithium_psbt.py` (issue #79) and `wallet_dilithium_psbt_multisig.py`
- `btq-multisig` README (`.btqms` as the interim container)
- Public testnet txs linked above
