# Demo Plan

## Thesis

In 60 seconds, prove that an aid applicant can submit an issuer-backed, one-use eligibility claim on Midnight without publishing their eligibility inputs or reusable identity.

## Sequence

1. **Problem — 0–10s:** explain that identity databases create privacy and correlation risks.
2. **Private setup — 10–20s:** select Food Support and show which fields stay private.
3. **Real action — 20–40s:** select Midnight Compact, connect 1AM, generate proof, and approve the Preprod call.
4. **Evidence — 40–50s:** show contract, transaction, block, program, nullifier, and zero private fields published.
5. **Failure property — 50–56s:** retry Food Support and show duplicate rejection; if live infrastructure is slow, show a clearly identified capture of a real rejection once available.
6. **Close — 56–60s:** explain that another program derives a different nullifier.

## Environment

- Network: Midnight Preprod.
- Wallet: 1AM / Connector API v4.
- Contract: `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`.
- Test issuer: signed demo credentials only.
- Backup evidence: `evidence/claim-preprod-food-support.json`.

## Recording Checklist

- Confirm Preprod and funded DUST.
- Hide unrelated tabs, notifications, recovery material, and wallet identifiers.
- Never show a seed, passphrase, issuer secret, or raw eligibility payload.
- Use the production app for the judge flow.
- Keep the transaction evidence visible long enough to read.

## Status

Script: **COMPLETE**. Final recorded/uploaded video URL: **P0 — UNVERIFIED**.
