# Lead workflow (Make)

Scenario: **Up Benefits Builder - Lead intake** — active, runs immediately when data arrives. No credentials are stored in the scenario itself: the Gemini key and the Google account live in Make connections.

Screenshots of the scenario structure and of a successful test run are supplied with the submission.

## Flow

| # | Module | What it does |
|---|---|---|
| 1 | Webhooks — Custom webhook `upBenefitsLead` | Receives the validated lead from the app's `/api/lead` route. |
| 2 | Set variables — Lead checks | Email format check; free-domain flag (gmail, yahoo, outlook and similar); segment by team size; rule-based base score. |
| 3 | Set variables — Recommendation rules | Main product and optional second product from goal, team size, work model, current benefits and budget band. |
| 4 | HTTP — Gemini scoring and summary | One call to `gemini-3.5-flash-lite`. Sends quiz answers and recommended product ids only (no name, email or phone). Asks for `SCORE|SUMMARY`. 12 second limit. |
| 4a | Error handler — Resume | On error or timeout, continues with an empty result so the fallback path runs. |
| 5 | Set variables — AI guardrails | Splits score and summary; maps product ids to names. |
| 6 | Set variables — Lead outputs | Accepts the summary only if it passes the checks; final score with overrides; priority; fallback sentence. |
| 7 | Set variables — Response values | Final summary text (sanitised), summary mode, JSON fragment for the second product. |
| 8 | Google Sheets — Add a row | Writes all 26 columns to the sheet "Leads". |
| 9 | Webhooks — Webhook response | Returns `ok`, `persisted`, `submission_id`, recommended product ids, summary and summary mode. |
| 10 | Email — Send an email to a team member | Only when priority is HIGH: lead details and summary to the test inbox. |

## Rules

**Priority**

| Condition | Priority |
|---|---|
| Free email domain | LOW (score capped at 29) |
| Score 70 or more | HIGH |
| Otherwise | NURTURE |

An undefined budget caps the score at 59, so it can never be HIGH.

**Segment:** 1–49 SMB, 50–249 MID_MARKET, 250+ ENTERPRISE.

**Summary is accepted only if** the Gemini call returned 200, the text is 41–419 characters, contains no digits, `%`, `$` or `|`, and names the main recommended product. Otherwise the fixed sentence is used and the row is marked `rules_fallback`.

## Sheet columns

`submission_id, received_at, language, name, email, company, phone, company_size, industry, work_model, goal, current_benefits, budget_per_employee_month, recommended_products, email_valid, email_domain, free_email, segment, score, priority, score_source, score_reasons, summary_mode, summary, consent, dummy_data`

The sheet is formatted as plain text so values such as `1-9` are not converted to dates.

## Tested (17 Nov 2026, dummy data)

- More than 20 dummy leads written; segments SMB, MID_MARKET and ENTERPRISE; priorities HIGH, NURTURE and LOW all observed.
- Free-email lead: LOW, score 29.
- Fallback path: observed both when a summary failed the checks and when Gemini passed the time limit.
- Full path through the Webflow page: quiz, form, result shown, row written.
- One submission before the time limit was added took 22 seconds; the row was saved but the page reported that saving was not confirmed. The time limit (now 12 seconds) and the error handler were added for this.
- Each lead uses 9 or 10 Make operations; the free plan allows 1,000 a month.

## Environment variables (Vercel)

| Name | Purpose |
|---|---|
| `LEAD_WEBHOOK_URL` | Address of the Make webhook (secret). |
| `NEXT_PUBLIC_GTM_ID` | GTM container id. |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `1` makes the page `index,follow`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. |
