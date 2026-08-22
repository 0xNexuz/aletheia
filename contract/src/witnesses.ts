import type { Ledger } from './managed/aletheia/contract/index.js';
import type { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

export type SchnorrSignature = {
  announcement: { x: bigint; y: bigint };
  response: bigint;
};

export type AletheiaPrivateState = {
  age: bigint;
  jurisdiction: bigint;
  householdSize: bigint;
  annualIncome: bigint;
  credentialId: Uint8Array;
  signature: SchnorrSignature;
  providerId: bigint;
  userSecret: Uint8Array;
};

const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;

export const witnesses = {
  getAttestedCredential: ({ privateState }: WitnessContext<Ledger, AletheiaPrivateState>) => [
    privateState,
    [
      {
        age: privateState.age,
        jurisdiction: privateState.jurisdiction,
        householdSize: privateState.householdSize,
        annualIncome: privateState.annualIncome,
        credentialId: privateState.credentialId,
      },
      privateState.signature,
      privateState.providerId,
    ],
  ],
  getSchnorrReduction: ({ privateState }: WitnessContext<Ledger, AletheiaPrivateState>, challengeHash: bigint) => [
    privateState,
    [challengeHash / TWO_248, challengeHash % TWO_248],
  ],
  getUserSecret: ({ privateState }: WitnessContext<Ledger, AletheiaPrivateState>) => {
    if (privateState.userSecret.length !== 32) throw new Error('Aletheia user secret must be 32 bytes');
    return [privateState, privateState.userSecret];
  },
};
