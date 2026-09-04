# Ecosystem Gap

## Ecosystem

- Platform: Midnight.
- Network: Preprod.
- Contract language: Compact.
- Client stack: Midnight.js 4.1.1 and Connector API v4.

## Gap

Midnight provides privacy-preserving contract primitives, but aid-program teams still need an end-to-end pattern for issuer-signed eligibility, program-scoped duplicate prevention, wallet approval, public evidence, and honest simulation fallbacks.

## Why Aletheia Belongs Here

The core product property depends on private witnesses and a publicly verifiable, program-scoped nullifier. Removing Midnight would remove the implemented zero-knowledge contract path and leave only the clearly labeled simulation/backend path.

## Ecosystem Value

- A concrete privacy-first aid use case.
- A tested Connector API v4 browser integration.
- Recovery-safe deployment and transaction reconciliation patterns.
- A reusable design for same-program uniqueness without cross-program identity correlation.

## Portability

Operational inventory and receipts could run elsewhere. The demonstrated private-policy proof and scoped-nullifier contract are specifically implemented with Midnight Compact.

## Status

**VERIFIED:** Compact source, generated artifacts, browser client, operational Preprod contract, and confirmed claim exist.
