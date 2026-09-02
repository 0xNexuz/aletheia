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

The recovery patch passes the production build, 35 application tests, 2 compiled Compact admin-circuit tests, typecheck, and lint. HTTP checks confirm the local deployment page, all nine claim/setup proof files, and the production-matching public issuer configuration are available. These checks do not claim a replacement deployment or a successful claim transaction. The production dependency audit passed for the earlier hardened baseline; no new dependencies were added for recovery.

## Current state

The Compact contract and Midnight client integration are implemented. The legacy deployment at `024108897068de067fd95a7422ce5d3ac341edf542eeba6bd76682effada3256` is verified by transaction `8edfd5b6494eeed8b558ea5d51da10073841fde9e436d3f26a3f053adebd5186`, indexed as `ContractDeploy` in block `2368644`. Its memory-only admin key was lost when the browser tab closed, so this address is historical evidence only. A replacement deployment with saved encrypted recovery, issuer/program configuration, and a real claim remain pending.

## Next Wave

- Deploy a replacement with encrypted admin recovery, then complete issuer and program configuration.
- Demonstrate successful claim, same-program duplicate rejection, and cross-program unlinkability on chain.
- Add accountable issuer governance and an appeals workflow.
- Run a small field pilot with an aid-program operator.
