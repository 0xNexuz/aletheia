# Aletheia Build Harness

This directory is the evidence-backed source of truth for Aletheia's Midnight Buildathon readiness.

## Current Readiness

- Overall status: **PARTIAL** — core Midnight mechanism is **REAL — TESTNET**; submission packaging still has open items.
- Readiness: core Preprod evidence verified; submission packaging remains PARTIAL. No official judging score is claimed.
- P0 packaging: owner-provided demo-video URL and final AKINDO form submission/registration remain unverified. Video production is outside the requested correction pass. PR #17 merged on 2026-09-04 at `0b76d57`.
- P1 evidence gaps: public duplicate/cross-program captures and a verified chain-to-backend allocation flow. Health now reports validated hosted contract configuration, not live chain availability.
- Updated: 2026-09-05. Network evidence was independently checked on 2026-09-04.
- Verified by: repository tests, Vercel production build, application state verification, and the public Midnight Preprod indexer.

## Primary Evidence

- Operational deployment: `evidence/deployment-preprod-operational.json`
- Confirmed claim: `evidence/claim-preprod-food-support.json`
- Historical deployment: `evidence/deployment-preprod.json`
- Contract: `contract/src/aletheia.compact`
- Browser integration: `src/midnight-client.js`

## Completion Rule

A claim is complete only when implementation, invariant, test, real/simulated label, and inspectable evidence agree.
