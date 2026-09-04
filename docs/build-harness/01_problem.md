# Problem

## One-Line Problem

Humanitarian aid programs cannot reliably prevent duplicate claims and over-allocation without collecting or exposing reusable claimant identities and sensitive eligibility data.

## Users

- Primary: people applying for aid.
- Secondary: aid-program operators.
- Auditors: reviewers who need proof of policy compliance and allocation integrity.

## Root Cause

Conventional duplicate prevention links actions to a stable account, document, or database identity. That creates a correlation surface and asks vulnerable users to trade privacy for access.

## Required Outcome

A claimant must be able to prove issuer-backed eligibility and one-use participation within a program while keeping raw eligibility facts private and avoiding a globally reusable public identifier.

## Non-Goals

- Production beneficiary adjudication or legal eligibility decisions.
- Mainnet deployment or real aid disbursement.
- Replacing accountable issuers, appeals, identity recovery, or field operations.

## Validation Status

**PARTIAL.** The technical mechanism is verified on Preprod. No field pilot or user-research artifact is currently committed, so real-world operational demand remains unverified.

## Submission Statement

Aletheia lets aid programs verify that a claimant is eligible and has not already used a program without publishing identity or raw eligibility data. Midnight Compact verifies a signed private credential and exposes only a program ID, successful outcome, and program-scoped nullifier.
