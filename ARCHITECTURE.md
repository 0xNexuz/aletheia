# Architecture

Aletheia separates privacy authorization from aid operations.

```mermaid
sequenceDiagram
  participant C as Claimant browser
  participant I as Signed demo issuer
  participant P as Compact proof server
  participant M as Midnight Preprod
  participant O as Operational backend
  C->>I: Subject commitment + demo profile
  I-->>C: Private credential + Schnorr signature
  C->>O: Program nullifier + commitment; reserve inventory
  O-->>C: 15-minute reservation
  C->>P: Private witnesses + claim circuit
  P-->>C: Zero-knowledge proof
  C->>M: Wallet-approved Compact transaction
  M-->>C: Transaction ID + block reference
  C->>O: Transaction evidence
  O-->>C: Signed allocation receipt
```

Midnight owns policy proof, issuer authorization, revocation, and one-use nullifiers per claimant secret/program. D1 owns capacities, reservations, reconciliation metadata, aggregate statistics, optional enquiries, and receipts. The Compact contract does not enforce inventory caps. Before finalizing inventory, the backend checks the public Preprod indexer for the submitted identifier, `SUCCESS`, a `claim` entry point, and the configured contract address. It does not yet bind that action's resulting program/nullifier to the reservation, so the recorded standalone claim remains chain-only evidence rather than proof of end-to-end allocation. Program IDs are SHA-256 encoded to Compact `Bytes<32>`.

The program designer is a separate local-only browser workspace. It validates and downloads a draft policy but does not call an API or configure the contract. The optional contact form writes conventional contact data to the separate `inquiries` table only after consent; there is no join or identifier link to claim records.

The wallet-selected proof provider is a separate trust boundary: a remote prover may receive private witnesses. The open demo issuer accepts new commitments and does not establish one unique real-world person per claimant secret. These are test credentials, not verified beneficiary eligibility.
