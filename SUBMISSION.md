# Aletheia — Midnight Buildathon Wave 1

**Tagline:** Proof without exposure.

## Links

- Public repository: https://github.com/0xNexuz/aletheia
- Live product: https://alethia-pi.vercel.app
- Slide deck: [submission/Aletheia_Midnight_Buildathon_Wave1.pptx](submission/Aletheia_Midnight_Buildathon_Wave1.pptx)
- Demo video URL: pending Clueso authentication and export
- Wave 1 changes: [WAVE1_PROGRESS.md](WAVE1_PROGRESS.md)

## What it does

Aletheia lets an aid program verify that a claimant is eligible, has not already claimed from that program, and that inventory remains available—without publishing identity, eligibility answers, or a globally reusable identifier.

## Why Midnight

The core mechanism is a Compact contract that verifies private witnesses and derives a program-scoped nullifier. Public state records only the minimum facts needed for accountability: program inventory, nullifier usage, policy metadata, and transaction evidence. The same person produces a different nullifier in another program, preventing cross-program tracking.

## Wave 1 proof of progress

Wave 1 materially extended the Midnight functionality: compiled managed artifacts, Connector API v4 multi-wallet support, encrypted private state, strict Preprod validation, wallet-provided proving, program-scoped revocation, inventory reservation and reconciliation, redacted operations, and 22 automated tests.

## Judge walkthrough

1. Open the live product and choose an available compatible Midnight wallet.
2. Review the privacy boundary and connect on Preprod.
3. Create a private claimant commitment and obtain a signed demo credential.
4. Submit a claim to derive a program-scoped nullifier and decrement capped inventory.
5. Retry the same program to observe duplicate rejection.
6. Change programs to observe a different nullifier for the same private claimant.

## Evaluation evidence

- Contract: [contract/src/aletheia.compact](contract/src/aletheia.compact)
- Generated Compact artifacts: [contract/src/managed](contract/src/managed)
- Midnight client: [src/midnight-client.js](src/midnight-client.js)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Demo guide: [DEMO.md](DEMO.md)
- Privacy and security: [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md)
- Tests: [tests](tests)

## Honest deployment status

The legacy Aletheia contract was deployed on Midnight Preprod at `024108897068de067fd95a7422ce5d3ac341edf542eeba6bd76682effada3256`. Transaction `8edfd5b6494eeed8b558ea5d51da10073841fde9e436d3f26a3f053adebd5186` is indexed in block `2368644` with a `ContractDeploy` action. The public evidence is recorded in [evidence/deployment-preprod.json](evidence/deployment-preprod.json). Its in-memory admin key was lost when the legacy deployment tab closed; it is not an operational claim contract. A replacement using the encrypted recovery/resume flow is pending.

The replacement constructor now initializes the demo issuer and all three programs in one deployment, with no separate setup calls. Linux compilation and compiled claim/rejection tests passed. The replacement deployment and first real claim transaction remain pending; test success is not live-chain evidence. The dedicated deployment page can submit and independently check a live claim once a preconfigured deployment is confirmed.

## License

Midnight-related code and the repository are licensed under Apache License 2.0.
