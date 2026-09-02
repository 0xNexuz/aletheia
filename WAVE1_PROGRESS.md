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
- Expanded automated coverage to 22 passing tests, including privacy, revocation, wallet compatibility, reconciliation, and redaction cases.
- Pinned the patched `ws` dependency and reached a zero-vulnerability production audit.
- Added Linux-safe lockfile and CI handling for reproducible Compact builds.
- Deployed Aletheia to Midnight Preprod and independently verified the indexed `ContractDeploy` transaction, contract address, and block.
- Replaced the legacy memory-only browser admin key with encrypted device-local recovery and a downloadable backup. Setup can resume after closing the tab and checks on-chain state before requesting remaining approvals.
- Added read-only pending-transaction reconciliation, durable wallet-submission status, redacted failure details, and an explicit-consent retry path that retains the same encrypted key and archives previous IDs. The application suite now has 43 passing tests; this is local verification, not proof of a replacement deployment.
- Simplified new deployments to initialize the demo issuer and all three programs in the constructor, eliminating four separate setup transactions. Added a standalone live-claim control with persistent public evidence and read-only checks against the official indexer and contract state. Pending claims cannot silently be resubmitted.

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

The current patch passes the production build, 49 application/SDK tests, 7 compiled Compact tests, typecheck, and lint. The compiled tests cover immediate eligible claims, duplicate rejection, cross-program claims, invalid signatures, copied credentials, and ineligible credentials. An offline SDK test assembles exactly one deployment using real verifier assets. The browser-facing provider loads all 15 verifier/prover/ZKIR files from localhost. These checks do not claim a replacement deployment or a successful claim transaction. The production dependency audit passed for the earlier hardened baseline; no new dependencies were added for this work. Local claim signing still requires an available credential issuer; public-key-only deployment configuration cannot sign credentials.

## Current state

The Compact contract and Midnight client integration are implemented. The legacy deployment at `024108897068de067fd95a7422ce5d3ac341edf542eeba6bd76682effada3256` is verified by transaction `8edfd5b6494eeed8b558ea5d51da10073841fde9e436d3f26a3f053adebd5186`, indexed as `ContractDeploy` in block `2368644`. Its memory-only admin key was lost when the browser tab closed, so this address is historical evidence only. A replacement deployment with saved encrypted recovery, issuer/program configuration, and a real claim remain pending.

## Next Wave

- Deploy a replacement with encrypted admin recovery and constructor-initialized issuer/programs.
- Demonstrate successful claim, same-program duplicate rejection, and cross-program unlinkability on chain.
- Add accountable issuer governance and an appeals workflow.
- Run a small field pilot with an aid-program operator.
