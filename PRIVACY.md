# Privacy model

Locally retained: age, jurisdiction, household size, annual income, credential ID, issuer signature, claimant secret, and wallet interaction.

Public on Midnight: selected program ID, successful eligibility outcome, and program-scoped nullifier. Raw policy values and the credential are not public.

Operational backend: program ID, scoped nullifier, randomized commitment, proof mode and, only after a real call, contract address, transaction ID, and block reference. Receipts exclude eligibility values and wallet addresses.

The demo issuer sees a subject commitment and selected demo profile. Production must replace it with an accountable issuer and explicit consent, retention, revocation, and recovery rules.
