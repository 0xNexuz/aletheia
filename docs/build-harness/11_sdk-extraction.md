# SDK Extraction

## Candidate Primitives

| Primitive | Reuse value | Cost | Priority |
|---|---|---|---|
| Connector API v4 wallet discovery/validation | Avoid wallet-brand coupling | Medium | P2 |
| Durable transaction reconciliation | Prevent blind duplicate deployments/calls | Medium | P2 |
| Encrypted browser admin recovery | Safe resumable contract administration | Medium | P2 |
| Program-scoped nullifier pattern | Privacy-preserving uniqueness | Medium | P2 |
| Public evidence verifier | Re-check identifier, action, contract, and state | Low | P2 |

## Recommendation

Do not extract an npm package before submission. The interfaces are still tied to Aletheia's generated contract, recovery schema, and demo issuer. Stabilize them after a second real program claim and public duplicate-rejection capture.

## Current Reusable Code

- `src/deployment-status.js`
- `src/live-claim-status.js`
- `src/deployment-recovery.js`
- `src/midnight-client.js`
- `lib/demo-issuer-relay.js`

## Post-Program Direction

Extract a typed proof-and-reconciliation adapter once contract-specific assumptions are separated and an example app can verify the API independently.
