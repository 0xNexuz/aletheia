# Aletheia Build Harness

This directory is the evidence-backed source of truth for Aletheia's Midnight Buildathon readiness.

## Current Readiness

- Overall status: **PARTIAL** — core Midnight mechanism is **REAL — TESTNET**; submission packaging still has open items.
- Conservative score: **86/100**.
- P0 blockers: demo-video URL and final AKINDO form submission are not verified in this repository.
- P1 issues: capture an on-chain duplicate rejection and a cross-program unlinkability example; make the public health endpoint advertise the contract instead of relying on the bundled fallback.
- Last verified: 2026-09-04.
- Verified by: repository tests, Vercel production build, application state verification, and the public Midnight Preprod indexer.

## Primary Evidence

- Operational deployment: `evidence/deployment-preprod-operational.json`
- Confirmed claim: `evidence/claim-preprod-food-support.json`
- Historical deployment: `evidence/deployment-preprod.json`
- Contract: `contract/src/aletheia.compact`
- Browser integration: `src/midnight-client.js`

## Completion Rule

A claim is complete only when implementation, invariant, test, real/simulated label, and inspectable evidence agree.
