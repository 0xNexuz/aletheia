# Privacy model

Private proof inputs include age, jurisdiction, household size, annual income, credential ID, issuer signature and claimant secret. They are not published as raw values on Midnight or stored in the operational receipt. Proving is delegated through the selected wallet/provider; a remote prover may receive private proof inputs. This is a trust boundary, not a guarantee that inputs never leave the device.

Public on Midnight: selected program ID, successful eligibility outcome, scoped nullifier, policy thresholds, issuer metadata and disclosed program-scoped revocation handles. The claimant's raw eligibility values and credential are not public. Inventory and signed allocation receipts belong to the operational backend, not Compact state.

Operational backend: program ID, scoped nullifier, randomized commitment, proof mode and, only after a real call, contract address, transaction ID, and block reference. Receipts exclude eligibility values and wallet addresses.

The demo issuer sees a subject commitment and selected demo profile. It accepts new commitments without proving a unique real-world identity. Nullifier uniqueness is per claimant secret/program; wallet, issuer and network metadata can still permit correlation. Production must replace this test issuer with accountable issuance and explicit consent, retention, revocation, and recovery rules.
