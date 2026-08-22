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
  C->>M: Lace-approved Compact transaction
  M-->>C: Transaction ID + block reference
  C->>O: Transaction evidence
  O-->>C: Signed allocation receipt
```

Midnight owns policy proof, issuer authorization, revocation, and one-use program nullifiers. D1 owns capacities, reservations, redemption/reconciliation metadata, aggregate statistics, inquiries, and receipts. Program IDs are SHA-256 encoded to Compact `Bytes<32>`.
