# Threat Model

## Objective

Protect claimant privacy, prevent same-program duplicate claims, prevent unsupported eligibility claims, preserve wallet authority, and keep evidence honest.

## Assets

| Asset | Impact if compromised |
|---|---|
| Claimant secret/private answers | Identity or circumstance disclosure |
| Issuer secret | Fraudulent test credentials |
| Admin recovery | Unauthorized contract administration |
| Wallet authority | Unauthorized testnet transactions |
| Nullifier/claim state | Duplicate-prevention failure |
| Evidence records | False submission claims |

## Trust Assumptions

- The demo issuer correctly signs test profiles; it is not suitable for real aid decisions.
- The selected wallet accurately represents Preprod and requires user approval.
- Midnight consensus and the public indexer reflect finalized network state.
- The hosted backend protects its bearer and receipt-signing secrets.

## Abuse Cases

| Attack | Defense | Evidence | Status |
|---|---|---|---|
| Forge eligibility | Schnorr issuer-signature check in Compact | Compiled invalid-signature tests | VERIFIED |
| Reuse credential with another secret | Credential bound to subject commitment | Copied-credential test | VERIFIED |
| Claim same program twice | Program-scoped nullifier membership check | Compiled duplicate test | VERIFIED locally; Preprod rejection capture pending |
| Link a claimant across programs | Nullifier includes program ID | Cross-program compiled test | VERIFIED locally; second Preprod capture pending |
| Retry uncertain transaction | Durable pending ID and read-only reconciliation | Deployment/claim status tests | VERIFIED |
| Leak recovery or wallet seed | Encrypted recovery; no seed entry/upload path | Recovery/redaction tests | VERIFIED |
| Relay to arbitrary issuer | Fixed approved origin and bounded payload | Relay tests | VERIFIED |

## Guarantees

- Valid Compact claims require a configured issuer signature and policy satisfaction.
- A used program nullifier cannot produce another successful claim for that program.
- Public evidence excludes the raw private fields listed in `PRIVACY.md`.

## Non-Guarantees

- Production-grade identity issuance, appeals, recovery, sanctions, or beneficiary safety.
- Protection from compromised browsers, wallet extensions, issuers, or endpoints.
- Mainnet economics, throughput, or field connectivity.

## Residual Risk

Metadata and timing may correlate activity. The demo issuer is centralized. The backend's operational finalization is not yet independently gated on indexer confirmation. Security review is internal only.
