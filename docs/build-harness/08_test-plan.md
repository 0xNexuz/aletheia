# Test Plan

## Objective

Prove that credentials cannot be forged, private inputs are not exposed, same-program claims cannot be duplicated, transaction retries are safe, and browser/SDK versions assemble and execute the intended contract.

## Coverage

| Area | Evidence | Status |
|---|---|---|
| Unit/integration application tests | `tests/*.test.mjs` — 65 passing | VERIFIED |
| Compiled Compact tests | `contract` — 7 passing | VERIFIED |
| Typecheck | Root and contract TypeScript | VERIFIED |
| Lint | App, API, library, tests, scripts | VERIFIED |
| Production build | Vercel deployment `dpl_Ce1LAxrft4tfJf7ZuvGpTrGGyxav` | VERIFIED |
| Real Preprod claim | Block `2391682` | VERIFIED |

## Adversarial Cases

- Invalid issuer signature.
- Credential copied to another claimant secret.
- Ineligible credential.
- Revoked credential.
- Same-program duplicate.
- Cross-program nullifier separation.
- Concurrent deployment lock.
- Uncertain wallet submission and stale indexer.
- Malformed recovery and ciphertext modification.
- Unauthorized credential relay destination.
- Sensitive evidence redaction.
- Duplicate browser runtime regression.
- Hosted health configuration, invalid/missing addresses, upstream failures, secret exclusion and method restrictions.
- Backend rejection of successful but unrelated contract actions.
- Local-only program drafting, input bounds, and explicit separation from consented enquiries.

## Commands

```bash
npm test
npm run test:contract
npm run typecheck
npm run lint
npm run build
```

## Network Status

- Local: **VERIFIED**.
- Midnight Preprod: **VERIFIED** for one successful claim.
- Mainnet: **PLANNED**, not required or attempted.

## Current Gaps

- P0: none for the core contract mechanism.
- P1: capture a public same-program rejection and cross-program claim; add browser-device matrix testing.
- P2: performance/proof-generation measurements and longer-running concurrency tests.
