# Evidence Plan

## Claim to Evidence Map

| Claim | Required evidence | Location | Status |
|---|---|---|---|
| Operational Preprod contract | Address plus successful contract use | `evidence/deployment-preprod-operational.json` | VERIFIED |
| Real private claim | Identifier, hash, block, address, program, nullifier | `evidence/claim-preprod-food-support.json` | VERIFIED |
| Private inputs are omitted | Bounded evidence schema and tests | Claim JSON + privacy tests | VERIFIED |
| Same-program duplicate rejection | Failed call/state evidence | Not captured publicly | P1 |
| Cross-program unlinkability | Two claims with different scoped nullifiers | Only compiled test exists | P1 |
| Build quality | Tests, typecheck, lint, production build | CI/local output and deployment | VERIFIED |

## Verify It Yourself

### Claim transaction

```bash
node --use-system-ca --input-type=module -e "import { lookupLiveClaim } from './src/live-claim-status.js'; const claim=JSON.parse(await (await import('node:fs/promises')).readFile('evidence/claim-preprod-food-support.json','utf8')); console.log(await lookupLiveClaim({contractAddress:claim.contractAddress,programId:claim.programId,nullifier:claim.nullifier,pendingTransactionId:claim.transactionIdentifier}));"
```

Expected: `transaction-confirmed` with hash `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a` and block `2391682`.

### Test suite

```bash
npm test
npm run test:contract
npm run typecheck
npm run lint
npm run build
```

Expected: all commands succeed.

## Evidence Integrity

- Network is explicitly `preprod`.
- No recovery file, passphrase, wallet seed, issuer secret, or private eligibility values are committed.
- The transaction was independently checked through the public indexer on 2026-09-04.
