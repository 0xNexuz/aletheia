# 60-second judge demo

Use operational Preprod contract `7e4e3c18a2a139711f17085aef0aa66c953fa901900ab66895c9a26cca257fa5`. A confirmed backup claim is recorded in [evidence/claim-preprod-food-support.json](evidence/claim-preprod-food-support.json): transaction `75d2978454c959f71f71b200177a865aec9a31ee316580ac5bb0df1abddad88a`, block `2391682`.

- **0–10s:** “Aletheia prevents duplicate humanitarian allocations without a public beneficiary identity database.”
- **10–22s:** Select Emergency Food Support. Point out that age, income, household, jurisdiction, credential ID, and wallet secret remain private.
- **22–38s:** Choose Midnight Compact and select a compatible wallet. Show signed credential, proof generation, wallet approval, Preprod submission, nullifier verification, and inventory finalization.
- **38–48s:** Expand Technical evidence: program, proof mode, nullifier, contract, transaction, block, and zero private fields sent.
- **48–55s:** Retry the program. Show “Program nullifier already used” and duplicate rejection.
- **55–60s:** Select Medical Assistance and explain its intentionally unlinkable nullifier. CTA: try the claim lab and send a private program-design inquiry.

If the contract is not configured, use the explicitly labeled simulation and say so. Never show a simulated hash as a Midnight transaction.
