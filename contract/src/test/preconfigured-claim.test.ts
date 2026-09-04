import { describe, expect, it } from 'vitest';
import { Bytes32Descriptor, createCircuitContext, createConstructorContext, ecMulGenerator, transientHash } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits, type Witnesses } from '../managed/aletheia/contract/index.js';
import { witnesses, type AletheiaPrivateState } from '../witnesses.js';

// Deterministic test-only issuer; never used by a deployed app.
const issuerSecret = 123n;
const publicKey = ecMulGenerator(issuerSecret);
const order = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const programIds: [Uint8Array, Uint8Array, Uint8Array] = [3, 4, 5].map(n => new Uint8Array(32).fill(n)) as [Uint8Array, Uint8Array, Uint8Array];
const coinKey = '01'.repeat(32);
const address = '02'.repeat(32);

function signedState(age = 34n): AletheiaPrivateState {
  const userSecret = new Uint8Array(32).fill(9);
  const credentialId = new Uint8Array(32).fill(8);
  const announcement = ecMulGenerator(456n);
  const message: [bigint, bigint, bigint, bigint, bigint, bigint] = [age, 566n, 4n, 1800000n, transientHash(Bytes32Descriptor, credentialId), transientHash(Bytes32Descriptor, userSecret)];
  const challenge = pureCircuits.schnorrChallenge(announcement.x, announcement.y, publicKey.x, publicKey.y, message) % (2n ** 248n);
  return { age, jurisdiction: 566n, householdSize: 4n, annualIncome: 1800000n, credentialId, providerId: 1n, userSecret,
    signature: { announcement, response: (456n + challenge * issuerSecret) % order } };
}

function fixture(state = signedState()) {
  const contract = new Contract(witnesses as Witnesses<AletheiaPrivateState>);
  const initial = contract.initialState(createConstructorContext({ ...state, userSecret: new Uint8Array(32).fill(7) }, coinKey), 1n, publicKey, programIds);
  return { contract, initial, ctx: createCircuitContext(address, coinKey, initial.currentContractState, state) };
}

describe('one deployment followed by claims, without setup calls', () => {
  it('initializes the issuer and all three policies atomically', () => {
    const { initial } = fixture();
    const state = ledger(initial.currentContractState.data);
    expect(state.providers.lookup(1n)).toEqual(publicKey);
    expect(programIds.map(id => state.programs.lookup(id))).toEqual([
      { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 2500000n, active: true },
      { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 1n, maxAnnualIncome: 4000000n, active: true },
      { minAge: 21n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 3000000n, active: true }
    ]);
  });
  it('accepts a signed eligible claim immediately and blocks its duplicate', () => {
    const { contract, ctx } = fixture();
    const result = contract.impureCircuits.claim(ctx, programIds[0]);
    const state = ledger(result.context.currentQueryContext.state);
    const nullifier = pureCircuits.deriveProgramNullifier(signedState().userSecret, programIds[0]);
    expect(state.claims.lookup(nullifier)).toEqual({ programId: programIds[0], eligible: true });
    expect(() => contract.impureCircuits.claim(result.context, programIds[0])).toThrow(/already used/);
    expect(() => contract.impureCircuits.claim(result.context, programIds[1])).not.toThrow();
  });
  it('rejects an ineligible but correctly signed credential', () => {
    const { contract, ctx } = fixture(signedState(16n));
    expect(() => contract.impureCircuits.claim(ctx, programIds[0])).toThrow(/Age requirement/);
  });
  it('rejects a tampered signature and a credential copied to another secret', () => {
    const state = signedState(); state.signature.response += 1n;
    const badSignature = fixture(state);
    expect(() => badSignature.contract.impureCircuits.claim(badSignature.ctx, programIds[0])).toThrow();
    const copied = fixture({ ...signedState(), userSecret: new Uint8Array(32).fill(10) });
    expect(() => copied.contract.impureCircuits.claim(copied.ctx, programIds[0])).toThrow();
  });
  it('rejects duplicate program IDs and an identity issuer key', () => {
    const { contract } = fixture();
    const init = () => createConstructorContext(signedState(), coinKey);
    expect(() => contract.initialState(init(), 1n, publicKey, [programIds[0], programIds[0], programIds[2]])).toThrow(/distinct/);
    expect(() => contract.initialState(init(), 1n, { x: 0n, y: 1n }, programIds)).toThrow(/identity/);
  });
});
