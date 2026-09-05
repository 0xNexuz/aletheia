# Submission Map

## Program

- Name: Midnight Buildathon.
- Wave: Wave 1.
- Platform: AKINDO.
- Official program: https://midnight.network/hackathon/buildathon
- Registration/submission page: https://app.akindo.io/wave-hacks/jaMZjqPOBsLXvjdG
- Official submission deadline/timezone: **UNVERIFIED**. The official Midnight program page and supplied screenshot state the Wave 1 build period ends 2026-09-16, while the team is targeting completion before 2026-09-07; confirm the binding AKINDO deadline.

## Requirements

| Requirement | Status | Evidence / action |
|---|---|---|
| Public repository | COMPLETE | Public repository and branch verified through GitHub |
| Apache-2.0 license | COMPLETE | `LICENSE`, package metadata |
| Midnight-related work developed/materially extended | COMPLETE | `WAVE1_PROGRESS.md` |
| Live app | COMPLETE | https://alethia-pi.vercel.app |
| Working concept/demo | COMPLETE | Real Preprod claim plus production app |
| Technical/architecture information | COMPLETE | `ARCHITECTURE.md`, build harness |
| Deployment evidence | COMPLETE | Operational contract evidence JSON |
| Claim evidence | COMPLETE | Confirmed claim evidence JSON |
| Slide deck | COMPLETE | `submission/Aletheia_Midnight_Buildathon_Wave1.pptx` |
| Demo video URL | P0 — UNVERIFIED | Record/upload and add URL |
| Repository push | COMPLETE | PR #17 release merged to main at `0b76d57`; main Compact CI passed |
| Merge to default branch | COMPLETE | PR #17 merged 2026-09-04 at `0b76d57` |
| AKINDO form submission | P0 — UNVERIFIED | Complete and capture confirmation |
| GitHub topic `midnightntwrk` | COMPLETE | Confirmed on the public repository |

## Links

- GitHub: https://github.com/0xNexuz/aletheia
- Live app: https://alethia-pi.vercel.app
- Contract: `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`
- Claim transaction: `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a`
- Demo: **PENDING**.

## Judge Path

1. Read the one-line privacy/uniqueness thesis.
2. Open the production app.
3. Select Midnight Compact and connect a compatible Preprod wallet.
4. Observe or replay the real claim flow.
5. Inspect the public evidence JSON and contract source.
6. Review the duplicate/cross-program tests and threat model.

## P0

- Owner to provide the demo-video URL; video creation/upload is excluded from this correction pass.
- Confirm the official deadline/timezone and submit through AKINDO.

## P1

- Capture one same-program duplicate rejection on Preprod.
- Capture one second-program claim demonstrating a different nullifier.
- Capture an end-to-end chain-to-backend allocation and bind the reservation to the exact on-chain program/nullifier state. The gate verifies transaction ID, success, `claim` entry point and contract; standalone evidence does not establish inventory finalization.
- Health discovery correction is implemented with regression tests; hosted rollout must be verified after deployment.

## Gate

- Core Midnight mechanism: **READY**.
- Overall submission: **NOT READY** until the P0 packaging items are verified.
- Core evidence is verified; no official score or complete rules compliance is claimed. Team eligibility, registration and the binding form/rules still require verification.
