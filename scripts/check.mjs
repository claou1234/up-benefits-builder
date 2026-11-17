// Offline checks for widget/index.html: required content, and the recommendation rules.
// Run with `npm run check`. The live workflow, GA4 and mobile behaviour are tested by hand.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../widget/index.html', import.meta.url), 'utf8');

// 1. The page still carries every quiz field, product and tracking hook.
for (const field of ['company_size', 'industry', 'work_model', 'goal', 'current_benefits', 'budget']) {
  assert(html.includes(field), `Missing quiz field: ${field}`);
}
for (const product of ['FlexOne', 'Up Gift', 'Fitpass', 'Up Expense', 'Chèque Déjeuner']) {
  assert(html.includes(product), `Missing product: ${product}`);
}
for (const event of ['quiz_start', 'quiz_step_complete', 'quiz_complete', 'form_submit', 'quiz_dropoff']) {
  assert(html.includes(event), `Missing analytics event: ${event}`);
}

// 2. The rules. The domain logic has no dependencies, so it can run outside the browser.
const start = html.indexOf('const VERSION = Object.freeze');
const end = html.indexOf('function narrativeLibrary');
assert(start > 0 && end > start, 'Could not locate the recommendation logic');
const recommend = new Function(`${html.slice(start, end)}; return recommend;`)();

const base = {
  company_size: '50-249',
  industry: 'technology',
  work_model: 'hybrid',
  goal: 'retention',
  current_benefits: ['none'],
  budget: '100to199',
};
const plan = (answers) => recommend({ ...base, ...answers }).primary.map((item) => item.id);

assert.deepEqual(plan({}), ['flexone', 'upgift'], 'retention with a set budget adds recognition');
assert.deepEqual(plan({ budget: 'unsure' }), ['flexone'], 'no second product without a set budget');
assert.deepEqual(plan({ goal: 'wellbeing' }), ['fitpass']);
assert.deepEqual(plan({ goal: 'expenses' }), ['upexpense']);
assert.deepEqual(
  plan({ goal: 'daily', company_size: '1-9', work_model: 'office', budget: 'under50' }),
  ['cheque'],
  'small office team on a low budget gets vouchers',
);
assert.deepEqual(
  plan({ goal: 'daily', company_size: '1-9', work_model: 'office', budget: 'under50', current_benefits: ['meal'] }),
  ['flexone'],
  'no second meal benefit when meals are already covered',
);

// Every product is either recommended or explained, never dropped silently.
for (const language of ['el', 'en']) {
  const result = recommend(base, language);
  assert.equal(result.primary.length + result.alternatives.length, 5);
  for (const item of [...result.primary, ...result.alternatives]) {
    assert(item.reason.length > 20, `Missing ${language} reason for ${item.id}`);
  }
}

// 3. No prices or tax amounts anywhere in the copy the visitor reads.
assert(!/\d+\s?%/.test(html.slice(start, end)), 'The catalogue must not contain percentages');

console.log('Checks passed.');
