# Up Benefits Builder — one-page write-up

Take-home assessment, Web & Agentic AI Specialist. Dummy data only; no official prices or tax figures anywhere.

## Links

| What | Where |
|---|---|
| Live page (Webflow) | https://up-benefits-builder.webflow.io/ |
| Quiz app (Next.js on Vercel, embedded in the Webflow page) | https://up-benefits-builder.vercel.app/ (English: `/en/`) |
| Code repository | github.com/claou1234/up-benefits-builder (private; access on request) |
| GTM container export | `GTM-WMNCKQQK`, version 3 (JSON supplied with the submission) |
| Workflow | Make scenario "Up Benefits Builder - Lead intake" (see [WORKFLOW.md](WORKFLOW.md)) |
| Lead store | Google Sheet "Up Benefits Builder - Leads (dummy data)" |
| Analytics | GTM `GTM-WMNCKQQK`, GA4 `G-Y5K4T4VJCP` |

## Decisions

1. **Next.js app embedded in Webflow.** The brief allows React/Next.js embedded in a Webflow page. The quiz is one self-contained web component served by Next.js; the Webflow page hosts it full-viewport. The free Webflow plan locks the Code Embed element, so the embed is a Custom Element set to `iframe`.
2. **Rules decide, the LLM only words it.** Product recommendations come from a small versioned rule set in code (goal, team size, work model, current benefits, budget band). Budget is used only to sequence a second product, never as a price or affordability check. The catalogue holds no prices and no tax amounts.
3. **Guardrails around the summary.** Gemini receives only the quiz answers and the product ids chosen by the rules, never the lead's name, email or phone. Its output is rejected if it contains digits, currency or percent signs, is too short or too long, or does not name the first recommended product. A rejected or slow answer (12 second limit) is replaced by a fixed sentence, and the result is labelled `rules_fallback` instead of `llm_validated`.
4. **Results gated behind the form, saved before shown.** The page shows "saved" only after the workflow confirms the row was written. If confirmation does not arrive, the visitor keeps their answers and can retry.
5. **Workflow in Make, not on the server.** n8n Cloud is trial-only; Make has a free plan. The server only validates the payload (dummy-only emails, allowed answer values) and forwards it.
6. **Lead scoring.** Segment is rule-based (SMB / Mid-market / Enterprise by team size). The score comes from Gemini when valid, otherwise from a rule-based base score. Two deterministic overrides always win: a free email domain is LOW priority; an undefined budget cannot be HIGH. HIGH (score 70+) triggers the sales email.
7. **Analytics with consent.** Events are pushed only after the visitor allows statistics (Consent Mode v2, ad signals always denied). Event payloads are allow-listed and carry no personal data. Adding `?debug_mode=true` to the URL marks that visit's events for GA4 DebugView; normal visits are unaffected.

## Funnel

| Step | GA4 event | Key parameters |
|---|---|---|
| Quiz start | `quiz_start` | `quiz_session_id`, `language` |
| Each step completed (6) | `quiz_step_complete` | `step_id`, `step_index`, `completed_steps` |
| Quiz completed | `quiz_complete` | `goal`, `company_size_band`, `budget_band` |
| Form submitted | `form_submit` | `lead_persisted`, `product_ids` |
| Lead saved (key event) | `generate_lead` | `lead_persisted`, `product_ids` |
| Drop-off | `quiz_dropoff` | `step_id`, `exit_reason` |

Step conversion is read from `quiz_step_complete` by `step_id`; drop-off step from `quiz_dropoff` by `step_id`. On 17 Nov 2026 `quiz_step_complete`, `quiz_complete`, `form_submit` and `generate_lead` were seen in GA4 DebugView and `quiz_dropoff` in Realtime (screenshots supplied); `quiz_start` was seen leaving the browser but not checked in the GA4 interface.

## SEO and AI search

The app page is indexable (`index,follow`) with title, meta description, Open Graph, canonical, and two JSON-LD blocks (`WebPage` and `FAQPage`). The Webflow staging page carries title, description and Open Graph in its page settings; the free plan does not allow custom head code or sitemap indexing there, so the structured data lives on the app page.

For AI search: the page answers the questions a buyer would ask in plain sentences and repeats them as `FAQPage` markup, so an assistant can quote a complete answer with its source. Product names are written exactly as on uphellas.gr and each claim is limited to what the quiz actually does, which keeps generated answers from inventing prices or tax treatment.

PageSpeed Insights, mobile (17 Nov 2026): Performance 82, Accessibility 100, Best Practices 100, SEO 100.

## A/B test

**Hypothesis.** Showing the first recommended product before the contact form (one product name and one line of reasoning, the rest gated) will raise form submissions per completed quiz, because visitors see evidence the result is worth their details.

- **Control:** results fully gated behind the form (current).
- **Variant:** partial reveal above the form.
- **Primary metric:** `generate_lead` / `quiz_complete`.
- **Guardrail metrics:** share of HIGH-priority leads, share of free-email leads.
- **Decision rule:** ship the variant if the primary metric improves and the HIGH share does not fall.

## Known limits and next steps

1. The recommendation rules exist twice: in the app (what the visitor sees) and in the Make scenario (what the Sheet records). Next step is one source, either by sending the app's result to the workflow or by moving the rules to the server.
2. Gemini's free tier is sometimes slow: in testing, answers took between 2 and 22 seconds. Calls over the 12 second limit fall back to the fixed sentence, so the visitor always gets a result within the server's 18 second window. A paid tier would raise the share of AI-written summaries.
3. The AI summary is deliberately plain (it restates the team and names the products). Its wording should be reviewed with real HR readers before any production use.
4. Replace the Google Sheet with the CRM once one is chosen; the Sheet columns already match one property per quiz answer.
5. Not yet verified: a pass with a real screen reader.

## AI tools used

- Claude (Anthropic): design iterations, accessibility pass, code review and fix, browser set-up of Webflow, Make, Vercel, GTM and GA4, and these documents.
- Make "Maia" assistant: scaffolding the scenario modules from written specifications.
- Google Gemini (`gemini-3.5-flash-lite`, free tier): the runtime summary and lead score inside the workflow.
