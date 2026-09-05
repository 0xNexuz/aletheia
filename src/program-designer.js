import { createProgramDraft } from './program-draft.js';

const form = document.querySelector('#program-design-form');
const result = document.querySelector('#program-design-result');
const status = document.querySelector('#program-design-status');
const output = document.querySelector('#program-design-json');
const download = document.querySelector('#download-program-draft');
let draft = null;
function showDraft(input) {
  draft = createProgramDraft(input);
  output.value = JSON.stringify(draft, null, 2); result.hidden = false;
  status.textContent = 'Draft prepared in this page only. Nothing was sent or deployed.';
  return draft;
}
form?.addEventListener('input', () => {
  draft = null; result.hidden = true; output.value = ''; status.textContent = 'Rules changed. Preview again to update the draft.';
});
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    showDraft(Object.fromEntries(new FormData(form)));
  } catch (error) { draft = null; result.hidden = true; status.textContent = error.message; }
});
download?.addEventListener('click', () => {
  if (!draft) return;
  const url = URL.createObjectURL(new window.Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'aletheia-program-draft.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Draft download requested. Store it safely; it does not activate a program.';
});

const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 80 }, capacity: { type: 'integer', minimum: 1, maximum: 1000000 },
      minAge: { type: 'integer', minimum: 0, maximum: 120 }, jurisdiction: { type: 'integer', minimum: 1, maximum: 999 },
      minHouseholdSize: { type: 'integer', minimum: 1, maximum: 100 }, maxAnnualIncome: { type: 'integer', minimum: 0, maximum: 4294967295 },
    },
    required: ['name', 'capacity', 'minAge', 'jurisdiction', 'minHouseholdSize', 'maxAnnualIncome'],
  };
  void Promise.resolve(modelContext.registerTool({
    name: 'preview_program_draft', title: 'Preview program draft',
    description: 'Stage an Aletheia eligibility policy draft in the visible page without sending, saving, or deploying it.',
    inputSchema: schema, annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      for (const [key, value] of Object.entries(input)) form.elements.namedItem(key).value = String(value);
      const value = showDraft(input); result.scrollIntoView({ block: 'nearest' });
      return { status: value.status, schema: value.schema, sent: false, deployed: false };
    },
  })).catch(() => {});
}
