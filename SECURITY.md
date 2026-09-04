# Security

The successful standalone Preprod claim is independent of backend inventory finalization. Duplicate protection is scoped to a claimant secret; the open test issuer does not enforce one credential per person. Remote proof providers may receive private witnesses and must be trusted accordingly.

This is a hackathon prototype, not a production beneficiary registry.

Controls include Compact issuer-signature verification, approved-provider mapping, revocation handles, program-scoped nullifier reuse rejection, atomic inventory triggers, expiring reservations, a server-only Vercel-to-Sites token, and signed receipts.

Known gaps: managed issuer-key storage/rotation; independent indexer confirmation before final allocation; appeals/recovery; operator access controls; inquiry notifications; offline conflict handling; and adversarial concurrency testing. Never commit issuer, Sites, Vercel, wallet, or signing secrets. Report vulnerabilities privately; never place beneficiary data in an issue.
