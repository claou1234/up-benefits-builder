# Up Benefits Builder: write-up

Take-home assessment, Web & Agentic AI Specialist (Marketing).

**Live page:** https://up-benefits-builder.webflow.io/ (the app itself: https://up-benefits-builder.vercel.app/, English at `/en/`)
**Supplied with this page:** code (zip), GTM container export, workflow description and screenshots (`WORKFLOW.md`), tracking and SEO notes (`TRACKING_SEO.md`), Loom.

## Key decisions

1. **Next.js embedded in Webflow.** The quiz needs state, validation and a server step, so it is a small Next.js app on Vercel, embedded full-width in a Webflow page. Webflow's free plan locks the Code Embed element, so the embed is a Custom Element set to `iframe`.
2. **A team card instead of a form.** Each answer lands on a card that stays beside the questions; the form "issues" it and it turns over to show the plan. The visitor watches something of theirs take shape, which is the reason to reach the last step. Six steps, one tap each, with progress, back, and editing straight from the card.
3. **Rules decide, the LLM only words it.** A small rule set in code maps answers to products, with a reason for each and a line on what would have brought in the ones left out. The catalogue is a config written from the public product pages. It holds no prices and no tax figures.
4. **Guardrails.** Gemini receives the answers and the product ids the rules chose, never the contact details. Its text is rejected if it contains digits, currency or percent signs, has the wrong length, or does not name the first product. A rejected or slow answer is replaced by a fixed sentence and labelled as such.
5. **Workflow in Make.** It checks the email, caps free-mail domains at low priority, scores the lead with AI (with a rule-based score as fallback), writes every answer to a Google Sheet and emails high-priority leads to a test inbox. The page says "saved" only when the workflow confirms the row.
6. **Tracking with consent.** Events fire only after the visitor allows statistics and carry no personal data.

## Assumptions

- "Dummy data only" is kept for everything I entered. The form accepts a real email and phone so reviewers can run the whole flow themselves; those details go only to my test sheet and inbox, and nothing reaches Up Hellas.
- Budget per employee orders the suggestions. It is never treated as a price or as proof of affordability.

## First A/B test

**Hypothesis:** naming the first recommended product before the form (one product, one line of reasoning, the rest gated) raises form submissions per completed quiz, because visitors see the result is worth their details.
**Metric:** `generate_lead` / `quiz_complete`. **Guardrail:** the share of high-priority leads must not fall.

## With more time

1. Keep the rules in one place. Today they exist in the app and again in the Make scenario.
2. Send the visitor their plan by email, and connect a CRM in place of the Sheet.
3. A paid LLM tier. On the free tier answers took 2 to 22 seconds in testing, and anything over 12 seconds falls back to the fixed sentence.
4. Test with a screen reader and on more phones; so far checked by keyboard, automated audit and browser emulation.

## AI tools used

- **Claude (Anthropic):** design iterations, code, accessibility review, set-up of Webflow, Make, Vercel, GTM and GA4 through the browser, and drafts of these documents. I directed and reviewed each step.
- **Make "Maia":** building the scenario modules from written specifications.
- **Google Gemini (free tier):** the summary and lead score at runtime.

API costs were zero. Limits met: Make's free plan gives 1,000 credits a month (about 10 per lead).
