# Up Benefits Builder

A six-question quiz that recommends an Up Hellas benefits package and captures a qualified lead. Take-home assessment (Web & Agentic AI Specialist). Dummy data only; the catalogue holds no prices and no tax amounts.

- Webflow page: https://up-benefits-builder.webflow.io/
- App (embedded in the Webflow page): https://up-benefits-builder.vercel.app/ and `/en/`
- Decisions, funnel, A/B test and limits: [docs/WRITEUP.md](docs/WRITEUP.md)
- Lead workflow (Make): [docs/WORKFLOW.md](docs/WORKFLOW.md)

## How it fits together

```
Webflow page (iframe)
  -> Next.js app   GET /  and  /en/     serves widget/index.html with runtime config
  -> POST /api/lead                      validates the payload, forwards it
  -> Make scenario                       checks, rules, Gemini, Google Sheet, email
  <- receipt                             ok, persisted, product ids, summary
```

The page shows "saved" only when the workflow confirms the row was written.

## Repository layout

| Path | Purpose |
|---|---|
| `app/route.ts`, `app/en/route.ts` | Greek and English entry points. |
| `lib/renderPage.ts` | Reads the page and fills in the runtime config, canonical URL and robots tag. |
| `app/api/lead/route.ts` | Validates a lead (allowed answers, dummy-only emails, size limit) and forwards it to the automation webhook. |
| `widget/index.html` | The quiz: one web component with the rules, copy, accessibility and analytics. |
| `scripts/check.mjs` | Offline checks: required content and the recommendation rules (`npm run check`). |
| `docs/` | Write-up and workflow description. |

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `LEAD_WEBHOOK_URL` | for live mode | HTTPS address of the automation webhook. Keep it secret. Without it the app runs in demo mode and `/api/lead` answers 503. |
| `LEAD_WEBHOOK_SECRET` | no | Sent as `Authorization: Bearer` to the webhook when set. |
| `NEXT_PUBLIC_GTM_ID` | no | Google Tag Manager container id. The container loads only after the visitor allows statistics. |
| `NEXT_PUBLIC_ALLOW_INDEXING` | no | `1` serves `index,follow`; anything else serves `noindex,follow`. |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin. Defaults to the request origin. |

Copy `.env.example` to `.env.local` for local work.

## Run and deploy

```
npm install
npm run dev
```

Deploy on Vercel: import the repository, framework Next.js, root directory `/`. Set the variables above for Production and redeploy.

## Webhook contract

`POST /api/lead` forwards this JSON to the webhook:

```
submission_id, language, answers{company_size, industry, work_model, goal, current_benefits[], budget},
lead{name, email, company, phone}, email_domain, free_email, consent, dummy_data, received_at
```

and expects, within 18 seconds:

```
{ "ok": true, "persisted": true, "submission_id": "<same id>",
  "recommendations": { "primary": [{ "id": "flexone" }], "language": "el" },
  "summary": "...", "summary_mode": "llm_validated" | "rules_fallback" }
```

Product ids: `flexone`, `upgift`, `fitpass`, `upexpense`, `cheque`. Anything else is answered with 502 and the visitor can retry.

## Data rules

- Only dummy emails are accepted: `example.com/.org/.net`, `.example`, `.test`, `.invalid`, and two fixed demo addresses on free domains for testing the low-priority path.
- No personal data is sent to the language model or to analytics.
