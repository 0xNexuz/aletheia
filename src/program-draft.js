export function createProgramDraft(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80) throw new Error('Use a program name of 1–80 characters, not personal details.');
  function integer(key, minimum, maximum) {
    const raw = input[key];
    if (!['string', 'number'].includes(typeof raw) || String(raw).trim() === '') throw new Error(`Enter ${key}.`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${key} must be a whole number between ${minimum} and ${maximum}.`);
    return value;
  }
  return {
    schema: 'aletheia-program-draft-v1', status: 'draft-not-deployed', name,
    capacity: integer('capacity', 1, 1000000),
    policy: {
      minAge: integer('minAge', 0, 120), jurisdiction: integer('jurisdiction', 1, 999),
      minHouseholdSize: integer('minHouseholdSize', 1, 100),
      maxAnnualIncome: integer('maxAnnualIncome', 0, 4294967295),
    },
    duplicateRule: 'one-claim-per-secret-per-program',
    reviewRequired: ['Accountable issuer and income units', 'Authorized on-chain program configuration', 'Separate backend inventory configuration'],
  };
}
