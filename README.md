# Up Benefits Builder V9 — GitHub upload edition

This is the existing V9 experience in a Next.js app.

## GitHub browser upload
Unzip, open this folder, and drag all contents (not the ZIP) to **Add file > Upload files**.
If the browser refuses folder drag/drop, use GitHub Desktop or git CLI. GitHub does not unpack ZIPs.

## Vercel
Import the repository. Root Directory: `/`. Framework: Next.js. Deploy with no secrets first (demo mode).
The app runs at `/` and `/en/`. `POST /api/lead` is available but only uses the n8n webhook if configured.

For live mode configure server-side `N8N_LEAD_WEBHOOK_URL`. Keep it secret.
Optional: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_ALLOW_INDEXING`.
Do not use real customer information for this assessment.
