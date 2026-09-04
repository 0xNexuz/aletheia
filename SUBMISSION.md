# Aletheia — Midnight Buildathon Wave 1

**Tagline:** Proof without exposure.

## Links

- Public repository: https://github.com/0xNexuz/aletheia
- Live product: https://alethia-pi.vercel.app
- Slide deck: [submission/Aletheia_Midnight_Buildathon_Wave1.pptx](submission/Aletheia_Midnight_Buildathon_Wave1.pptx)
- Demo video URL: pending — owner-provided; video production is outside this update
- Wave 1 changes: [WAVE1_PROGRESS.md](WAVE1_PROGRESS.md)

## What it does

Aletheia lets an aid program verify that a claimant is eligible, has not already claimed from that program, and that inventory remains available—without publishing identity, eligibility answers, or a globally reusable identifier.

## Why Midnight

The core mechanism is a Compact contract that verifies private witnesses and derives a program-scoped nullifier. Compact public state records policy/issuer metadata, nullifier usage, and successful program outcomes. Inventory caps, reservations and receipts are handled by the separate backend, not by the deployed Compact contract. Different programs derive different nullifiers from the same claimant secret; this alone does not prevent correlation through wallet, issuer or network metadata.

## Wave 1 proof of progress

Wave 1 materially extended the Midnight functionality: compiled managed artifacts, Connector API v4 multi-wallet support, encrypted private state, strict Preprod validation, wallet-provided proving, program-scoped revocation, inventory reservation and reconciliation, redacted operations, an operational Preprod deployment, a confirmed private claim, and 57 application plus 7 compiled-contract tests.

## Judge walkthrough

1. Open the live product and choose an available compatible Midnight wallet.
2. Review the privacy boundary and connect on Preprod.
3. Create a private claimant commitment and obtain a signed demo credential.
4. Inspect the confirmed Food Support claim and its contract, transaction, block and scoped nullifier in the public evidence files below.
5. Review compiled tests for same-secret, same-program duplicate rejection and different-program nullifier separation. Additional public captures remain pending.
6. The main application integrates separate backend inventory reservations. The confirmed standalone claim does not demonstrate backend allocation finalization or delivery of aid.

## Evaluation evidence

- Contract: [contract/src/aletheia.compact](contract/src/aletheia.compact)
- Generated Compact artifacts: [contract/src/managed](contract/src/managed)
- Midnight client: [src/midnight-client.js](src/midnight-client.js)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Demo guide: [DEMO.md](DEMO.md)
- Privacy and security: [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md)
- Tests: [tests](tests)

## Honest deployment status

The operational Aletheia contract is deployed on Midnight Preprod at `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`. Its constructor initialized the signed demo issuer and all three programs without follow-up administration transactions. A real Food Support claim was confirmed in block `2391682`: transaction hash `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a`, identifier `00717e8efcb983c2cf45dcd0d763690ce7a70aa9b133aa370d8d06cfbd0a01fddd`, and program-scoped nullifier `dcf6e13059fdecbfd66672da68a5d9eb1f7bd7cb38d3cfa890ed60bb40906a6b`. The application verified both the public transaction and matching contract state; an independent query through the public Preprod indexer returned the same transaction hash and block. See [deployment evidence](evidence/deployment-preprod-operational.json) and [claim evidence](evidence/claim-preprod-food-support.json).

The older contract at `024108897068de067fd95a7422ce5d3ac341edf542eeba6bd76682effada3256` remains historical deployment evidence only because its memory-only admin key was lost. It is not used for current claims.

## License

Midnight-related code and the repository are licensed under Apache License 2.0.
