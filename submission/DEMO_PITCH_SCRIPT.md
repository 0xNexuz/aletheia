# Aletheia demo pitch

Target runtime: approximately 65 seconds.

## Narration

Most aid programs stop duplicate claims by collecting more identity. That can reduce fraud—but it also creates a database that can follow vulnerable people long after the program ends.

Aletheia proves the facts without exposing the person.

A claimant connects any compatible Midnight wallet, creates a private commitment, and receives a signed eligibility credential. The Compact contract verifies that credential, checks the policy and available inventory, then derives a nullifier scoped only to that aid program.

The program learns that the claimant is eligible, has not claimed here before, and that inventory remains. It does not learn the claimant's secret, raw answers, or a reusable cross-program identifier.

Retry the same program and the duplicate is rejected. Use another program and the same claimant produces a different nullifier.

Wave 1 added compiled Compact artifacts, multi-wallet support, encrypted private state, chain reconciliation, and twenty-two passing tests.

Aletheia: public accountability, private claimant, verifiable limits.

## Storyboard

1. Identity database grows around a claimant — “Duplicate prevention should not become surveillance.”
2. Aletheia reveal — “Proof without exposure.”
3. Wallet connection and private commitment.
4. Signed credential enters the Compact proof.
5. Minimal public state: scoped nullifier and inventory.
6. Same-program retry turns into duplicate rejection.
7. Different program produces a visibly different nullifier.
8. Wave 1 evidence and closing call to view the live product.

## Visual style

16:9, white and near-black canvas, Aletheia purple and blue accents, flat geometric motion, warm confident narration, no music or sound effects.
