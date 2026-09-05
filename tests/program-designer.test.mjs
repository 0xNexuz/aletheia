import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProgramDraft } from '../src/program-draft.js';

test('program designer creates a bounded local-only draft', () => {
  const draft = createProgramDraft({ name: 'Food access', capacity: '1000', minAge: '18', jurisdiction: '566', minHouseholdSize: '2', maxAnnualIncome: '2500000' });
  assert.equal(draft.status, 'draft-not-deployed');
  assert.deepEqual(draft.policy, { minAge: 18, jurisdiction: 566, minHouseholdSize: 2, maxAnnualIncome: 2500000 });
});

test('program designer rejects unsafe numeric policy values', () => {
  assert.throws(() => createProgramDraft({ name: 'Bad', capacity: '0', minAge: '18', jurisdiction: '566', minHouseholdSize: '2', maxAnnualIncome: '1' }), /capacity/);
  assert.throws(() => createProgramDraft({ name: 'Bad', capacity: '1', minAge: '18.5', jurisdiction: '566', minHouseholdSize: '2', maxAnnualIncome: '1' }), /minAge/);
});

test('program drafting has no network submission and enquiry is explicitly separate', async () => {
  const designer = await readFile(new URL('../src/program-designer.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(designer, /fetch\s*\(/);
  assert.match(designer, /sent: false, deployed: false/);
  assert.match(page, /not anonymous or a zero-knowledge proof/i);
  assert.match(page, /contactConsent/);
});
