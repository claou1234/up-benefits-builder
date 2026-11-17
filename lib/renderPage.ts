import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type Language = 'el' | 'en';

const RESPONSE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Serves widget/index.html for one language.
 * The file ships with demo defaults and localhost URLs; this fills in the
 * runtime config, the public origin, the robots tag and the canonical URL.
 */
export async function renderPage(request: Request, language: Language): Promise<Response> {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
  const canonical = origin + (language === 'en' ? '/en/' : '/');
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

  // The page translates its own interface; the server only sets lang and canonical.
  if (language === 'en') {
    output = output
      .replace('<html lang="el">', '<html lang="en">')
      .replace(`<link rel="canonical" href="${origin}/">`, `<link rel="canonical" href="${canonical}">`);
  }

  return new Response(output, { status: 200, headers: RESPONSE_HEADERS });
}
