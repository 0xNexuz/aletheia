import { describe, expect, it } from 'vitest';
import { createCircuitContext, createConstructorContext, ecMulGenerator } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits, type Witnesses } from '../managed/aletheia/contract/index.js';

type AdminState = { userSecret: Uint8Array };
const adminWitnesses: Witnesses<AdminState> = {
  getUserSecret: ({ privateState }) => [privateState, privateState.userSecret],
  getAttestedCredential: () => { throw new Error('Not used by admin circuits'); },
  getSchnorrReduction: () => { throw new Error('Not used by admin circuits'); }
};
const coinKey = '01'.repeat(32);
const address = '02'.repeat(32);
const constructorArgs = [1n, ecMulGenerator(123n), [new Uint8Array(32).fill(3), new Uint8Array(32).fill(4), new Uint8Array(32).fill(5)]] as const;

describe('compiled application-admin recovery', () => {
  it('reconstituted admin bytes authorize issuer registration and program configuration', () => {
    const contract = new Contract(adminWitnesses);
    const original = new Uint8Array(32).fill(7);
    const initial = contract.initialState(createConstructorContext({ userSecret: original }, coinKey), constructorArgs[0], constructorArgs[1], [...constructorArgs[2]]);
    expect(ledger(initial.currentContractState.data).contractAdmin).toEqual(pureCircuits.deriveAdminCommitment(original));
    // A new state object models reconstruction after the original tab is gone.
    const restored = { userSecret: Uint8Array.from(original) };
    const ctx = createCircuitContext(address, coinKey, initial.currentContractState, restored);
    const registered = contract.impureCircuits.registerProvider(ctx, 1n, { x: 0n, y: 1n });
    expect(ledger(registered.context.currentQueryContext.state).providers.member(1n)).toBe(true);
    const program = new Uint8Array(32).fill(3);
    const policy = { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 2500000n, active: true };
    const configured = contract.impureCircuits.configureProgram(registered.context, program, policy);
    expect(ledger(configured.context.currentQueryContext.state).programs.lookup(program)).toEqual(policy);
  });

  it('a fresh random replacement key cannot administer the old contract', () => {
    const contract = new Contract(adminWitnesses);
    const initial = contract.initialState(createConstructorContext({ userSecret: new Uint8Array(32).fill(7) }, coinKey), constructorArgs[0], constructorArgs[1], [...constructorArgs[2]]);
    const wrong = createCircuitContext(address, coinKey, initial.currentContractState, { userSecret: new Uint8Array(32).fill(8) });
    expect(() => contract.impureCircuits.registerProvider(wrong, 1n, { x: 0n, y: 1n })).toThrow(/Only admin/);
  });
});
