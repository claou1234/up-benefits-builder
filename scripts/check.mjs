import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../legacy/index.html',import.meta.url),'utf8');
for(const key of ['company_size','industry','work_model','goal','current_benefits','budget'])assert(html.includes(key),`Missing ${key}`);
for(const product of ['FlexOne','Up Gift','Fitpass','Up Expense','Chèque Déjeuner'])assert(html.includes(product),`Missing ${product}`);
assert(html.includes('safeEvent('));assert(html.includes('recommend('));
console.log('Static V9 source checks passed. Live workflow/GA4/mobile tests are still required.');
