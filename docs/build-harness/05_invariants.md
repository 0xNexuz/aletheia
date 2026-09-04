# Invariants

## Core Invariants

### INV-001 — Issuer-backed eligibility

Only a credential signed by the configured issuer and satisfying the selected program policy can create an eligible claim.

- Enforcement: Compact signature, revocation, and policy checks.
- Tests: invalid signature, copied credential, ineligible credential, revocation.
- Status: **VERIFIED**.

### INV-002 — Same-program uniqueness

A program-scoped nullifier can be accepted at most once.

- Enforcement: `usedNullifiers` membership check and insertion in the claim circuit.
- Tests: compiled duplicate rejection and backend duplicate guard.
- Status: **VERIFIED** locally; additional public rejection evidence is **P1**.

### INV-003 — Cross-program unlinkability

The same claimant secret derives different public nullifiers for different program IDs.

- Enforcement: program ID is part of nullifier derivation.
- Tests: compiled cross-program claim test.
- Status: **VERIFIED** locally; second public claim capture is **P1**.

### INV-004 — Private inputs stay private

Raw eligibility facts, credential material, claimant secret, and wallet secret are not recorded in public evidence.

- Enforcement: client-side private state, bounded evidence schema, recursive redaction.
- Tests: evidence redaction and payload-boundary tests.
- Status: **VERIFIED**.

### INV-005 — No blind resubmission

Wallet acceptance or transport failure cannot be treated as non-submission; a saved identifier must be checked before retry.

- Enforcement: durable pending marker and explicit-consent retry path.
- Tests: uncertain-submission, reconciliation, and retry tests.
- Status: **VERIFIED**.

### INV-006 — One browser runtime identity

All browser paths use one compatible `@midnight-ntwrk/onchain-runtime-v3` instance.

- Enforcement: direct dependency plus npm override at `3.0.0`.
- Tests: lockfile runtime-version regression test; production bundle emits one runtime WASM.
- Status: **VERIFIED**.

## Coverage

| ID | Enforcement | Test | Evidence | Status |
|---|---|---|---|---|
| INV-001 | Compact circuit | Compiled contract suite | Contract source/artifacts | VERIFIED |
| INV-002 | Nullifier set | Duplicate tests | Local tests | VERIFIED |
| INV-003 | Scoped derivation | Cross-program test | Local tests | VERIFIED |
| INV-004 | Private state/redaction | Privacy tests | Claim evidence schema | VERIFIED |
| INV-005 | Recovery/status logic | Recovery/status tests | Source + tests | VERIFIED |
| INV-006 | Dependency pin | Hardening test | Production bundle | VERIFIED |
