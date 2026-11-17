import { renderPage } from '../lib/renderPage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return renderPage(request, 'el');
}
