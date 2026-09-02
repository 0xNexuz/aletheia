export const PROGRAM_POLICIES = [
  ['food-support-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 2500000n, active: true }],
  ['medical-assistance-2026', { minAge: 18n, jurisdiction: 566n, minHouseholdSize: 1n, maxAnnualIncome: 4000000n, active: true }],
  ['temporary-shelter-2026', { minAge: 21n, jurisdiction: 566n, minHouseholdSize: 2n, maxAnnualIncome: 3000000n, active: true }]
];

const same = (actual, expected) => Object.entries(expected).every(([name, value]) => actual[name] === value);

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
