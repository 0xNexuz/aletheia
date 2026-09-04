# 60-second judge demo

Use operational Preprod contract `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`. A confirmed backup claim is recorded in [evidence/claim-preprod-food-support.json](evidence/claim-preprod-food-support.json): transaction `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a`, block `2391682`.

- **0–10s:** “Aletheia prevents duplicate humanitarian allocations without a public beneficiary identity database.”
- **10–22s:** Select Emergency Food Support. Point out that age, income, household, jurisdiction, credential ID, and wallet secret remain private.
- **22–38s:** Show the existing confirmed Food Support claim or genuine recorded 1AM approval. Label a prior confirmation as recorded evidence. The standalone claim does not finalize backend inventory.
- **38–48s:** Inspect public evidence: program, nullifier, contract, transaction and block. Raw eligibility values are not published on chain; a remote prover may receive private witnesses.
- **48–55s:** Show the compiled duplicate-rejection test, explicitly labeled as a test. A public rejection capture remains pending.
- **55–60s:** Explain that the same secret derives a different nullifier for another program, as covered by compiled tests. This does not establish complete anonymity or one unique person per secret.

If the contract is not configured, use the explicitly labeled simulation and say so. Never show a simulated hash as a Midnight transaction.
