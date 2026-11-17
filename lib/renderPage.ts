import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type Language = 'el' | 'en';

const RESPONSE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// The page ships in Greek and translates itself in the browser. Crawlers and link previews
// do not run that script, so the English URL gets its head tags here.
// Keep these in sync with COPY.en in widget/index.html.
const ENGLISH = {
  title: 'Up Benefits Builder | Benefits built around your team',
  description:
    'Six short questions. One explained starting point for your employee benefits. Find the Up Hellas solutions worth exploring, without invented pricing.',
  faqs: [
    [
      'Is this a quote or a cost estimate?',
      'It is a first plan, built from your answers. Prices and terms come in the conversation that follows, one solution at a time.',
    ],
    [
      'What if we already offer benefits?',
      'We count them from the start. If you already offer meals, for example, we will not suggest a second meal benefit. We look at whether it is worth combining with something else or leaving as it is.',
    ],
    [
      'How is AI used?',
      'Fixed rules decide which solutions are suggested, the same for everyone. AI only writes the short summary you read at the end, and it is checked before it appears. If anything goes wrong, you see a prepared text instead.',
    ],
    [
      'Can I enter real contact details?',
      'Yes, if you want to see the whole flow with your own email. Details are stored in the assessment test sheet only and never reach Up Hellas.',
    ],
  ],
};

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function englishHead(html: string) {
  const title = escapeAttribute(ENGLISH.title);
  const description = escapeAttribute(ENGLISH.description);
  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'en',
    mainEntity: ENGLISH.faqs.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  }).replace(/</g, '\\u003c');

  return html
    .replace('<html lang="el">', '<html lang="en">')
    .replace(/<title>[^<]*<\/title>/, `<title>${ENGLISH.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
    .replace('<meta property="og:locale" content="el_GR">', '<meta property="og:locale" content="en_GB">')
    .replace(
      /<script id="faq-schema" type="application\/ld\+json">[\s\S]*?<\/script>/,
      () => `<script id="faq-schema" type="application/ld+json">${faqSchema}</script>`,
    );
}

/**
 * Serves widget/index.html for one language.
 * The file ships with demo defaults and localhost URLs; this fills in the
 * runtime config, the public origin, the robots tag and the canonical URL.
 */
export async function renderPage(request: Request, language: Language): Promise<Response> {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const robots = process.env.NEXT_PUBLIC_ALLOW_INDEXING === '1' ? 'index,follow' : 'noindex,follow';

  // Without a webhook the quiz runs in demo mode and never claims a lead was saved.
  const config = JSON.stringify({
    mode: process.env.LEAD_WEBHOOK_URL ? 'live' : 'demo',
    apiBase: '',
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',
  });

  const html = await readFile(path.join(process.cwd(), 'widget', 'index.html'), 'utf8');

  let output = html
    .replace('window.UPB_CONFIG={"mode":"demo","apiBase":"","gtmId":""', `window.UPB_CONFIG=${config.slice(0, -1)}`)
    .replaceAll('http://localhost:4173/en/', origin + '/en/')
    .replaceAll('http://localhost:4173/', origin + '/')
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);

  if (language === 'en') {
    output = englishHead(output)
      .replace(`<link rel="canonical" href="${origin}/">`, `<link rel="canonical" href="${origin}/en/">`)
      .replace(`<meta property="og:url" content="${origin}/">`, `<meta property="og:url" content="${origin}/en/">`);
  }

  return new Response(output, { status: 200, headers: RESPONSE_HEADERS });
}
