# Real vs Simulated

## Capability Truth Table

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Compact issuer/policy/revocation checks | REAL — TESTNET | Confirmed claim + contract source | Demo credentials only |
| Program-scoped nullifier | REAL — TESTNET | Claim nullifier in contract state | One Food Support example captured |
| Wallet-approved proof transaction | REAL — TESTNET | Tx `75d297...d88a`, block `2391682` | Approved through 1AM |
| Operational contract | REAL — TESTNET | `7e4e3c...57fa5` | Constructor-preconfigured |
| Browser wallet discovery | REAL — TESTNET | Connector API v4 integration | Tested with 1AM |
| Simulation claim flow | SIMULATED | Labeled UI path | Never represented as chain proof |
| Inventory reservations/receipts | REAL — LOCAL/HOSTED BACKEND | Backend tests and APIs | Not finalized by the standalone chain demo |
| Accountable production issuer | PLANNED | None | Demo issuer is test-only |
| Mainnet deployment | PLANNED | None | No mainnet claim |
| Offline field mode | PLANNED | None | Roadmap only |

## Current Real Capabilities

- Issuer-backed private claim on Midnight Preprod.
- Program-scoped public nullifier and claim state.
- Public transaction and block evidence.
- Compatible-wallet connection and user approval.

## Current Simulated Capabilities

- The simulation path demonstrates UX, duplicate behavior, and inventory behavior without claiming blockchain execution.

## Accuracy Check

- README: updated to `REAL — TESTNET` for the claim and operational contract.
- Submission: updated with exact public evidence.
- UI: distinguishes Midnight Compact from simulation.
- Health bridge now publishes the validated hosted `contractAddress` with Preprod configuration metadata. Backend failure remains a failure; this is not independent chain or prover verification.
- Compact does not enforce inventory limits. Backend allocation completion is not established by the captured standalone transaction.
- Duplicate rejection is for a fixed secret/program. The demo issuer does not enforce uniqueness of real-world people.
