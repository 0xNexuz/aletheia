# Wave 1 progress

This document separates Aletheia's public baseline from the Midnight work completed for Wave 1.

## Baseline entering the Wave

The public repository already demonstrated the product idea, a Compact contract source file, a browser experience, and an explicit simulation mode. A real Preprod deployment and transaction were not yet verified.

## Material work completed during Wave 1

- Compiled the Compact contract with toolchain `0.31.1` and committed the generated managed artifacts.
- Strengthened the privacy mechanism with program-scoped nullifiers so one claimant cannot claim twice in the same program while remaining unlinkable across programs.
- Added capped inventory accounting and deterministic duplicate, capacity, expiry, signature, and disclosure checks.
- Upgraded wallet discovery to Midnight Connector API v4 so the app can connect to any compatible enabled Midnight wallet instead of relying on a wallet brand name.
- Added strict Preprod network and Bech32m address validation, wallet-provided proving support, and explicit transaction evidence.
- Added encrypted private-state storage and server-side redaction boundaries.
- Added inventory reservation, replay protection, chain reconciliation, and an auditable operational ledger.
- Expanded automated coverage to 57 passing application/SDK tests plus 7 compiled Compact tests, including privacy, revocation, wallet compatibility, reconciliation, redaction, deployment recovery, and runtime compatibility cases.
- Pinned the patched `ws` dependency and reached a zero-vulnerability production audit.
- Added Linux-safe lockfile and CI handling for reproducible Compact builds.
- Deployed Aletheia to Midnight Preprod and independently verified the indexed `ContractDeploy` transaction, contract address, and block.
- Replaced the legacy memory-only browser admin key with encrypted device-local recovery and a downloadable backup. Setup can resume after closing the tab and checks on-chain state before requesting remaining approvals.
- Added read-only pending-transaction reconciliation, durable wallet-submission status, redacted failure details, and an explicit-consent retry path that retains the same encrypted key and archives previous IDs.
- Simplified new deployments to initialize the demo issuer and all three programs in the constructor, eliminating four separate setup transactions. Added a standalone live-claim control with persistent public evidence and read-only checks against the official indexer and contract state. Pending claims cannot silently be resubmitted.
- Deployed the constructor-initialized contract at `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5` and confirmed a real Food Support claim in Preprod block `2391682` with transaction hash `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a`.
- Removed a browser-only `StateValue` class mismatch by pinning and hoisting one SDK-compatible Midnight on-chain runtime; added a regression test and verified that the production bundle contains one runtime WASM.

## Validation evidence

```bash
npm ci
npm run compact
npm run build
npm test
npm run typecheck
npm run lint
npm audit --omit=dev
```

The current patch passes the production build, 57 application/SDK tests, 7 compiled Compact tests, typecheck, and lint. The compiled tests cover immediate eligible claims, duplicate rejection, cross-program claims, invalid signatures, copied credentials, and ineligible credentials. An offline SDK test assembles exactly one deployment using real verifier assets. The browser-facing provider loads all 15 verifier/prover/ZKIR files, and production emits one on-chain runtime WASM. Real network evidence is recorded separately from test evidence. Local claim signing still requires an available credential issuer; public-key-only deployment configuration cannot sign credentials.

## Current state

The Compact contract and Midnight client integration are implemented and operational on Preprod. The current contract is `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`; its first verified Food Support claim is transaction `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a` in block `2391682`. The legacy deployment at `024108897068de067fd95a7422ce5d3ac341edf542eeba6bd76682effada3256` remains historical evidence only because its memory-only admin key was lost.

## Submission correction pass — 2026-09-05

- Corrected the deck's app URL, test totals and operational Preprod evidence.
- Separated Compact eligibility/nullifier enforcement from backend inventory accounting in submission and privacy documentation.
- Added validated hosted contract discovery to the health bridge with four behavioral regression tests, preserving backend failure responses.
- Recorded PR #17 as merged and the public repository topic as verified.
- Demo-video production is excluded from this update; owner upload and final AKINDO submission remain unverified.

## Next Wave

- Demonstrate same-program duplicate rejection and cross-program unlinkability with additional captured Preprod evidence.
- Add accountable issuer governance and an appeals workflow.
- Run a small field pilot with an aid-program operator.
