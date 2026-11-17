import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestedUrl = new URL(request.url);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || requestedUrl.origin).replace(/\/$/, '');
  const language = 'el' as 'el' | 'en';
  const canonical = origin + (language === 'en' ? '/en/' : '/');
  const html = await readFile(path.join(process.cwd(), 'legacy', 'index.html'), 'utf8');
  const live = !!(process.env.LEAD_WEBHOOK_URL || process.env.N8N_LEAD_WEBHOOK_URL);
  const configJson = JSON.stringify({mode: live ? 'live' : 'demo',apiBase:'',gtmId:process.env.NEXT_PUBLIC_GTM_ID || ''});
  let output = html
    .replace('window.UPB_CONFIG={"mode":"demo","apiBase":"","gtmId":""', `window.UPB_CONFIG=${configJson.slice(0,-1)}`)
    .replaceAll('http://localhost:4173/en/', origin + '/en/')
    .replaceAll('http://localhost:4173/', origin + '/');
  output = output.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${process.env.NEXT_PUBLIC_ALLOW_INDEXING === '1' ? 'index,follow' : 'noindex,follow'}">`);
  if (language === 'en') output = output.replace('<html lang="el">','<html lang="en">');
  // HTML's embedded language script takes care of translating all user-facing UI.
  output = output.replace('<link rel="canonical" href="'+origin+'/">', '<link rel="canonical" href="'+canonical+'">');
  return new Response(output, { status:200, headers: {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin'} });
}
