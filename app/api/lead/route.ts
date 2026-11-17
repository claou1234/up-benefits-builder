import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 16000;
const WEBHOOK_TIMEOUT_MS = 18000;

// Must stay in sync with FIELDS in widget/index.html.
const ALLOWED_ANSWERS = {
  company_size: ['1-9', '10-49', '50-249', '250-999', '1000+'],
  industry: ['technology', 'services', 'retail', 'manufacturing', 'hospitality', 'other'],
  work_model: ['office', 'hybrid', 'remote'],
  goal: ['retention', 'wellbeing', 'tax', 'expenses', 'daily'],
  current_benefits: ['meal', 'flex', 'wellbeing', 'rewards', 'expenses', 'none'],
  budget: ['under50', '50to99', '100to199', '200plus', 'unsure'],
} as const;

const ANSWER_KEYS = Object.keys(ALLOWED_ANSWERS) as (keyof typeof ALLOWED_ANSWERS)[];
const PRODUCT_IDS = new Set(['flexone', 'upgift', 'fitpass', 'upexpense', 'cheque']);

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.gr', 'hotmail.com', 'hotmail.gr', 'outlook.com',
  'outlook.gr', 'live.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com',
]);

// The assessment runs on dummy data only. These two addresses exist to exercise the free-email rule.
const DUMMY_FREE_EMAILS = ['upb.assessment.demo@gmail.com', 'upb.assessment.demo@yahoo.com'];

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isCleanText = (value: unknown, min: number, max: number) =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.trim().length <= max &&
  !/[<>\u0000-\u001f\u007f]/.test(value);

function checkAnswers(answers: Json) {
  if (Object.keys(answers).length !== ANSWER_KEYS.length) throw Error('invalid_payload');

  for (const key of ANSWER_KEYS) {
    const value = answers[key];

    if (key === 'current_benefits') {
      const options = ALLOWED_ANSWERS.current_benefits as readonly unknown[];
      const valid =
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= options.length &&
        new Set(value).size === value.length &&
        value.every((item) => options.includes(item)) &&
        !(value.includes('none') && value.length > 1);
      if (!valid) throw Error('invalid_benefits');
    } else if (typeof value !== 'string' || !(ALLOWED_ANSWERS[key] as readonly string[]).includes(value)) {
      throw Error('invalid_answer');
    }
  }
}

function checkEmail(raw: unknown) {
  const email = String(raw || '').toLowerCase().trim();
  if (email.length > 254 || !EMAIL.test(email)) throw Error('invalid_email');

  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    throw Error('invalid_email');
  }

  const isReservedDomain = /(^|\.)example\.(com|org|net)$/.test(domain) || /\.(example|test|invalid)$/.test(domain);
  if (!isReservedDomain && !DUMMY_FREE_EMAILS.includes(email)) throw Error('dummy_email_only');

  return { email, domain };
}

// Optional. Only obviously fictional numbers pass (Greek +30 0... or a leading-zero run).
function checkPhone(raw: unknown) {
  const phone = String(raw || '').trim();
  if (!phone) return phone;

  const digits = phone.replace(/\D/g, '').length;
  const isFictional = /^\+?30[ ()-]*0[0 ()-]*$/.test(phone) || /^0[0 ()-]{7,}$/.test(phone);
  if (!/^\+?[\d ()-]+$/.test(phone) || digits < 8 || digits > 15 || !isFictional) throw Error('dummy_phone_only');

  return phone;
}

/** Validates the browser payload and returns the object forwarded to the workflow. */
function validateLead(input: unknown) {
  if (
    !isObject(input) ||
    input.honeypot ||
    input.dummy_data !== true ||
    input.consent !== true ||
    !['el', 'en'].includes(String(input.language))
  ) {
    throw Error('invalid_form');
  }
  if (typeof input.submission_id !== 'string' || !UUID_V4.test(input.submission_id)) throw Error('invalid_submission');
  if (!isObject(input.answers) || !isObject(input.lead)) throw Error('invalid_payload');

  checkAnswers(input.answers);
  if (!isCleanText(input.lead.name, 2, 80) || !isCleanText(input.lead.company, 2, 120)) throw Error('invalid_lead');
  const { email, domain } = checkEmail(input.lead.email);
  const phone = checkPhone(input.lead.phone);

  return {
    submission_id: input.submission_id,
    language: input.language,
    answers: input.answers,
    lead: {
      name: String(input.lead.name).trim(),
      company: String(input.lead.company).trim(),
      email,
      phone,
    },
    email_domain: domain,
    free_email: FREE_EMAIL_DOMAINS.has(domain),
    consent: true,
    dummy_data: true,
    received_at: new Date().toISOString(),
  };
}

async function postToWorkflow(webhookUrl: string, secret: string | undefined, lead: ReturnType<typeof validateLead>) {
  const url = new URL(webhookUrl);
  if (url.protocol !== 'https:') throw Error('webhook_requires_https');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(lead),
      signal: controller.signal,
      cache: 'no-store',
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  } finally {
    clearTimeout(timeout);
  }
}

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) return fail('workflow_not_configured', 503);

  let lead: ReturnType<typeof validateLead>;
  try {
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return fail('payload_too_large', 413);
    lead = validateLead(await request.json());
  } catch {
    return fail('invalid_or_non_dummy_data', 400);
  }

  try {
    const { ok, data } = await postToWorkflow(webhookUrl, process.env.LEAD_WEBHOOK_SECRET, lead);

    // The page says "saved" only when the workflow confirms it wrote this exact submission.
    const confirmed =
      ok &&
      isObject(data) &&
      data.ok === true &&
      data.persisted === true &&
      data.submission_id === lead.submission_id &&
      typeof data.summary === 'string' &&
      isObject(data.recommendations) &&
      Array.isArray(data.recommendations.primary) &&
      data.recommendations.primary.length > 0 &&
      data.recommendations.primary.every((item: unknown) => isObject(item) && PRODUCT_IDS.has(String(item.id)));
    if (!confirmed) throw Error('bad_upstream_receipt');

    return NextResponse.json({
      ok: true,
      persisted: true,
      submission_id: lead.submission_id,
      recommendations: data.recommendations,
      summary: data.summary,
      summary_mode: data.summary_mode === 'llm_validated' ? 'llm_validated' : 'rules_fallback',
    });
  } catch {
    return fail('save_not_confirmed', 502);
  }
}
