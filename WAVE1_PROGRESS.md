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

The production build, 22-test suite, typecheck, lint, and production dependency audit pass in the hardened workspace.

## Current state

The Compact contract and Midnight client integration are implemented and locally verifiable. A real Preprod contract address and transaction hash are intentionally not claimed until a funded owner wallet, proving path, and successful on-chain confirmation are available.

## Next Wave

- Deploy the contract to Preprod and publish verifiable transaction evidence.
- Demonstrate successful claim, same-program duplicate rejection, and cross-program unlinkability on chain.
- Add accountable issuer governance and an appeals workflow.
- Run a small field pilot with an aid-program operator.
