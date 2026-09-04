export const PROGRAM_POLICIES = [
  ['food-support-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 2500000n, active: true }],
  ['medical-assistance-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 1n, maxAnnualIncome: 4000000n, active: true }],
  ['temporary-shelter-2026', { minAge: 21n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 3000000n, active: true }]
];

const same = (actual, expected) => Object.entries(expected).every(([name, value]) => actual[name] === value);

/** @returns {Promise<[bigint, {x: bigint, y: bigint}, [Uint8Array, Uint8Array, Uint8Array]]>} */
export async function deploymentArguments(issuer, programBytes) {
  if (!/^\d+$/.test(String(issuer?.providerId)) || !/^\d+$/.test(String(issuer?.publicKey?.x)) || !/^\d+$/.test(String(issuer?.publicKey?.y))) throw new Error('A valid signed demo issuer must be configured before deployment.');
  const providerId = BigInt(issuer.providerId);
  const publicKey = { x: BigInt(issuer.publicKey.x), y: BigInt(issuer.publicKey.y) };
  if (providerId > 65535n || (publicKey.x === 0n && publicKey.y === 1n)) throw new Error('The demo issuer ID or public key is invalid.');
  return [providerId, publicKey, [await programBytes(PROGRAM_POLICIES[0][0]), await programBytes(PROGRAM_POLICIES[1][0]), await programBytes(PROGRAM_POLICIES[2][0])]];
}

// Read-only: new deployments must be ready without administrative follow-up calls.
export async function verifyDeploymentSetup({ readLedger, issuer, programBytes }) {
  const [providerId, publicKey, ids] = await deploymentArguments(issuer, programBytes);
  const state = await readLedger();
  if (!state.providers.member(providerId) || !same(state.providers.lookup(providerId), publicKey)) throw new Error('This contract does not have the expected issuer. No setup transaction was sent.');
  for (let index = 0; index < PROGRAM_POLICIES.length; index++) {
    if (!state.programs.member(ids[index]) || !same(state.programs.lookup(ids[index]), PROGRAM_POLICIES[index][1])) throw new Error('This contract is not preconfigured for the demo programs. No setup transaction was sent.');
  }
}

// On-chain state, never the local progress log, decides which calls are needed.
export async function configureDeployment({ readLedger, callTx, issuer, programBytes, onState, onTransaction }) {
  const providerId = BigInt(issuer.providerId);
  const publicKey = { x: BigInt(issuer.publicKey.x), y: BigInt(issuer.publicKey.y) };
  let state = await readLedger();
  if (state.providers.member(providerId)) {
    if (!same(state.providers.lookup(providerId), publicKey)) throw new Error('The on-chain issuer differs from the configured demo issuer. No issuer was overwritten.');
    onState('Demo issuer already registered; skipping its approval.');
  } else {
    onState('Approve demo issuer registration in 1AM (setup 1 of 4).');
    await onTransaction('register-provider', await callTx.registerProvider(providerId, publicKey));
  }
  for (const [index, [programId, policy]] of PROGRAM_POLICIES.entries()) {
    const id = await programBytes(programId);
    state = await readLedger();
    if (state.programs.member(id)) {
      if (!same(state.programs.lookup(id), policy)) throw new Error(`The on-chain policy for ${programId} differs. No policy was overwritten.`);
      onState(`${programId} already configured; skipping its approval.`);
    } else {
      onState(`Approve ${programId} in 1AM (setup ${index + 2} of 4).`);
      await onTransaction(`configure-${programId}`, await callTx.configureProgram(id, policy));
    }
  }
  state = await readLedger();
  if (!state.providers.member(providerId) || !same(state.providers.lookup(providerId), publicKey)) throw new Error('Issuer registration is not yet verified on-chain. Resume setup later.');
  for (const [programId, policy] of PROGRAM_POLICIES) {
    const id = await programBytes(programId);
    if (!state.programs.member(id) || !same(state.programs.lookup(id), policy)) throw new Error('Program configuration is not yet verified on-chain. Resume setup later.');
  }
}
