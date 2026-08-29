import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ProgramPolicy = { minAge: bigint;
                              jurisdiction: bigint;
                              minHouseholdSize: bigint;
                              maxAnnualIncome: bigint;
                              active: boolean
                            };

export type PublicClaim = { programId: Uint8Array; eligible: boolean };

export type UserSecret = Uint8Array;

export type AdminCommitment = Uint8Array;

export type Schnorr_SchnorrSignature = { announcement: __compactRuntime.JubjubPoint;
                                         response: bigint
                                       };

export type Witnesses<PS> = {
  getSchnorrReduction(context: __compactRuntime.WitnessContext<Ledger, PS>,
                      challengeHash_0: bigint): [PS, [bigint, bigint]];
  getAttestedCredential(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [{ age: bigint,
                                                                                       jurisdiction: bigint,
                                                                                       householdSize: bigint,
                                                                                       annualIncome: bigint,
                                                                                       credentialId: Uint8Array
                                                                                     },
                                                                                     Schnorr_SchnorrSignature,
                                                                                     bigint]];
  getUserSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, UserSecret];
}

export type ImpureCircuits<PS> = {
  claim(context: __compactRuntime.CircuitContext<PS>, programId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  configureProgram(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   policy_0: ProgramPolicy): __compactRuntime.CircuitResults<PS, []>;
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   providerId_0: bigint,
                   providerPk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rotateAdmin(context: __compactRuntime.CircuitContext<PS>,
              nextAdmin_0: AdminCommitment): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  claim(context: __compactRuntime.CircuitContext<PS>, programId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  configureProgram(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   policy_0: ProgramPolicy): __compactRuntime.CircuitResults<PS, []>;
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   providerId_0: bigint,
                   providerPk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rotateAdmin(context: __compactRuntime.CircuitContext<PS>,
              nextAdmin_0: AdminCommitment): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveAdminCommitment(secret_0: UserSecret): AdminCommitment;
  deriveProgramNullifier(secret_0: UserSecret, programId_0: Uint8Array): Uint8Array;
  credentialRevocationHandle(credentialId_0: Uint8Array, programId_0: Uint8Array): Uint8Array;
  schnorrChallenge(ann_x_0: bigint,
                   ann_y_0: bigint,
                   pk_x_0: bigint,
                   pk_y_0: bigint,
                   msg_0: bigint[]): bigint;
}

export type Circuits<PS> = {
  deriveAdminCommitment(context: __compactRuntime.CircuitContext<PS>,
                        secret_0: UserSecret): __compactRuntime.CircuitResults<PS, AdminCommitment>;
  deriveProgramNullifier(context: __compactRuntime.CircuitContext<PS>,
                         secret_0: UserSecret,
                         programId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialRevocationHandle(context: __compactRuntime.CircuitContext<PS>,
                             credentialId_0: Uint8Array,
                             programId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claim(context: __compactRuntime.CircuitContext<PS>, programId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  configureProgram(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   policy_0: ProgramPolicy): __compactRuntime.CircuitResults<PS, []>;
  registerProvider(context: __compactRuntime.CircuitContext<PS>,
                   providerId_0: bigint,
                   providerPk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   programId_0: Uint8Array,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  rotateAdmin(context: __compactRuntime.CircuitContext<PS>,
              nextAdmin_0: AdminCommitment): __compactRuntime.CircuitResults<PS, []>;
  schnorrChallenge(context: __compactRuntime.CircuitContext<PS>,
                   ann_x_0: bigint,
                   ann_y_0: bigint,
                   pk_x_0: bigint,
                   pk_y_0: bigint,
                   msg_0: bigint[]): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  readonly contractAdmin: AdminCommitment;
  providers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): __compactRuntime.JubjubPoint;
    [Symbol.iterator](): Iterator<[bigint, __compactRuntime.JubjubPoint]>
  };
  programs: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): ProgramPolicy;
    [Symbol.iterator](): Iterator<[Uint8Array, ProgramPolicy]>
  };
  revokedCredentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  claims: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): PublicClaim;
    [Symbol.iterator](): Iterator<[Uint8Array, PublicClaim]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
