# Alethia

Alethia is a privacy-first aid eligibility prototype. Claimants answer locally, submit only a randomized outcome commitment and a program-scoped duplicate guard, and receive a signed, verifiable receipt.

**Live demo:** https://alethia-pi.vercel.app

The public demo includes a 60-second interactive product story, a working test claim flow, signed receipt verification, duplicate prevention, live aggregate Proof Notes, and a private program inquiry form.

## Working features

- Private eligibility answers remain in the browser.
- A program-scoped nullifier prevents duplicate claims without uploading a wallet address or reusable identifier.
- Accepted receipts are signed with ECDSA P-256 and verified against the ledger.
- Proof Notes reports accepted claims, blocked duplicates, and total test attempts.
- Program inquiries are stored privately for the owner; email notification is not configured.
- A compatible Midnight wallet may provide local wallet material without publishing its address.

## Implementation boundary

This is a signed privacy prototype. It does not yet submit a Compact transaction or generate an on-chain Midnight zero-knowledge proof. The next technical milestone is a Compact circuit that verifies eligibility while keeping evidence shielded.

## Data boundary

Uploaded: program id, program-scoped nullifier, randomized outcome commitment, and demo wallet mode.

Not uploaded: eligibility answers, identity documents, wallet address, test-wallet secret, or a reusable wallet identifier.

The unique `(program_id, nullifier)` index enforces one claim per program.

## Architecture

- `index.html`, `styles.css`, `script.js`: responsive client and local claim preparation.
- `dist/server/index.js`: Cloudflare-compatible Sites worker backed by D1.
- `api/`: narrow Vercel functions forwarding claims, stats, and inquiries with encrypted server-only credentials.
- `drizzle/`: database migrations.

## Test

```bash
npm test
```

## Demo

1. Open the app and select **Check eligibility**.
2. Use the test wallet or connect a compatible Midnight wallet.
3. Complete the eligibility questions and submit.
4. Verify the signed receipt.
5. Retry with the same wallet to test duplicate prevention and live Proof Notes.

## Roadmap

- Compact eligibility/nullifier contract and preprod transaction evidence
- Issuer-backed credentials and selective disclosure
- Offline synchronization
- Owner inquiry inbox/export and optional notifications
- Contract and browser end-to-end tests

## License

MIT - see [LICENSE](LICENSE).