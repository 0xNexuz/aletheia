# Sponsor Map

## Program

- Program: Midnight Buildathon, Wave 1.
- Primary ecosystem: Midnight.
- Official form/track name: **UNVERIFIED** in the repository.

## Integration

| Ecosystem | Primitive | Load-bearing | Status | Evidence |
|---|---|---:|---|---|
| Midnight | Compact private smart contract | Yes | REAL — TESTNET | Operational contract + confirmed claim |
| Midnight | Midnight.js 4.1.1 | Yes | COMPLETE | `src/midnight-client.js` |
| Midnight | Connector API v4 wallet | Yes | REAL — TESTNET | 1AM-approved confirmed claim |
| Midnight | Preprod indexer | Yes | REAL — TESTNET | Independent transaction verification |
| Midnight | Wallet-provided proving/verifier assets | Yes | REAL — TESTNET | Confirmed claim and generated assets |

## Load-Bearing Test

Removing Midnight removes private policy proof, scoped-nullifier enforcement, wallet-approved network execution, and public claim evidence. The simulation remains, but it is explicitly labeled and does not satisfy the core integration claim.

## User-Visible Effect

The user selects Midnight Compact, connects a compatible wallet, approves a proof-backed transaction, and receives contract, transaction, block, and nullifier evidence without publishing raw eligibility inputs.

## Verify

Inspect `evidence/claim-preprod-food-support.json`, then query its transaction identifier through the public Preprod indexer using `src/live-claim-status.js`.

## Missing Sponsor Requirements

- Exact official track/category and any sponsor-specific form fields are **UNVERIFIED**.
- The repository topic `midnightntwrk` should be confirmed on GitHub.
